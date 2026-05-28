// Bypass Prisma — use pg client directly to confirm DDL is in place
import { Client } from "pg";

const cleaned = (process.env.DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "");
const client = new Client({
  connectionString: cleaned,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const tables = ["health_check", "taxonomies", "sources", "cities", "brands", "drinks", "news"];
const t0 = Date.now();
await client.connect();
console.log(`connected in ${Date.now() - t0}ms`);

for (const t of tables) {
  const start = Date.now();
  try {
    const r = await client.query(`SELECT count(*)::int AS n FROM "${t}"`);
    console.log(`  ✓ ${t.padEnd(14)} ${r.rows[0].n} rows  (${Date.now() - start}ms)`);
  } catch (e) {
    console.log(`  ✗ ${t.padEnd(14)} ERROR ${e.message?.slice(0, 100)}`);
  }
}

const enums = await client.query(
  "SELECT typname FROM pg_type WHERE typtype='e' AND typname IN ('entity_status','business_model','price_tier','market_maturity','drink_category','drink_temperature','news_category','source_kind','taxonomy_kind') ORDER BY typname"
);
console.log(`\nEnums present (${enums.rows.length}/9):`, enums.rows.map((r) => r.typname).join(", "));

await client.end();
console.log(`\nTotal: ${Date.now() - t0}ms`);
