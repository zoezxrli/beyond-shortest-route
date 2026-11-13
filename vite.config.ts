import vinext from "vinext";
import { defineConfig } from "vite";

process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
process.env.WRANGLER_SEND_METRICS ??= "false";

const LOCAL_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const localBindingConfig = {
  name: "ruta-justa-bogota",
  main: "./worker/index.ts",
  compatibility_date: "2026-05-15",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [
    {
      binding: "DB",
      database_name: "ruta-justa-db",
      database_id: LOCAL_DATABASE_ID,
    },
  ],
  r2_buckets: [
    {
      binding: "BUCKET",
      bucket_name: "ruta-justa-photos",
    },
  ],
};

export default defineConfig(async () => {
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      host: "127.0.0.1",
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
