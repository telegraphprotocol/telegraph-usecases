import dns from "node:dns";
import { createApp } from "./app";
import { ConfigError, loadConfig } from "./config";
import { loadLocalEnv } from "./loadLocalEnv";

loadLocalEnv();

if (process.env.DNS_RESULT_ORDER !== "verbatim") {
  dns.setDefaultResultOrder("ipv4first");
}

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[config] ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const port = Number(process.env.PORT ?? 3001);
  const app = await createApp(config);

  const server = app.listen(port);
  server.once("listening", () => {
    console.log(`[adguard] Server listening on http://localhost:${port} (pid ${process.pid})`);
    console.log(`[adguard] Google Ads simulate mode: ${config.googleAdsSimulate}`);
    console.log(`[adguard] Solana network: ${config.solanaNetwork}`);
  });
  server.once("error", (err: NodeJS.ErrnoException) => {
    console.error("[server] listen error:", err.message);
    if (err.code === "EADDRINUSE") {
      console.error(`[server] Port ${port} is in use. Set PORT= in .env to use another port.`);
    }
    process.exit(1);
  });
}

main();
