/**
 * Lossless JSON (de)serialisation of SDK `ConfigParameters`, which contain BN values.
 * Encoding: every BN becomes {"$bn": "<decimal string>"}; everything else is plain JSON.
 */
import BN from "bn.js";
import type { ConfigParameters } from "@meteora-ag/dynamic-bonding-curve-sdk";

export function configToJson(params: ConfigParameters, indent = 2): string {
  return JSON.stringify(
    params,
    function (this: Record<string, unknown>, key: string, value: unknown) {
      // BN.prototype.toJSON runs before the replacer, so read the raw value from the holder
      const raw = this[key];
      if (BN.isBN(raw)) return { $bn: (raw as BN).toString(10) };
      return value;
    },
    indent,
  );
}

export function configFromJson(text: string): ConfigParameters {
  return JSON.parse(text, (_k, v) => {
    if (v && typeof v === "object" && typeof (v as { $bn?: unknown }).$bn === "string") {
      return new BN((v as { $bn: string }).$bn, 10);
    }
    return v;
  }) as ConfigParameters;
}
