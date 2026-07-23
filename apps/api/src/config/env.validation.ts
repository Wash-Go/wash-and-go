import Joi from 'joi';

/*
 * A2 (P1): boot-time env schema. Guarantees the vars the auth fail-safe (A1) and
 * the money path rely on are present and well-typed before the app starts —
 * missing/typo'd NODE_ENV or DATABASE_URL fails fast instead of silently
 * degrading. NODE_ENV defaults to 'development' so local/dev keeps working;
 * production MUST set NODE_ENV=production (and then AUTH_DEV_BYPASS must be 0,
 * enforced by assertAuthConfigSafe).
 *
 * allowUnknown lets unrelated env vars through; only the keys below are checked.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  AUTH_DEV_BYPASS: Joi.string().valid('0', '1').default('0'),
  GOOGLE_APPLICATION_CREDENTIALS: Joi.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
  REDIS_URL: Joi.string().uri().optional(),
  CORS_ORIGINS: Joi.string().optional(), // comma-separated allow-list

  // Maps provider (geocoding + routing). Key optional until the spike wires it;
  // the provider falls back to the haversine proxy when its key is absent.
  MAPS_PROVIDER: Joi.string().valid('tomtom', 'google').default('tomtom'),
  TOMTOM_API_KEY: Joi.string().allow('').optional(),
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').optional(),

  // Pricing / delivery params — optional (code carries pilot defaults).
  SERVICE_FEE_PHP: Joi.number().optional(),
  DELIVERY_BASE_PHP: Joi.number().optional(),
  DELIVERY_FREE_KM: Joi.number().optional(),
  DELIVERY_PER_KM_PHP: Joi.number().optional(),
  DELIVERY_MAX_PHP: Joi.number().optional(),
  DELIVERY_ROAD_FACTOR: Joi.number().optional(),
  MAX_RESOLVE_KM: Joi.number().optional(),
});

export const envValidationOptions = {
  allowUnknown: true,
  abortEarly: false,
};
