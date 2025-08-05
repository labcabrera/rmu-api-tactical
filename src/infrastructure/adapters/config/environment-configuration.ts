import { Configuration } from "../../../domain/ports/configuration";

export class EnvironmentConfiguration implements Configuration {
  getPort(): number {
    return parseInt(process.env.PORT || "3003", 10);
  }

  getMongoUri(): string {
    return (
      process.env.RMU_MONGO_TACTICAL_URI ||
      "mongodb://localhost:27017/rmu-tactical"
    );
  }

  getApiCoreUrl(): string {
    return process.env.RMU_API_CORE_URL || "http://localhost:3001/v1";
  }

  getLogLevel(): string {
    return process.env.LOG_LEVEL || "info";
  }

  getEnvironment(): string {
    return process.env.NODE_ENV || "development";
  }

  getCorsCorsOrigin(): string {
    return process.env.CORS_ORIGIN || "*";
  }

  getNodeEnv(): string {
    return process.env.NODE_ENV || "development";
  }

  getOAuth2ClientId(): string {
    return process.env.RMU_KEYCLOAK_CLIENT_ID || "";
  }

  getOAuth2ClientSecret(): string {
    return process.env.RMU_KEYCLOAK_CLIENT_SECRET || "";
  }

  getOAuth2TokenUrl(): string {
    return `${process.env.RMU_KEYCLOAK_BASE_URL}/realms/${process.env.RMU_KEYCLOAK_REALM}/protocol/openid-connect/token` || "";
  }

  getOAuth2Scope(): string | undefined {
    return process.env.OAUTH2_SCOPE;
  }
}
