import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  HELCIM_API_TOKEN: z.string().min(1, 'HELCIM_API_TOKEN is required'),
  HELCIM_WEBHOOK_SECRET: z.string().min(1, 'HELCIM_WEBHOOK_SECRET is required'),
  HELCIM_API_BASE_URL: z.string().url().default('https://api.helcim.com/v2'),
  FRONTEND_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  BCRYPT_ROUNDS: z.string().default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  LOG_LEVEL: z.string().default('info'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

export const config = {
  app: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT, 10),
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
  },
  helcim: {
    apiToken: env.HELCIM_API_TOKEN,
    webhookSecret: env.HELCIM_WEBHOOK_SECRET,
    baseUrl: env.HELCIM_API_BASE_URL,
  },
  frontend: {
    url: env.FRONTEND_URL,
    allowedOrigins: env.ALLOWED_ORIGINS.split(','),
  },
  security: {
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS, 10),
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  logging: {
    level: env.LOG_LEVEL,
  },
};
