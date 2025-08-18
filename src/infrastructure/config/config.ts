import { env } from './env';

export const config = {
  port: env.PORT,
  mongoUri: env.RMU_MONGO_TACTICAL_URI,
  apiCoreUrl: env.RMU_API_CORE_URI,
  logLevel: env.LOG_LEVEL,
  corsOrigin: env.CORS_ORIGIN,
  logger: {
    level: env.LOG_LEVEL,
    mode: env.LOG_MODE,
  },
  iam: {
    clientId: env.RMU_IAM_CLIENT_ID,
    clientSecret: env.RMU_IAM_CLIENT_SECRET,
    baseUri: env.RMU_IAM_BASE_URI,
    realm: env.RMU_IAM_REALM,
    tokenUri: env.RMU_IAM_TOKEN_URI,
    jwkUri: env.RMU_IAM_JWK_URI,
    scope: env.OAUTH2_SCOPE,
  },
  kafka: {
    brokers: env.RMU_KAFKA_BROKERS.split(','),
    partitionCount: env.RMU_KAFKA_PARTITION_COUNT,
    replicationFactor: env.RMU_KAFKA_REPLICATION_FACTOR,
    retentionMs: env.RMU_KAFKA_RETENTION_MS,
    compressionType: env.RMU_KAFKA_COMPRESSION_TYPE,

    clientId: env.RMU_KAFKA_CLIENT_ID,
    consumerGroupId: env.RMU_KAFKA_CONSUMER_GROUP_ID,
  },
};
