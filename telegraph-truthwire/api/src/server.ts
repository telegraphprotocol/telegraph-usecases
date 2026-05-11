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

  const port = Number(process.env.PORT ?? 3000);
  const app = await createApp(config);

  // Do not pass a listen callback: Express wires that same function to `error` via `once()`,
  // so EADDRINUSE still invokes it and looks like a successful bind while the process exits.
  const server = app.listen(port);
  server.once("listening", () => {
    console.log(`Server listening on http://localhost:${port} (pid ${process.pid})`);
  });
  server.once("error", (err: NodeJS.ErrnoException) => {
    console.error("[server] listen error:", err.message);
    if (err.code === "EADDRINUSE") {
      console.error(
        `[server] Port ${port} is already in use. Stop the other process or set PORT=3001 in .env`
      );
    }
    process.exit(1);
  });
}

main();
