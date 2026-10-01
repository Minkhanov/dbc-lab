import { Connection, PublicKey } from "@solana/web3.js";
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const programId = new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
const info = await conn.getAccountInfo(programId);
const pd = new PublicKey(info!.data.subarray(4, 36));
const pdInfo = await conn.getAccountInfo(pd, { dataSlice: { offset: 0, length: 45 } });
const d = pdInfo!.data;
const hasAuth = d[12] === 1;
console.log("programdata", pd.toBase58(), "upgrade auth set:", hasAuth);
if (hasAuth) {
  const auth = new PublicKey(d.subarray(13, 45));
  const acc = await conn.getAccountInfo(auth);
  console.log("upgrade authority", auth.toBase58(), "lamports", acc?.lamports, "owner", acc?.owner.toBase58(), "dataLen", acc?.data.length);
}
