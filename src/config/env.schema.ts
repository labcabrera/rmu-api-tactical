import Joi from 'joi';

export const envSchema = Joi.object({
  // The port of rmu-api-tactical, as in the image and the compose [F-tactical-05].
  PORT: Joi.number().positive().default(3003),
  LOG_LEVEL: Joi.string().default('info'),
  RMU_MONGO_TACTICAL_URI: Joi.string().required(),
  RMU_IAM_URI: Joi.string().uri().default('http://localhost/sso'),
  RMU_IAM_REALM: Joi.string().default('rmu'),
  RMU_IAM_JWK_URI: Joi.string().uri().required(),
  RMU_IAM_ISSUER_URI: Joi.string().uri().required(),
  RMU_IAM_AUDIENCE: Joi.string().required(),
  // Client credentials of the service token for the calls to the other APIs outside an HTTP request (TokenService).
  RMU_IAM_TOKEN_URI: Joi.string().uri().required(),
  RMU_IAM_CLIENT_ID: Joi.string().required(),
  RMU_IAM_CLIENT_SECRET: Joi.string().required(),
  // HTTP hardening, as in rmu-api-core. No origins: CORS stays off, as the browser comes through the gateway.
  RMU_CORS_ORIGINS: Joi.string().allow('').default(''),
  RMU_THROTTLE_LIMIT: Joi.number().integer().min(0).default(300),
  RMU_THROTTLE_TTL_MS: Joi.number().integer().min(1).default(60_000),
  RMU_TRUST_PROXY: Joi.string().default('loopback, linklocal, uniquelocal'),
  RMU_KAFKA_BROKERS: Joi.string().required(),
  RMU_KAFKA_CLIENT_ID: Joi.string().required(),
  RMU_KAFKA_CONSUMER_GROUP_ID: Joi.string().default('rmu-api-tactical-group'),
  RMU_KAFKA_DEFAULT_PARTITIONS: Joi.number().integer().min(1).default(1),
  // Timeout of the calls to the other APIs and to Keycloak (HttpClient, TokenService): 504 upstream-timeout (spec 021).
  RMU_HTTP_TIMEOUT_MS: Joi.number().integer().min(1).default(10_000),
  RMU_API_CORE_URI: Joi.string().uri().required(),
  RMU_API_ITEMS_URI: Joi.string().uri().required(),
  RMU_API_ATTACK_TABLES_URI: Joi.string().uri().required(),
  RMU_API_STRATEGIC_URI: Joi.string().uri().required(),
  RMU_API_NPCS_URI: Joi.string().uri().required(),
});
