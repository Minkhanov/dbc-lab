// Generates a NEW throwaway keypair used ONLY on devnet. File lives in keys/ (gitignored).
import { Keypair } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

const out = path.resolve("keys", "devnet-test.json");
if (fs.existsSync(out)) {
  console.log("exists, not overwriting:", out);
} else {
  const kp = Keypair.generate();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log("created", out);
}
const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(out, "utf8"))));
console.log("public key:", kp.publicKey.toBase58());
