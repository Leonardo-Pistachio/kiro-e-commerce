import { resolve } from 'node:path';
import { createApp } from './app';
import { loadEnvFileIfPresent, readConfig } from './config';
import { openDatabase } from './db';
import { seedProducts, upgradeSeedImages } from './seed';

// Load secrets from .env (if present) before reading any configuration.
loadEnvFileIfPresent();

const config = readConfig();

try {
  const db = openDatabase(config.dbPath);
  const seeded = seedProducts(db);
  if (seeded > 0) console.log(`[store] Seeded ${seeded} products`);
  const upgraded = upgradeSeedImages(db);
  if (upgraded > 0) console.log(`[store] Gave ${upgraded} products their own image`);

  const app = createApp({
    db,
    timings: config.timings,
    assistant: config.assistant,
    staticDir: resolve(process.cwd(), 'dist'),
  });

  const server = app.listen(config.port, () => {
    console.log(`[store] API and app on http://localhost:${config.port}`);
    console.log(`[store] Database: ${config.dbPath}`);
    console.log(`[store] Orders ship after ${config.timings.shipSeconds}s, deliver after ${config.timings.deliverSeconds}s`);
    // Only whether a key is present is reported, never its value.
    console.log(`[store] Assistant: ${config.assistant.bedrockToken ? `Amazon Bedrock (${config.assistant.modelId}) with rule-based fallback` : 'rule-based parser (no Bedrock key set)'}`);
  });
  server.on('error', (error) => {
    console.error(`[store] Server failed to start: ${error.message}`);
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`[store] Startup failed: ${(error as Error).message}`);
  process.exit(1);
}
