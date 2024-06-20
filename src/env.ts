import { Logger } from './logging';

const dotenv = require('dotenv');
const path = require('path');

export async function prepEnvironment() {
  const logger = Logger.get('ENV_READER');
  const envPath = path.join(__dirname, '..', `.env.prenode`);
  logger.info(`[LOADING CONFIG FROM ${envPath}]`);
  dotenv.config({
    path: envPath
  });
}
