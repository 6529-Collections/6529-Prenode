import { Request } from 'express';
import { returnJsonResult } from './api-helpers';
import { asyncRouter } from './async.router';
import * as db from './oracle.db';

const router = asyncRouter();

export default router;

router.get(
  '/tdh/total',
  async function (req: Request<{}, any, any, {}>, res: any) {
    const result = await db.fetchTotalTDH();
    return returnJsonResult(result, res);
  }
);

router.get(
  '/tdh/above/:value/:extra?',
  async function (
    req: Request<
      {
        value: number;
        extra?: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const value = req.params.value;
    const includeEntries = req.params.extra === 'entries';
    if (isNaN(value)) {
      return res.status(400).send({ error: 'Invalid value' });
    }
    const result = await db.fetchTDHAbove(Number(value), includeEntries);
    return returnJsonResult(result, res);
  }
);

router.get(
  '/tdh/percentile/:value',
  async function (
    req: Request<
      {
        value: number;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const percentile = req.params.value;
    if (
      !percentile ||
      isNaN(percentile) ||
      !Number.isInteger(Number(percentile)) ||
      percentile <= 0 ||
      percentile > 10000
    ) {
      return res
        .status(400)
        .send(
          'Invalid percentile value. Please provide an integer between 0 and 10000.'
        );
    }

    const resolvedPercentile = Number(percentile) / 100;
    const result = await db.fetchTDHPercentile(resolvedPercentile);
    return returnJsonResult(result, res);
  }
);

router.get(
  '/tdh/cutoff/:value',
  async function (
    req: Request<
      {
        value: number;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const cutoff = req.params.value;
    if (!Number.isInteger(Number(cutoff)) || cutoff < 1) {
      return res
        .status(400)
        .send('Invalid cutoff value. Please provide a non-negative integer.');
    }

    const result = await db.fetchTDHCutoff(Number(cutoff));
    return returnJsonResult(result, res);
  }
);

router.get(
  '/address/:address',
  async function (
    req: Request<
      {
        address: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const address = req.params.address;
    const result = await db.fetchSingleAddressTDH(address);
    return returnJsonResult(result, res);
  }
);

router.get(
  '/address/:address/breakdown',
  async function (
    req: Request<
      {
        address: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const address = req.params.address;
    const result = await db.fetchSingleAddressTDHBreakdown(address);
    return returnJsonResult(result, res);
  }
);

router.get(
  '/address/:address/memes_seasons/:season?',
  async function (
    req: Request<
      {
        address: string;
        season?: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const address = req.params.address;
    const season = req.params.season;
    const result = await db.fetchSingleAddressTDHMemesSeasons(address);
    if (season) {
      try {
        const seasonNumber = parseInt(season);
        if (isNaN(seasonNumber)) {
          throw new Error('Invalid season number');
        }
        const seasonResult = result.seasons.filter(
          (r: any) => r.season === seasonNumber
        );
        if (seasonResult.length === 0) {
          throw new Error('Season not found');
        }
        return returnJsonResult(
          {
            ...seasonResult[0],
            block: result.block
          },
          res
        );
      } catch (e: any) {
        return res.status(400).send({ error: e.message });
      }
    }
    return returnJsonResult(result, res);
  }
);

router.get(
  '/address/:address/:contract/:id',
  async function (
    req: Request<
      {
        address: string;
        contract: string;
        id: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const address = req.params.address;
    const contract = req.params.contract;
    const id = req.params.id;
    const tokenId = parseInt(id);
    if (isNaN(tokenId)) {
      return res.status(400).send({ error: 'Invalid token id' });
    }
    const result = await db.fetchSingleAddressTDHForNft(
      address,
      contract,
      tokenId
    );
    return returnJsonResult(result, res);
  }
);

router.get(
  '/nfts/memes_seasons/:season?',
  async function (
    req: Request<
      {
        season?: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const season = req.params.season;
    const result = await db.fetchSeasonsTDH(season);
    if (season) {
      const seasonNumber = parseInt(season);
      if (isNaN(seasonNumber)) {
        return res.status(400).send({ error: 'Invalid season number' });
      }
      if (result.seasons.length === 0) {
        return res.status(404).send({ error: 'Season not found' });
      }
      return returnJsonResult(
        {
          ...result.seasons[0],
          block: result.block
        },
        res
      );
    }
    return returnJsonResult(result, res);
  }
);

router.get(
  '/nfts/:contract?/:id?',
  async function (
    req: Request<
      {
        contract?: string;
        id?: string;
      },
      any,
      any,
      {}
    >,
    res: any
  ) {
    const contract = req.params.contract;
    const id = req.params.id;
    const result = await db.fetchNfts(contract, id);
    if (contract && id) {
      if (result.nfts.length === 0) {
        return res.status(404).send({ error: 'NFT not found' });
      } else {
        return returnJsonResult(
          {
            ...result.nfts[0],
            block: result.block
          },
          res
        );
      }
    }
    return returnJsonResult(result, res);
  }
);
