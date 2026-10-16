import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const html = readFileSync("public/simulasi.html", "utf8");
const handler = html.match(/function setTheme\(mode\) \{[\s\S]*?\n    \}/)?.[0];

describe("Theme preference", () => {
  for (const mode of ["light", "dark"]) {
    it(`remembers the ${mode} choice`, () => {
      if (!handler) throw new Error("Theme preference handler missing");
      const saved = new Map<string, string>();
      runInNewContext(`${handler}\nsetTheme(mode)`, {
        mode,
        localStorage: { setItem: (key: string, value: string) => saved.set(key, value) },
        document: { documentElement: { classList: { toggle: () => {} } }, getElementById: () => ({ setAttribute: () => {} }) },
        parent: { document: { documentElement: { classList: { toggle: () => {} } } } },
      });
      expect(saved.get("tka_theme")).toBe(mode);
    });
  }
});