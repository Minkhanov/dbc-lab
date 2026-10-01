import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/presets/library.js";
import { buildConfigParameters } from "../src/presets/build.js";
import { configFromJson, configToJson } from "../src/presets/serialize.js";

function deepEqualBn(a: unknown, b: unknown, path = "$"): void {
  if (BN.isBN(a)) {
    expect(BN.isBN(b), path).toBe(true);
    expect((a as BN).toString(10), path).toBe((b as BN).toString(10));
    return;
  }
  if (Array.isArray(a)) {
    expect(Array.isArray(b), path).toBe(true);
    expect((b as unknown[]).length, path).toBe(a.length);
    a.forEach((x, i) => deepEqualBn(x, (b as unknown[])[i], `${path}[${i}]`));
    return;
  }
  if (a && typeof a === "object") {
    const ka = Object.keys(a as object).sort();
    expect(Object.keys(b as object).sort(), path).toEqual(ka);
    for (const k of ka) deepEqualBn((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    return;
  }
  expect(b, path).toBe(a);
}

describe("ConfigParameters JSON round trip", () => {
  for (const preset of PRESETS) {
    it(preset.id, () => {
      const params = buildConfigParameters(preset);
      const json = configToJson(params);
      expect(json).toContain("$bn");
      deepEqualBn(params, configFromJson(json));
    });
  }
});
