import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env` from the project cwd into `process.env` without overriding existing vars.
 * Matches common dotenv behavior so local env config works with plain `npm run dev`.
 */
export function loadLocalEnv(filename = ".env"): void {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;

  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key || key.includes(" ")) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.trimEnd();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
