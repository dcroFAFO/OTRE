import base44 from "@base44/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export default defineConfig(({ mode }) => {
  const development = mode === "development";
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const appBaseUrl = httpsOrigin(process.env.VITE_BASE44_APP_BASE_URL || fileEnv.VITE_BASE44_APP_BASE_URL);
  return {
    plugins: [
      base44({
        legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === "true",
        hmrNotifier: development,
        navigationNotifier: development,
        analyticsTracker: false,
        visualEditAgent: development,
      }),
      react(),
    ],
    // Unlike the development server, Vite preview does not inherit the Base44
    // plugin's API proxy. Configure it explicitly so production-build browser
    // tests exercise the selected isolated backend instead of receiving the SPA.
    preview: appBaseUrl ? {
      proxy: {
        "/api": {
          target: appBaseUrl,
          changeOrigin: true,
        },
      },
    } : undefined,
    build: {
      manifest: true,
      sourcemap: false,
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|react-helmet-async)[\\/]/.test(id)) return "react-core";
            if (id.includes("@tanstack/react-query")) return "query-core";
            if (/[\\/]node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+)[\\/]/.test(id)) return "charts";
            return undefined;
          },
        },
      },
    },
  };
});
