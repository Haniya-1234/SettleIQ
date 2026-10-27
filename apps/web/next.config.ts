import type { NextConfig } from "next";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const requireFromConfig = createRequire(import.meta.url);
const requireFromNext = createRequire(requireFromConfig.resolve("next/package.json"));
const { loadEnvConfig } = requireFromNext("@next/env") as {
  loadEnvConfig: (
    dir: string,
    dev?: boolean,
    log?: Console,
    forceReload?: boolean
  ) => { combinedEnv: Record<string, string | undefined> };
};

loadEnvConfig(rootDir, process.env.NODE_ENV !== "production", console, true);

const turbopackRoot = rootDir;


const nextConfig: NextConfig = {
  transpilePackages: [
    "@settleiq/db",
    "@settleiq/shared",
    "@settleiq/agents",
    "@settleiq/razorpay",
    "@settleiq/reconciliation",
  ],
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
