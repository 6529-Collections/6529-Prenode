import {
  CONSOLIDATED_WALLETS_TDH_TABLE,
  NFTS_TABLE,
  MEMES_CONTRACT,
  GRADIENT_CONTRACT,
  NEXTGEN_CONTRACT,
  TDH_BLOCKS_TABLE
} from '../../constants';
import { NFT } from '../../entities/INFT';
import { sqlExecutor } from '../../sql-executor';

const formatNumber = (num: number) => {
  return parseFloat(num.toFixed(0));
};

const parseToken = (
  boost: number,
  token: {
    id: number;
    tdh: number;
  }
) => {
  return {
    id: token.id,
    tdh: formatNumber(token.tdh * boost)
  };
};

export const getBlock = async () => {
  const blockResult = await sqlExecutor.execute(
    `SELECT MAX(block) as block from ${CONSOLIDATED_WALLETS_TDH_TABLE}`
  );
  return blockResult[0].block ?? 0;
};

const getMerkleRoot = async (block: number) => {
  const merkleRootResult = await sqlExecutor.execute(
    `SELECT merkle_root from ${TDH_BLOCKS_TABLE} WHERE block = ${block}`
  );
  return merkleRootResult[0].merkle_root ?? null;
};

const fetchBlockAndAddressTdh = async (address: string) => {
  const block = await getBlock();
  const sql = `
    SELECT * from ${CONSOLIDATED_WALLETS_TDH_TABLE} where LOWER(consolidation_key) like '%${address.toLowerCase()}%'
  `;
  const tdh = await sqlExecutor.execute(sql);

  return {
    block,
    tdh
  };
};

const fetchMemes = async (): Promise<NFT[]> => {
  const sql = `
    SELECT * FROM ${NFTS_TABLE} WHERE LOWER(contract) = '${MEMES_CONTRACT.toLowerCase()}'
  `;
  return await sqlExecutor.execute(sql);
};

export const fetchSingleAddressTDH = async (address: string) => {
  const { block, tdh } = await fetchBlockAndAddressTdh(address);
  const boost = tdh[0]?.boost ?? 1;
  const merkleRoot = await getMerkleRoot(block);
  const seasonTdh = await fetchSingleAddressTDHMemesSeasons(address);
  const addressTdh: any = {
    tdh: formatNumber(tdh[0]?.boosted_tdh ?? 0),
    boost,
    memes_tdh: formatNumber(tdh[0]?.boosted_memes_tdh ?? 0),
    gradients_tdh: formatNumber(tdh[0]?.boosted_gradients_tdh ?? 0),
    nextgen_tdh: formatNumber(tdh[0]?.boosted_nextgen_tdh ?? 0)
  };

  seasonTdh.seasons.forEach((s) => {
    addressTdh[`memes_tdh_szn${s.season}`] = s.tdh;
  });
  addressTdh['addresses'] = JSON.parse(
    tdh[0]?.wallets ?? JSON.stringify([address])
  ).map((w: string) => w.toLowerCase());

  addressTdh['block'] = block;
  addressTdh['merkle_root'] = merkleRoot;

  return addressTdh;
};

export const fetchSingleAddressTDHForNft = async (
  address: string,
  contract: string,
  id: number
) => {
  const { block, tdh } = await fetchBlockAndAddressTdh(address);
  const merkleRoot = await getMerkleRoot(block);
  const addressTdh = tdh[0]?.tdh;
  let nftTdh = 0;
  if (addressTdh) {
    const boost = addressTdh.boost ?? 1;
    let nfts = [];
    if (contract === 'memes') {
      nfts = JSON.parse(tdh[0]?.memes ?? JSON.stringify([]));
    } else if (contract === 'gradients') {
      nfts = JSON.parse(tdh[0]?.gradients ?? JSON.stringify([]));
    } else if (contract === 'nextgen') {
      nfts = JSON.parse(tdh[0]?.nextgen ?? JSON.stringify([]));
    }
    const nft = nfts.find((m: any) => m.id == id);
    if (nft) {
      nftTdh = parseToken(boost, nft).tdh;
    }
  }
  return {
    tdh: formatNumber(nftTdh),
    block,
    merkle_root: merkleRoot
  };
};

