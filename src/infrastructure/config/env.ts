import { z } from 'zod';

// Required environment variables schema
const envSchema = z.object({
  PORT: z.coerce.number().default(3003),
  RMU_MONGO_TACTICAL_URI: z.string().min(1, 'Required RMU_MONGO_TACTICAL_URI'),
  RMU_API_CORE_URI: z.string().min(1, 'RMU_API_CORE_URI is required').default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),
  LOG_MODE: z.enum(['development', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  RMU_IAM_CLIENT_ID: z.string().min(1, 'RMU_IAM_CLIENT_ID is required'),
  RMU_IAM_CLIENT_SECRET: z.string().min(1, 'RMU_IAM_CLIENT_SECRET is required'),
  RMU_IAM_BASE_URI: z.string().min(1, 'RMU_IAM_BASE_URI is required'),
  RMU_IAM_TOKEN_URI: z.string().min(1, 'RMU_IAM_TOKEN_URI is required'),
  RMU_IAM_JWK_URI: z.string().min(1, 'RMU_IAM_JWK_URI is required'),
  RMU_IAM_REALM: z.string().min(1, 'RMU_IAM_REALM is required'),
  RMU_KAFKA_BROKERS: z.string().min(1, 'RMU_KAFKA_BROKERS is required'),
  RMU_KAFKA_PARTITION_COUNT: z.coerce.number().default(2),
  RMU_KAFKA_REPLICATION_FACTOR: z.coerce.number().default(1),
  RMU_KAFKA_RETENTION_MS: z.coerce.number().default(604800000), // 7 days
  RMU_KAFKA_COMPRESSION_TYPE: z.enum(['gzip', 'snappy', 'lz4', 'zstd']).default('snappy'),
  RMU_KAFKA_CLIENT_ID: z.string().default('rmu-api-tactical'),
  RMU_KAFKA_CONSUMER_GROUP_ID: z.string().default('rmu-api-tactical-group'),
  OAUTH2_SCOPE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid process.env configuration:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
