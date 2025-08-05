import { env } from './env';

export const config = {
  port: env.PORT,
  mongoUri: env.RMU_MONGO_TACTICAL_URI,
  apiCoreUrl: env.RMU_API_CORE_URL,
  logLevel: env.LOG_LEVEL,
  corsOrigin: env.CORS_ORIGIN,
  logger: {
    level: env.LOG_LEVEL,
    mode: env.LOG_MODE,
  },
  keycloak: {
    clientId: env.RMU_KEYCLOAK_CLIENT_ID,
    clientSecret: env.RMU_KEYCLOAK_CLIENT_SECRET,
    baseUrl: env.RMU_KEYCLOAK_BASE_URL,
    realm: env.RMU_KEYCLOAK_REALM,
    tokenUrl: `${env.RMU_KEYCLOAK_BASE_URL}/realms/${env.RMU_KEYCLOAK_REALM}/protocol/openid-connect/token`,
    scope: env.OAUTH2_SCOPE,
  },
  kafka: {
    brokers: env.RMU_KAFKA_BROKERS.split(','),
    partitionCount: env.RMU_KAFKA_PARTITION_COUNT,
    replicationFactor: env.RMU_KAFKA_REPLICATION_FACTOR,
    retentionMs: env.RMU_KAFKA_RETENTION_MS,
    compressionType: env.RMU_KAFKA_COMPRESSION_TYPE,
  }
};
