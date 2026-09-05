import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const turbopackRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

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
