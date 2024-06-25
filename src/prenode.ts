import { Logger } from './logging';
import { Time } from './time';
import * as delegations from './delegationsLoop';
import * as transactions from './transactionsLoop';
import * as tdh from './tdhLoop';
import cron from 'node-cron';

import {
  GRADIENT_CONTRACT,
  MEMES_CONTRACT,
  NEXTGEN_CONTRACT
} from './constants';
import { loadEnv } from './secrets';
import { spawn } from 'child_process';
import { fetchPingInfo } from './db';

const logger = Logger.get('PRE_NODE');

const RESTORE_DATE = 1;

let RUNNING_UPDATE = false;
let RUNNING_TDH = false;
let RUNNING_DELEGATIONS = false;
let RUNNING_TRX = false;

// delegations every 3 minutes
cron.schedule(
  '*/3 * * * *',
  async () => {
    if (RUNNING_TDH || RUNNING_UPDATE || RUNNING_DELEGATIONS) {
      logger.info(
        `[SKIPPING DELEGATIONS RUN] : [RUNNING_TDH: ${RUNNING_TDH}] : [RUNNING_UPDATE: ${RUNNING_UPDATE}] : [RUNNING_DELEGATIONS: ${RUNNING_DELEGATIONS}]`
      );
      return;
    }
    await runDelegations();
  },
  {
    timezone: 'Etc/UTC'
  }
);

// transactions every 5 minutes
cron.schedule(
  '*/5 * * * *',
  async () => {
    if (RUNNING_TDH || RUNNING_UPDATE || RUNNING_TRX) {
      logger.info(
        `[SKIPPING TRANSACTIONS RUN] : [RUNNING_TDH: ${RUNNING_TDH}] : [RUNNING_UPDATE: ${RUNNING_UPDATE}] : [RUNNING_TRX: ${RUNNING_TRX}]`
      );
      return;
    }
    await runTransactions();
  },
  {
    timezone: 'Etc/UTC'
  }
);

// TDH calculations (update and restart) at 00:01
cron.schedule(
  '1 0 * * *',
  () => {
    if (RUNNING_UPDATE) {
      return;
    }
    runUpdate();
  },
  {
    timezone: 'Etc/UTC',
    recoverMissedExecutions: true
  }
);

// RESTORE at 02:01 UTC on the RESTORE_DATE of every month
cron.schedule(
  '1 2 * * *',
  async () => {
    if (RUNNING_UPDATE) {
      return;
    }
    if (new Date().getDate() === RESTORE_DATE) {
      runUpdate(true);
    }
  },
  {
    timezone: 'Etc/UTC',
    recoverMissedExecutions: true
  }
);

// ping seize every hour at 31 minutes
cron.schedule(
  '31 * * * *',
  async () => {
    await pingSeize();
  },
  {
    timezone: 'Etc/UTC'
  }
);

async function start() {
  const start = Time.now();
  logger.info(`[EXECUTING START SCRIPT...]`);

  await loadEnv();

  await runTDH();

  await pingSeize();

  const diff = start.diffFromNow().formatAsDuration();
  logger.info(`[START SCRIPT COMPLETE IN ${diff}]`);
}

async function runDelegations(startBlock?: number) {
  RUNNING_DELEGATIONS = true;
  try {
    await delegations.handler(startBlock);
  } catch (e) {
    logger.error(`Error during delegations run: ${e}`);
  } finally {
    RUNNING_DELEGATIONS = false;
  }
}

async function runTransactions() {
  RUNNING_TRX = true;
  try {
    await transactions.handler(MEMES_CONTRACT.toLowerCase());
    await transactions.handler(GRADIENT_CONTRACT.toLowerCase());
    await transactions.handler(NEXTGEN_CONTRACT.toLowerCase());
  } catch (e) {
    logger.error(`Error during transactions run: ${e}`);
  } finally {
    RUNNING_TRX = false;
  }
}

async function runTDH() {
  RUNNING_TDH = true;
  try {
    await tdh.handler();
  } catch (e) {
    logger.error(`Error during TDH run: ${e}`);
    process.exit(1);
  } finally {
    RUNNING_TDH = false;
  }
}

function runUpdate(restore?: boolean) {
  const args = ['scripts/update.sh'];
  if (!restore) {
    args.push('--no-restore');
  }

  logger.info(
    `[UPDATE] Running update script (${restore ? 'with' : 'without'} restore)`
  );

  RUNNING_UPDATE = true;
  const updateScript = spawn('bash', args);

  updateScript.stdout.on('data', (data) => {
    logger.info(`[UPDATE] \n ${data}`);
  });

  updateScript.stderr.on('data', (data) => {
    logger.error(`[UPDATE] \n ${data}`);
  });

  updateScript.on('error', (error) => {
    logger.error(`[UPDATE] \n ${error.message}`);
    RUNNING_UPDATE = false;
  });
}

async function pingSeize() {
  try {
    const info = await fetchPingInfo();
    const response = await fetch(
      'http://localhost:3000/oracle/register-prenode',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(info)
      }
    );
    const body = await response.json();
    logger.info(
      `[PING SEIZE] : [STATUS ${response.status}] : [BODY ${JSON.stringify(
        body
      )}]`
    );
  } catch (e: any) {
    logger.error(`[PING SEIZE] : [ERROR ${e.message}]`);
  }
}

start();
