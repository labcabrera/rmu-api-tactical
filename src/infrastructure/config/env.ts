import { z } from "zod";

// Required environment variables schema
const envSchema = z.object({
  PORT: z.coerce.number().default(3003),
  RMU_MONGO_TACTICAL_URI: z.string().min(1, "Required RMU_MONGO_TACTICAL_URI"),
  RMU_API_CORE_URL: z.string().min(1, "RMU_API_CORE_URL is required"),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("*"),
  RMU_KEYCLOAK_CLIENT_ID: z
    .string()
    .min(1, "RMU_KEYCLOAK_CLIENT_ID is required"),
  RMU_KEYCLOAK_CLIENT_SECRET: z
    .string()
    .min(1, "RMU_KEYCLOAK_CLIENT_SECRET is required"),
  RMU_KEYCLOAK_BASE_URL: z.string().min(1, "RMU_KEYCLOAK_BASE_URL is required"),
  RMU_KEYCLOAK_REALM: z.string().min(1, "RMU_KEYCLOAK_REALM is required"),
  OAUTH2_SCOPE: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid process.env configuration:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
