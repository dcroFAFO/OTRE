import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const sourceBase44ClientPath = fileURLToPath(new URL('./src/api/base44Client.js', import.meta.url))
const fixtureBase44ClientPath = fileURLToPath(new URL('./e2e/fixtures/base44Client.js', import.meta.url))

const e2eAdapterPlugin = {
  name: 'otre-e2e-base44-adapter',
  enforce: 'pre',
  resolveId(source) {
    if (process.env.OTRE_E2E !== '1') return null
    if (source === '@/api/base44Client') {
      return fileURLToPath(new URL('./e2e/fixtures/base44Client.js', import.meta.url))
    }
    if (source === '@base44/sdk/dist/utils/axios-client') {
      return fileURLToPath(new URL('./e2e/fixtures/axios-client.js', import.meta.url))
    }
    return null
  },
  load(id) {
    if (process.env.OTRE_E2E !== '1') return null
    if (id.split('?')[0] === sourceBase44ClientPath) {
      return readFileSync(fixtureBase44ClientPath, 'utf8')
    }
    return null
  },
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: process.env.OTRE_E2E === '1' ? {
    alias: [
      {
        find: '@/api/base44Client',
        replacement: fileURLToPath(new URL('./e2e/fixtures/base44Client.js', import.meta.url)),
      },
      {
        find: '@base44/sdk/dist/utils/axios-client',
        replacement: fileURLToPath(new URL('./e2e/fixtures/axios-client.js', import.meta.url)),
      },
    ],
  } : undefined,
  plugins: [
    e2eAdapterPlugin,
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
