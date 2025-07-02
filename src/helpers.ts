import axios, { AxiosResponse } from 'axios';
import {
  CONSOLIDATIONS_LIMIT,
  NULL_ADDRESS,
  NULL_ADDRESS_DEAD
} from './constants';
import * as short from 'short-uuid';
import { goerli, sepolia } from '@wagmi/chains';
import { Network } from 'alchemy-sdk';
import { Transaction } from './entities/ITransaction';
import moment from 'moment-timezone';
import { Consolidation } from './entities/IDelegation';

export function areEqualAddresses(w1: string, w2: string) {
  if (!w1 || !w2) {
    return false;
  }
  return w1.toUpperCase() === w2.toUpperCase();
}

export function isNullAddress(address: string) {
  return (
    areEqualAddresses(address, NULL_ADDRESS) ||
    areEqualAddresses(address, NULL_ADDRESS_DEAD)
  );
}

export function getDaysDiff(t1: Date, t2: Date, floor = true) {
  const diff = t1.getTime() - t2.getTime();
  if (floor) {
    return Math.floor(diff / (1000 * 3600 * 24));
  }
  return Math.ceil(diff / (1000 * 3600 * 24));
}

export function getLastTDH() {
  const now = new Date();

  let tdh = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  if (tdh > now) {
    tdh = new Date(tdh.getTime() - 24 * 60 * 60 * 1000);
  }

  const tdhStr = moment(tdh).tz('UTC').format('YYYY-MM-DD HH:mm:ss');
  return parseUTCDateString(tdhStr);
}

export const parseUTCDateString = (dateString: any): Date => {
  const parsedDate = moment.tz(dateString, 'YYYY-MM-DD HH:mm:ss', 'UTC');
  return parsedDate.toDate();
};

export function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function areEqualObjects(obj1: any, obj2: any) {
  if (obj1 == null || obj2 == null) {
    return false;
  }
  for (const property in obj1) {
    const value1 = obj1[property];
    const value2 = obj2[property];
    if (typeof value1 === 'object' && value1 !== null) {
      if (!areEqualObjects(value1, value2)) {
        return false;
      }
    } else if (value1 != value2) {
      return false;
    }
  }
  return true;
}

export function formatAddress(address: string) {
  if (!address || !address.startsWith('0x') || address.endsWith('.eth')) {
    return address;
  }
  return `${address.substring(0, 5)}...${address.substring(
    address.length - 3
  )}`;
}

export function extractConsolidationWallets(
  consolidations: any[],
  wallet: string
): string[] {
  const clusters = extractConsolidations(consolidations);
  const walletCluster = clusters.find((c) =>
    c.some((w) => areEqualAddresses(w, wallet))
  );
  if (walletCluster) {
    return walletCluster;
  }
  return [wallet];
}

function extractConsolidations(consolidations: Consolidation[]): string[][] {
  // Sort by block descending
  consolidations.sort((a, b) => b.block - a.block);

  const usedWallets = new Set<string>();
  const clusters: string[][] = [];

  // Create a quick lookup of all direct consolidations
  const consolidationSet = new Set<string>();
  for (const c of consolidations) {
    consolidationSet.add(buildConsolidationKey([c.wallet1, c.wallet2]));
  }

  // Convert consolidations into a queue
  const queue = [...consolidations];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { wallet1, wallet2 } = current;

    if (usedWallets.has(wallet1) || usedWallets.has(wallet2)) {
      continue;
    }

    const cluster = new Set<string>();
    cluster.add(wallet1);
    cluster.add(wallet2);

    let changed = true;

    // Keep trying to expand this cluster
    while (changed && cluster.size < CONSOLIDATIONS_LIMIT) {
      changed = false;

      for (let i = 0; i < queue.length; i++) {
        const candidate = queue[i];
        const { wallet1: w1, wallet2: w2 } = candidate;

        let newWallet: string | null = null;

        if (cluster.has(w1) && !cluster.has(w2) && !usedWallets.has(w2)) {
          newWallet = w2;
        } else if (
          cluster.has(w2) &&
          !cluster.has(w1) &&
          !usedWallets.has(w1)
        ) {
          newWallet = w1;
        }

        if (newWallet) {
          const safeWallet = newWallet.toLowerCase();
          const allConnectionsExist = Array.from(cluster).every((existing) =>
            consolidationSet.has(buildConsolidationKey([existing, safeWallet]))
          );

          if (allConnectionsExist) {
            cluster.add(safeWallet);
            queue.splice(i, 1);
            changed = true;
            break;
          }
        }
      }
    }

    // finalize cluster
    const clusterArray = Array.from(cluster);
    for (const w of clusterArray) {
      usedWallets.add(w);
    }
    clusters.push(clusterArray);
  }

  // Any wallets left out entirely? Add them as singletons.
  const allWallets = new Set<string>();
  for (const c of consolidations) {
    allWallets.add(c.wallet1);
    allWallets.add(c.wallet2);
  }

  for (const w of Array.from(allWallets)) {
    if (!usedWallets.has(w)) {
      clusters.push([w]);
      usedWallets.add(w);
    }
  }

  return clusters;
}

export function isNumber(s: string) {
  return !isNaN(Number(s));
}

