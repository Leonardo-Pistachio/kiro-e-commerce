import { defineConfig } from 'vitest/config';

// Server-side tests only: order rules, assistant parser, and the API
// end-to-end flow (supertest against createApp, no port opened).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      // Tests never call Bedrock and never touch the real database file.
      AWS_BEARER_TOKEN_BEDROCK: '',
      DB_PATH: ':memory:',
    },
    testTimeout: 15000,
  },
});
