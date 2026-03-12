import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getPool } from "./pool.js";

async function main() {
  const pool = getPool();
  const sqlPath = resolve(process.cwd(), "sql", "001_bootstrap.sql");
  const sql = await readFile(sqlPath, "utf8");

  await pool.query("begin");
  try {
    await pool.query(sql);
    await pool.query("commit");
    // eslint-disable-next-line no-console
    console.log("DB bootstrap applied:", sqlPath);
  } catch (err) {
    await pool.query("rollback");
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