export const fetchSingleAddressTDHBreakdown = async (address: string) => {
  const { block, tdh } = await fetchBlockAndAddressTdh(address);
  const merkleRoot = await getMerkleRoot(block);
  const boost = tdh[0]?.boost ?? 1;
  return {
    memes_balance: tdh[0]?.memes_balance ?? 0,
    memes: JSON.parse(tdh[0]?.memes ?? JSON.stringify([])).map((t: any) =>
      parseToken(boost, t)
    ),
    gradients_balance: tdh[0]?.gradients_balance ?? 0,
    gradients: JSON.parse(tdh[0]?.gradients ?? JSON.stringify([])).map(
      (t: any) => parseToken(boost, t)
    ),
    nextgen_balance: tdh[0]?.nextgen_balance ?? 0,
    nextgen: JSON.parse(tdh[0]?.nextgen ?? JSON.stringify([])).map((t: any) =>
      parseToken(boost, t)
    ),
    block,
    merkle_root: merkleRoot
  };
};

export const fetchTotalTDH = async () => {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);
  const sql = `
    SELECT SUM(boosted_tdh) as total_tdh, SUM(boosted_memes_tdh) as memes_tdh, SUM(boosted_gradients_tdh) as gradients_tdh, SUM(boosted_nextgen_tdh) as nextgen_tdh from ${CONSOLIDATED_WALLETS_TDH_TABLE}
  `;
  const tdh = await sqlExecutor.execute(sql);
  const seasonTdh = await fetchSeasonsTDH();

  const totals: any = {
    tdh: formatNumber(tdh[0]?.total_tdh ?? 0),
    memes_tdh: formatNumber(tdh[0]?.memes_tdh ?? 0),
    gradients_tdh: formatNumber(tdh[0]?.gradients_tdh ?? 0),
    nextgen_tdh: formatNumber(tdh[0]?.nextgen_tdh ?? 0)
  };
  seasonTdh.seasons.forEach((s) => {
    totals[`memes_tdh_szn${s.season}`] = s.tdh;
  });
  totals['block'] = block;
  totals['merkle_root'] = merkleRoot;
  return totals;
};

export const fetchNfts = async (contract?: string, id?: string) => {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);
  let sql = `SELECT * FROM ${NFTS_TABLE}`;
  if (contract) {
    let contractQuery = contract.toLowerCase();
    if (contractQuery === 'memes') {
      contractQuery = MEMES_CONTRACT;
    } else if (contractQuery === 'gradients') {
      contractQuery = GRADIENT_CONTRACT;
    } else if (contractQuery === 'nextgen') {
      contractQuery = NEXTGEN_CONTRACT;
    }
    sql = `${sql} WHERE contract = '${contractQuery.toLowerCase()}'`;

    if (id) {
      sql = `${sql} AND id = ${id}`;
    }
  }
  sql = `${sql} ORDER BY contract ASC, id ASC`;
  const nftResponse = await sqlExecutor.execute(sql);
  const nfts = nftResponse.map((n: NFT) => {
    if (!n.season) {
      delete n.season;
    }
    n.tdh = formatNumber(n.tdh);
    return n;
  });

  return {
    nfts,
    block,
    merkle_root: merkleRoot
  };
};

