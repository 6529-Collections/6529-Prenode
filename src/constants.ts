import { Network } from 'alchemy-sdk';

export const WALLETS_TDH_TABLE = 'tdh';
export const CONSOLIDATED_WALLETS_TDH_TABLE = 'tdh_consolidation';
export const TDH_BLOCKS_TABLE = 'tdh_blocks';
export const TRANSACTIONS_TABLE = 'transactions';
export const NFTS_TABLE = 'nfts';
export const NFT_OWNERS_TABLE = 'nft_owners';

export const NFTDELEGATION_BLOCKS_TABLE = 'nftdelegation_blocks';
export const CONSOLIDATIONS_TABLE = 'consolidations';
export const DELEGATIONS_TABLE = 'delegations';

export const MEMES_CONTRACT = '0x33FD426905F149f8376e227d0C9D3340AaD17aF1';
export const GRADIENT_CONTRACT = '0x0c58ef43ff3032005e472cb5709f8908acb00205';
export const NEXTGEN_CONTRACT = '0x45882f9bc325E14FBb298a1Df930C43a874B83ae';
export const MEMELAB_CONTRACT = '0x4db52a61dc491e15a2f78f5ac001c14ffe3568cb';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_ADDRESS_DEAD = '0x000000000000000000000000000000000000dEaD';
export const MANIFOLD = '0x3A3548e060Be10c2614d0a4Cb0c03CC9093fD799';
export const PUNK_6529 = '0xfd22004806a6846ea67ad883356be810f0428793';
export const SIX529 = '0xB7d6ed1d7038BaB3634eE005FA37b925B11E9b13';
export const SIX529_ER = '0xE359aB04cEC41AC8C62bc5016C10C749c7De5480';
export const SIX529_MUSEUM = '0xc6400A5584db71e41B0E5dFbdC769b54B91256CD';
export const ENS_ADDRESS = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85';
export const ROYALTIES_ADDRESS = '0x1b1289e34fe05019511d7b436a5138f361904df0';
export const MEMELAB_ROYALTIES_ADDRESS =
  '0x900b67e6f16291431e469e6ec8208d17de09fc37';
export const OPENSEA_ADDRESS = '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC';
export const MEMES_DEPLOYER = '0x4B76837F8D8Ad0A28590d06E53dCD44b6B7D4554';

export const ACK_DEPLOYER = '0x03ee832367e29a5cd001f65093283eabb5382b62';
export const LOOKS_TOKEN_ADDRESS = '0xf4d2888d29d722226fafa5d9b24f9164c092421e';
export const WETH_TOKEN_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const ALCHEMY_SETTINGS = {
  network: Network.ETH_MAINNET,
  maxRetries: 10
};

export const DELEGATION_CONTRACT: {
  chain_id: number;
  contract: `0x${string}`;
  deploy_block: number;
} = {
  chain_id: 1,
  contract: '0x2202CB9c00487e7e8EF21e6d8E914B32e709f43d',
  deploy_block: 17114433
};

export const DELEGATION_ALL_ADDRESS =
  '0x8888888888888888888888888888888888888888';

export const USE_CASE_ALL = 1;
export const USE_CASE_MINTING = 2;
export const USE_CASE_AIRDROPS = 3;
export const USE_CASE_PRIMARY_ADDRESS = 997;
export const USE_CASE_SUB_DELEGATION = 998;
export const USE_CASE_CONSOLIDATION = 999;
export const CONSOLIDATIONS_LIMIT = 3;
export const NEVER_DATE = 64060588800;

export const MEME_8_EDITION_BURN_ADJUSTMENT = -2588;
export const MEME_8_BURN_TRANSACTION =
  '0xa6c27335d3c4f87064a938e987e36525885cc3d136ebb726f4c5d374c0d2d854';

export const NEXTGEN_ROYALTIES_ADDRESS =
  '0xC8ed02aFEBD9aCB14c33B5330c803feacAF01377';
