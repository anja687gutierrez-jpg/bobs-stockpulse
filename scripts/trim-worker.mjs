/**
 * Post-build script: strips unused @vercel/og from the OpenNext worker bundle.
 *
 * Next.js always bundles @vercel/og (resvg.wasm, yoga.wasm, index.edge.js)
 * into the server handler — even when the app has zero OG image routes.
 * Wrangler then follows the dynamic import chain and bundles ~1.4 MB of WASM,
 * pushing the worker over the 3 MiB gzip limit.
 *
 * This script stubs out the @vercel/og import in handler.mjs so wrangler
 * never resolves the WASM files.
 */

import { readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const OPEN_NEXT_DIR = resolve(process.cwd(), ".open-next");
const HANDLER_PATH = resolve(
  OPEN_NEXT_DIR,
  "server-functions",
  "default",
  "handler.mjs"
);

async function trimWorker() {
  if (!existsSync(OPEN_NEXT_DIR)) {
    console.error("ERROR: .open-next/ not found — run the build first.");
    process.exit(1);
  }

  let changes = 0;

  // 1. Stub out the @vercel/og dynamic import in handler.mjs
  if (existsSync(HANDLER_PATH)) {
    let handler = await readFile(HANDLER_PATH, "utf8");
    const ogImportPattern =
      /case\s*"next\/dist\/compiled\/@vercel\/og\/index\.node\.js"\s*:\s*raw\s*=\s*await\s+import\s*\(\s*"next\/dist\/compiled\/@vercel\/og\/index\.edge\.js"\s*\)\s*;\s*break\s*;/g;

    const matchCount = (handler.match(ogImportPattern) || []).length;

    if (matchCount > 0) {
      handler = handler.replace(
        ogImportPattern,
        'case"next/dist/compiled/@vercel/og/index.node.js":raw={ImageResponse:class{constructor(){throw new Error("@vercel/og not available")}}};break;'
      );
      await writeFile(HANDLER_PATH, handler);
      console.log(
        `Stubbed ${matchCount} @vercel/og import(s) in handler.mjs`
      );
      changes += matchCount;
    }
  }

  // 2. Remove any stray WASM/edge files from the build output
  const UNUSED_FILES = ["resvg.wasm", "yoga.wasm", "index.edge.js"];
  const SEARCH_DIRS = [
    OPEN_NEXT_DIR,
    resolve(OPEN_NEXT_DIR, "workers"),
    resolve(OPEN_NEXT_DIR, "workers", "default"),
    resolve(OPEN_NEXT_DIR, "server-functions", "default"),
  ];

  for (const file of UNUSED_FILES) {
    for (const dir of SEARCH_DIRS) {
      const path = resolve(dir, file);
      if (existsSync(path)) {
        await rm(path);
        console.log(`Removed: ${path}`);
        changes++;
      }
    }
  }

  if (changes === 0) {
    console.log("No @vercel/og artifacts found (already clean).");
  } else {
    console.log(`\nDone — ${changes} change(s) applied.`);
  }
}

trimWorker();
