import postgres from 'postgres';

const DATABASE_ENV_VALUES = [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
  ['DATABASE_URL_UNPOOLED', process.env.DATABASE_URL_UNPOOLED],
] as const;

const DATABASE_ENV_KEYS = DATABASE_ENV_VALUES.map(([key]) => key);
const databaseEnv = DATABASE_ENV_VALUES.find(([, value]) => Boolean(value));

export const databaseEnvKey = databaseEnv?.[0];
const DATABASE_URL = databaseEnv?.[1];

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
