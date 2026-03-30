import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DEFAULT_TENANT_SLUG: z.string().default('default'),
  BASE_DOMAIN: z.string().default('localhost'),
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
  BILLING_SECRET: z.string().optional(),
  SUPER_ADMIN_JWT_SECRET: z.string().min(32, 'SUPER_ADMIN_JWT_SECRET must be at least 32 characters'),
  SUPER_ADMIN_JWT_REFRESH_SECRET: z.string().min(32, 'SUPER_ADMIN_JWT_REFRESH_SECRET must be at least 32 characters'),
  HELCIM_TEST_MODE: z.enum(['true', 'false']).default('false'),
  BCRYPT_ROUNDS: z.string().default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  LOG_LEVEL: z.string().default('info'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  SUPER_ADMIN_EMAIL: z.string().email('SUPER_ADMIN_EMAIL must be a valid email'),
  APP_URL: z.string().url().default('https://app.cliqpaymat.app'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRICE_ID: z.string().min(1, 'STRIPE_PRICE_ID is required'),
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
    testMode: env.HELCIM_TEST_MODE === 'true',
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
  multiTenant: {
    defaultSlug: env.DEFAULT_TENANT_SLUG,
    baseDomain: env.BASE_DOMAIN,
  },
  billing: {
    secret: env.BILLING_SECRET,
  },
  superAdmin: {
    jwtSecret: env.SUPER_ADMIN_JWT_SECRET,
    jwtRefreshSecret: env.SUPER_ADMIN_JWT_REFRESH_SECRET,
  },
  email: {
    resendApiKey: env.RESEND_API_KEY,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
    appUrl: env.APP_URL,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    priceId: env.STRIPE_PRICE_ID,
  },
};
