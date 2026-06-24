import postgres from 'postgres';

const DATABASE_ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
] as const;

export const databaseEnvKey = DATABASE_ENV_KEYS.find(key => Boolean(process.env[key]));
const DATABASE_URL = databaseEnvKey ? process.env[databaseEnvKey] : undefined;

let sql: any;

if (DATABASE_URL) {
  sql = postgres(DATABASE_URL, { ssl: 'require' });
} else {
  sql = (() => {
    const mock = () => {
      throw new Error(`Database URL is not set. Expected one of: ${DATABASE_ENV_KEYS.join(', ')}`);
    };
    return mock;
  })() as any;
}

export default sql;
