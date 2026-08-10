import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node', // domain/ は DOM を参照しない。Node で完結すること（HANDOFF §2）
    include: ['test/**/*.test.ts'],
  },
});
