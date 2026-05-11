import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev: proxy /api → review-checker-api. Override with VITE_DEV_API_PROXY if API is not on :3001.
// Prod: set VITE_API_BASE in .env and CORS_ORIGIN on the API.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_DEV_API_PROXY?.trim() || "http://127.0.0.1:3001";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
