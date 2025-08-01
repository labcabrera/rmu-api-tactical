import { EnvironmentConfiguration } from "../../../../infrastructure/adapters/config/environment-configuration";

describe("EnvironmentConfiguration", () => {
  let configuration: EnvironmentConfiguration;

  beforeEach(() => {
    configuration = new EnvironmentConfiguration();
  });

  afterEach(() => {
    // Restore original environment variables
    delete process.env.PORT;
    delete process.env.RMU_MONGO_TACTICAL_URI;
    delete process.env.RMU_API_CORE_URL;
    delete process.env.LOG_LEVEL;
    delete process.env.NODE_ENV;
    delete process.env.CORS_ORIGIN;
  });

  describe("getPort", () => {
    it("should return default port when PORT env var is not set", () => {
      const port = configuration.getPort();
      expect(port).toBe(3003);
    });

    it("should return custom port when PORT env var is set", () => {
      process.env.PORT = "4000";
      const port = configuration.getPort();
      expect(port).toBe(4000);
    });
  });

  describe("getMongoUri", () => {
    it("should return default MongoDB URI when RMU_MONGO_TACTICAL_URI is not set", () => {
      const uri = configuration.getMongoUri();
      expect(uri).toBe("mongodb://localhost:27017/rmu-tactical");
    });

    it("should return custom MongoDB URI when RMU_MONGO_TACTICAL_URI is set", () => {
      process.env.RMU_MONGO_TACTICAL_URI = "mongodb://custom:27017/custom-db";
      const uri = configuration.getMongoUri();
      expect(uri).toBe("mongodb://custom:27017/custom-db");
    });
  });

  describe("getApiCoreUrl", () => {
    it("should return default API core URL when RMU_API_CORE_URL is not set", () => {
      const url = configuration.getApiCoreUrl();
      expect(url).toBe("http://localhost:3001/v1");
    });

    it("should return custom API core URL when RMU_API_CORE_URL is set", () => {
      process.env.RMU_API_CORE_URL = "https://api.example.com/v1";
      const url = configuration.getApiCoreUrl();
      expect(url).toBe("https://api.example.com/v1");
    });
  });

  describe("getLogLevel", () => {
    it("should return default log level when LOG_LEVEL is not set", () => {
      const level = configuration.getLogLevel();
      expect(level).toBe("info");
    });

    it("should return custom log level when LOG_LEVEL is set", () => {
      process.env.LOG_LEVEL = "debug";
      const level = configuration.getLogLevel();
      expect(level).toBe("debug");
    });
  });

  describe("getEnvironment", () => {
    it("should return default environment when NODE_ENV is not set", () => {
      const env = configuration.getEnvironment();
      expect(env).toBe("development");
    });

    it("should return custom environment when NODE_ENV is set", () => {
      process.env.NODE_ENV = "production";
      const env = configuration.getEnvironment();
      expect(env).toBe("production");
    });
  });

  describe("getCorsCorsOrigin", () => {
    it("should return default CORS origin when CORS_ORIGIN is not set", () => {
      const origin = configuration.getCorsCorsOrigin();
      expect(origin).toBe("*");
    });

    it("should return custom CORS origin when CORS_ORIGIN is set", () => {
      process.env.CORS_ORIGIN = "https://example.com";
      const origin = configuration.getCorsCorsOrigin();
      expect(origin).toBe("https://example.com");
    });
  });

  describe("getNodeEnv", () => {
    it("should return default Node environment when NODE_ENV is not set", () => {
      const env = configuration.getNodeEnv();
      expect(env).toBe("development");
    });

    it("should return custom Node environment when NODE_ENV is set", () => {
      process.env.NODE_ENV = "test";
      const env = configuration.getNodeEnv();
      expect(env).toBe("test");
    });
  });
});
