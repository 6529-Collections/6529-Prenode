import { NULL_ADDRESS } from '../constants';
import { NFTOwner } from '../entities/INFTOwner';
import { Transaction } from '../entities/ITransaction';
import { areEqualAddresses } from '../helpers';

export interface NFTOwnerDelta {
  address: string;
  contract: string;
  tokenId: number;
  delta: number;
}

async function extractNFTOwnerDeltas(
  transactions: Transaction[]
): Promise<NFTOwnerDelta[]> {
  const ownersMap: Record<string, NFTOwnerDelta> = {};

  for (const transaction of transactions) {
    const fromKey = `${transaction.contract}:${transaction.token_id}:${transaction.from_address}`;
    const toKey = `${transaction.contract}:${transaction.token_id}:${transaction.to_address}`;

    if (!areEqualAddresses(transaction.from_address, NULL_ADDRESS)) {
      if (!ownersMap[fromKey]) {
        ownersMap[fromKey] = {
          address: transaction.from_address.toLowerCase(),
          contract: transaction.contract.toLowerCase(),
          tokenId: transaction.token_id,
          delta: -transaction.token_count
        };
      } else {
        ownersMap[fromKey].delta -= transaction.token_count;
      }
    }

    if (!ownersMap[toKey]) {
      ownersMap[toKey] = {
        address: transaction.to_address.toLowerCase(),
        contract: transaction.contract.toLowerCase(),
        tokenId: transaction.token_id,
        delta: transaction.token_count
      };
    } else {
      ownersMap[toKey].delta += transaction.token_count;
    }
  }

  return Object.values(ownersMap).filter((o) => o.delta !== 0);
}

export async function extractNFTOwners(
  transactions: Transaction[]
): Promise<NFTOwner[]> {
  const deltas = await extractNFTOwnerDeltas(transactions);
  return deltas
    .map((d) => {
      return {
        contract: d.contract,
        address: d.address,
        token_id: d.tokenId,
        balance: d.delta
      };
    })
    .filter((o) => o.balance > 0);
}