export async function getContentType(url: string): Promise<string | null> {
  try {
    const response: AxiosResponse = await axios.head(
      parseIpfsUrlToCloudflare(url)
    );
    const cType = response.headers['content-type'];
    if (cType) {
      return cType.split('/')[1].toLowerCase();
    }
    return null;
  } catch (error) {
    try {
      const response: AxiosResponse = await axios.head(parseIpfsUrl(url));
      const cType = response.headers['content-type'];
      if (cType) {
        return cType.split('/')[1].toLowerCase();
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export function parseIpfsUrl(url: string) {
  if (!url) {
    return url;
  }
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.split('://')[1]}`;
  }
  return url;
}

export function parseIpfsUrlToCloudflare(url: string | undefined) {
  if (!url) {
    return '';
  }
  if (url.startsWith('ipfs')) {
    return `https://cf-ipfs.com/ipfs/${url.split('://')[1]}`;
  }
  return url;
}

export function padTo2Digits(num: number) {
  return num.toString().padStart(2, '0');
}

export function formatDateAsString(date: Date) {
  return [
    date.getFullYear(),
    padTo2Digits(date.getMonth() + 1),
    padTo2Digits(date.getDate())
  ].join('');
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

export function stringToHex(s: string) {
  let hexString = '';
  for (let i = 0; i < s.length; i++) {
    const hex = s.charCodeAt(i).toString(16);
    hexString += hex;
  }
  return hexString;
}

export function distinct<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function uniqueShortId(): string {
  return short.generate();
}

// The assertUnreachable function takes an input _x of type never and always throws
// an error. This function is typically used in TypeScript to assert exhaustiveness in
// switch-case or if-else constructs, ensuring that all possible cases are handled.
export const assertUnreachable = (_x: never): never => {
  // Throw an error with a message indicating that this function should not be reached.
  // This error should only be thrown if there's a bug in the code or a new case has been
  // introduced without updating the relevant switch-case or if-else constructs.
  throw new Error("Didn't expect to get here");
};

export async function fetchImage(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return await response.arrayBuffer();
}

export async function compareImages(
  url1: string,
  url2: string
): Promise<boolean> {
  try {
    const [image1, image2] = await Promise.all([
      fetchImage(url1),
      fetchImage(url2)
    ]);
    const data1 = new Uint8Array(image1);
    const data2 = new Uint8Array(image2);
    const areImagesEqual = JSON.stringify(data1) === JSON.stringify(data2);
    return areImagesEqual;
  } catch (error) {
    console.error('Error fetching or comparing images:', error);
    return false;
  }
}

export function buildConsolidationKey(wallets: string[]) {
  const sortedWallets = wallets
    .map((it) => it.toLowerCase())
    .slice()
    .sort((a, b) => a.localeCompare(b));
  return sortedWallets.join('-');
}

export function gweiToEth(gwei: number): number {
  return gwei / 1e9;
}

export function weiToEth(wei: number): number {
  return wei / 1e18;
}

export function getRpcUrlFromNetwork(network: Network) {
  return `https://${network.toLowerCase()}.g.alchemy.com/v2/${
    process.env.ALCHEMY_API_KEY
  }`;
}

export function getRpcUrl(chainId: number) {
  let network: Network;

  if (chainId === goerli.id) {
    network = Network.ETH_GOERLI;
  } else if (chainId === sepolia.id) {
    network = Network.ETH_SEPOLIA;
  } else {
    network = Network.ETH_MAINNET;
  }

  return getRpcUrlFromNetwork(network);
}

export function capitalizeEveryWord(input: string): string {
  return input
    .toLocaleLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function replaceEmojisWithHex(inputString: string) {
  return inputString.replace(
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu,
    (match: string) => {
      const codePoint = match.codePointAt(0);
      if (codePoint) {
        const emojiHex = codePoint.toString(16).toUpperCase();
        return `U+${emojiHex}`;
      }
      return match;
    }
  );
}

export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batchedArray: T[][] = [];

  for (let index = 0; index < array.length; index += batchSize) {
    const batch = array.slice(index, index + batchSize);
    batchedArray.push(batch);
  }

  return batchedArray;
}

export function parseNumberOrNull(input: any): number | null {
  if (input === null || input === undefined) {
    return null;
  }
  const parsed = parseInt(input);
  if (isNaN(parsed)) {
    return null;
  }
  return parsed;
}

export function parseIntOrNull(input: any): number | null {
  const num = parseNumberOrNull(input);
  const int = parseInt(input);
  if (num === int) {
    return int;
  }
  return null;
}

export function resolveEnum<T extends {}>(
  enumObj: T,
  value?: string
): T[keyof T] | undefined {
  const normalizedValue = value?.toLowerCase();

  for (const enumKey of Object.keys(enumObj)) {
    // Use type assertion to assure TypeScript that toString can be called
    const enumValue = enumObj[enumKey as keyof T] as any;

    if (enumValue.toString().toLowerCase() === normalizedValue) {
      return enumObj[enumKey as keyof T];
    }
  }

  return undefined;
}

export function resolveEnumOrThrow<T extends object>(
  enumObj: T,
  value?: string
): T[keyof T] {
  const resolvedValue = resolveEnum(enumObj, value);
  if (resolvedValue) {
    return resolvedValue;
  }
  throw new Error(`Invalid enum value: ${value}`);
}

export function isAirdrop(t: Transaction): boolean {
  return areEqualAddresses(t.from_address, NULL_ADDRESS) && t.value === 0;
}

export function getTransactionLink(chain_id: number, hash: string) {
  switch (chain_id) {
    case sepolia.id:
      return `https://sepolia.etherscan.io/tx/${hash}`;
    case goerli.id:
      return `https://goerli.etherscan.io/tx/${hash}`;
    default:
      return `https://etherscan.io/tx/${hash}`;
  }
}

export async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
