import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";

test("all 24 meet teams have safe local logo assets", async () => {
  const source = await readFile(new URL("../lib/team-logos.ts", import.meta.url), "utf8");
  const entries = [...source.matchAll(/^\s+([A-Z]+): "(\/team-logos\/[^"]+)",$/gm)];
  assert.equal(entries.length, 24);

  for (const [, abbreviation, publicPath] of entries) {
    const fileUrl = new URL(`../public${publicPath}`, import.meta.url);
    const fileStat = await stat(fileUrl);
    assert.ok(fileStat.size > 100, `${abbreviation} logo is unexpectedly empty`);
    if (publicPath.endsWith(".svg")) {
      const svg = await readFile(fileUrl, "utf8");
      assert.match(svg, /<svg\b/i);
      assert.doesNotMatch(svg, /<script\b|\son(?:load|error|click)\s*=/i);
    }
  }
});
