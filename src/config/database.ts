import dotenv from 'dotenv';
import { Dialect,Options } from 'sequelize';

dotenv.config();

// Extended interface to include url property
interface SequelizeOptions extends Options {
  url?: string;
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
  dialect: Dialect;
}

interface DatabaseConfig {
  [key: string]: SequelizeOptions;
  development: SequelizeOptions;
  test: SequelizeOptions;
  production: SequelizeOptions;
}

const commonConfig: Partial<SequelizeOptions> = {
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

const config: DatabaseConfig = {
  development: {
    ...commonConfig,
    database: process.env.DB_NAME || 'telegram_bot_manager',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: console.warn,
  },
  test: {
    ...commonConfig,
    database: process.env.TEST_DB_NAME || 'telegram_bot_manager_test',
    username: process.env.TEST_DB_USERNAME || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
  production: {
    ...commonConfig,
    database: process.env.DB_NAME || '',
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.NODE_ENV === 'production'
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
  },
};

export = config;
