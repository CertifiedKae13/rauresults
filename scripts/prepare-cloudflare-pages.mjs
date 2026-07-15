import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const serverDir = resolve(root, "dist/server");
const pagesOutputDir = resolve(root, "dist/client");

// Pages Advanced Mode uses _worker.js as its application entry point. The
// vinext output is already a Worker-compatible module. Bundle its internal
// module graph because Pages requires _worker.js to be self-contained.
await rm(resolve(pagesOutputDir, "_pages-worker"), { recursive: true, force: true });
await rm(resolve(pagesOutputDir, "ssr"), { recursive: true, force: true });
await rm(resolve(pagesOutputDir, "__vite_rsc_assets_manifest.js"), { force: true });
await build({
  entryPoints: [resolve(serverDir, "index.js")],
  outfile: resolve(pagesOutputDir, "_worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  external: ["cloudflare:workers", "node:*"],
  logLevel: "silent",
});

console.log("Cloudflare Pages output prepared in dist/client.");
