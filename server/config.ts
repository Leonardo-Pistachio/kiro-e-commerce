import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Order lifecycle timings, in seconds after placement. */
export interface OrderTimings {
  shipSeconds: number;
  deliverSeconds: number;
}

/** Settings the assistant needs to reach Amazon Bedrock. The key never leaves the server. */
export interface AssistantConfig {
  bedrockToken?: string;
  region: string;
  modelId: string;
  timeoutMs: number;
}

export interface AppConfig {
  port: number;
  dbPath: string;
  timings: OrderTimings;
  assistant: AssistantConfig;
}

export const DEFAULT_MODEL_ID = 'us.amazon.nova-lite-v1:0';

/**
 * Loads `.env` from the project root when it exists. Values are only placed in
 * process.env; nothing here reads, prints, or logs them.
 */
export function loadEnvFileIfPresent(path = resolve(process.cwd(), '.env')): void {
  if (!existsSync(path)) return;
  try {
    process.loadEnvFile(path);
  } catch (error) {
    // Report the failure without echoing any file content.
    console.warn(`[config] Could not load .env: ${(error as Error).name}`);
  }
}

/** Reads an env var, treating an empty string as unset. */
function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function readPositiveNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = readEnv(env, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.warn(`[config] Ignoring invalid ${name}; using ${fallback}`);
    return fallback;
  }
  return value;
}

export function readTimings(env: NodeJS.ProcessEnv = process.env): OrderTimings {
  const shipSeconds = readPositiveNumber(env, 'ORDER_SHIP_SECONDS', 30);
  const deliverSeconds = readPositiveNumber(env, 'ORDER_DELIVER_SECONDS', 60);
  if (deliverSeconds <= shipSeconds) {
    console.warn('[config] ORDER_DELIVER_SECONDS must exceed ORDER_SHIP_SECONDS; using 30 and 60');
    return { shipSeconds: 30, deliverSeconds: 60 };
  }
  return { shipSeconds, deliverSeconds };
}

export function readAssistantConfig(env: NodeJS.ProcessEnv = process.env): AssistantConfig {
  return {
    bedrockToken: readEnv(env, 'AWS_BEARER_TOKEN_BEDROCK'),
    region: readEnv(env, 'AWS_REGION') ?? 'us-east-1',
    modelId: readEnv(env, 'BEDROCK_MODEL_ID') ?? DEFAULT_MODEL_ID,
    timeoutMs: 8000,
  };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: readPositiveNumber(env, 'PORT', 3001),
    dbPath: readEnv(env, 'DB_PATH') ?? resolve(process.cwd(), 'data', 'store.db'),
    timings: readTimings(env),
    assistant: readAssistantConfig(env),
  };
}