export const fetchSingleAddressTDHMemesSeasons = async (address: string) => {
  const { block, tdh } = await fetchBlockAndAddressTdh(address);
  const merkleRoot = await getMerkleRoot(block);
  const memeNfts = await fetchMemes();
  const boost = tdh[0]?.boost ?? 1;
  const memeSeasons = new Map<number, number[]>();
  memeNfts.forEach((m) => {
    const season = m.season;
    if (season) {
      const seasonArray = memeSeasons.get(season) || [];
      seasonArray.push(m.id);
      memeSeasons.set(season, seasonArray);
    }
  });

  const seasons: { season: number; tdh: number }[] = [];
  memeSeasons.forEach((ids, season) => {
    const seasonTdh = ids.reduce((acc, id) => {
      const addressMemes = JSON.parse(tdh[0]?.memes ?? JSON.stringify([]));
      const meme = addressMemes.find((m: any) => m.id === id);
      if (meme) {
        return acc + meme.tdh;
      }
      return acc;
    }, 0);
    seasons.push({
      season,
      tdh: formatNumber(seasonTdh * boost)
    });
  });

  return {
    seasons,
    block,
    merkle_root: merkleRoot
  };
};

export async function fetchTDHAbove(value: number, includeEntries: boolean) {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);

  const sql = `
    SELECT * from ${CONSOLIDATED_WALLETS_TDH_TABLE} 
    WHERE boosted_tdh >= ${value}
    ORDER BY boosted_tdh DESC
  `;
  const tdh = await sqlExecutor.execute(sql);
  const response: any = {
    count: tdh.length,
    block,
    merkle_root: merkleRoot
  };
  if (includeEntries) {
    response.entries = tdh.map((t: any) => {
      return {
        consolidation_key: t.consolidation_key,
        tdh: t.boosted_tdh,
        addresses: JSON.parse(t.wallets).map((w: string) => w.toLowerCase()),
        block,
        merkle_root: merkleRoot
      };
    });
  }

  return response;
}

export async function fetchTDHPercentile(percentile: number) {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);
  const percentileValue = percentile / 100;
  const query = `
    WITH ranked_data AS (
      SELECT 
        boosted_tdh,
        PERCENT_RANK() OVER (ORDER BY boosted_tdh DESC) AS percentile_rank
      FROM tdh_consolidation
    )
    SELECT
      threshold_value,
      (SELECT COUNT(*) FROM tdh_consolidation WHERE boosted_tdh >= threshold.threshold_value) AS count_in_percentile
    FROM (
      SELECT 
        boosted_tdh AS threshold_value
      FROM ranked_data
      WHERE percentile_rank <= :percentileValue
      ORDER BY percentile_rank DESC
      LIMIT 1
    ) AS threshold;
  `;

  const result = await sqlExecutor.execute(query, { percentileValue });
  const tdhPercentileValue = result[0]?.threshold_value || null;
  const countInPercentile = result[0]?.count_in_percentile || 0;

  return {
    percentile,
    tdh: tdhPercentileValue,
    count_in_percentile: countInPercentile,
    block,
    merkle_root: merkleRoot
  };
}

export async function fetchTDHCutoff(cutoff: number) {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);

  const query = `
    SELECT * from ${CONSOLIDATED_WALLETS_TDH_TABLE} 
    ORDER BY boosted_tdh DESC
    LIMIT :cutoff
  `;
  const tdh = await sqlExecutor.execute(query, { cutoff });
  const leastTdh = tdh[tdh.length - 1].boosted_tdh;
  const entries = tdh.map((t: any) => {
    return {
      consolidation_key: t.consolidation_key,
      tdh: t.boosted_tdh,
      addresses: JSON.parse(t.wallets).map((w: string) => w.toLowerCase())
    };
  });
  return {
    tdh: leastTdh,
    entries,
    block,
    merkle_root: merkleRoot
  };
}

export async function fetchSeasonsTDH(season?: string) {
  const block = await getBlock();
  const merkleRoot = await getMerkleRoot(block);

  let filters = 'WHERE season > 0';
  let params: any = {};
  if (season) {
    filters = `${filters} AND season = :season`;
    params = { season };
  }
  const query = `
    SELECT season, SUM(tdh) AS tdh
    FROM ${NFTS_TABLE}
    ${filters}
    GROUP BY season;
  `;

  const results = await sqlExecutor.execute(query, params);

  const seasons = results.map((r: any) => {
    return {
      season: r.season,
      tdh: formatNumber(r.tdh)
    };
  });
  return {
    seasons,
    block,
    merkle_root: merkleRoot
  };
}
