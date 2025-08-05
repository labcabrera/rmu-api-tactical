import { Configuration } from "../../../../domain/ports/configuration";
import { Logger } from "../../../../domain/ports/logger";
import { OAuth2TokenService } from "../../../../infrastructure/adapters/auth/oauth2-token-service";

// Mock global fetch
global.fetch = jest.fn();

describe("OAuth2TokenService", () => {
  let tokenService: OAuth2TokenService;
  let mockConfiguration: jest.Mocked<Configuration>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockConfiguration = {
      getOAuth2ClientId: jest.fn().mockReturnValue("test-client-id"),
      getOAuth2ClientSecret: jest.fn().mockReturnValue("test-client-secret"),
      getOAuth2TokenUrl: jest.fn().mockReturnValue("https://auth.example.com/token"),
      getOAuth2Scope: jest.fn().mockReturnValue("api:read"),
      getPort: jest.fn(),
      getMongoUri: jest.fn(),
      getApiCoreUrl: jest.fn(),
      getLogLevel: jest.fn(),
      getEnvironment: jest.fn(),
      getCorsCorsOrigin: jest.fn(),
      getNodeEnv: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    tokenService = new OAuth2TokenService(mockConfiguration, mockLogger);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getAccessToken", () => {
    it("should request new token when no cached token exists", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const token = await tokenService.getAccessToken();

      expect(token).toBe("test-access-token");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://auth.example.com/token",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
          },
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Successfully obtained access token")
      );
    });

    it("should return cached token when valid", async () => {
      // First request to cache a token
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "cached-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const firstToken = await tokenService.getAccessToken();
      jest.clearAllMocks();

      // Second request should use cache
      const secondToken = await tokenService.getAccessToken();

      expect(secondToken).toBe("cached-token");
      expect(firstToken).toBe(secondToken);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith("Using cached access token");
    });

    it("should request new token when cached token is expired", async () => {
      // Mock a token that expires immediately
      const expiredTokenResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "expired-token",
          token_type: "Bearer",
          expires_in: 0, // Expires immediately
        }),
      };

      const newTokenResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "new-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(expiredTokenResponse)
        .mockResolvedValueOnce(newTokenResponse);

      // First call caches expired token
      await tokenService.getAccessToken();
      
      // Wait for token to be considered expired (small delay)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second call should request new token
      const newToken = await tokenService.getAccessToken();

      expect(newToken).toBe("new-token");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple concurrent requests", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "concurrent-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Make multiple concurrent requests
      const promises = [
        tokenService.getAccessToken(),
        tokenService.getAccessToken(),
        tokenService.getAccessToken(),
      ];

      const tokens = await Promise.all(promises);

      // All should return the same token
      expect(tokens).toEqual(["concurrent-token", "concurrent-token", "concurrent-token"]);
      // Only one fetch should have been made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should throw error when OAuth2 credentials are not configured", async () => {
      mockConfiguration.getOAuth2ClientId.mockReturnValue("");
      
      await expect(tokenService.getAccessToken()).rejects.toThrow(
        "OAuth2 credentials not configured"
      );
    });

    it("should throw error when token request fails", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue("Invalid credentials"),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(tokenService.getAccessToken()).rejects.toThrow(
        "Token request failed with status 400"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to obtain access token")
      );
    });

    it("should include scope in token request when configured", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "scoped-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await tokenService.getAccessToken();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;
      
      expect(requestBody).toContain("scope=api%3Aread");
    });

    it("should not include scope when not configured", async () => {
      mockConfiguration.getOAuth2Scope.mockReturnValue(undefined);
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "no-scope-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await tokenService.getAccessToken();

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = fetchCall[1].body;
      
      expect(requestBody).not.toContain("scope=");
    });
  });

  describe("clearCache", () => {
    it("should clear cached token", async () => {
      // Cache a token first
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: "cached-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await tokenService.getAccessToken();
      jest.clearAllMocks();

      // Clear cache
      tokenService.clearCache();

      // Next request should fetch new token
      await tokenService.getAccessToken();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith("Clearing token cache");
    });
  });
});
