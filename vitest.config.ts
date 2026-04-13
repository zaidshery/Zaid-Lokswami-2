import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': process.cwd(),
      'server-only': path.resolve(process.cwd(), 'tests/mocks/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './setupTests.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
  },
});
