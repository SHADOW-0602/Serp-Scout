import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not defined in ../../apps/api/.env');
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  console.log('Running schema upgrades on Neon DB...');

  await sql`ALTER TABLE "recommendations" ADD COLUMN IF NOT EXISTS "checklist" jsonb;`;
  console.log('✓ Column recommendations.checklist verified');

  await sql`CREATE TABLE IF NOT EXISTS "report_shares" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "report_id" uuid NOT NULL REFERENCES "reports"("id") ON DELETE CASCADE,
    "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
    "share_token" varchar(64) NOT NULL UNIQUE,
    "view_mode" varchar(20) NOT NULL DEFAULT 'executive',
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL DEFAULT now()
  );`;
  console.log('✓ Table report_shares verified');

  await sql`CREATE TABLE IF NOT EXISTS "market_alerts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
    "type" varchar(50) NOT NULL,
    "severity" varchar(20) NOT NULL DEFAULT 'critical',
    "title" text NOT NULL,
    "description" text NOT NULL,
    "details" jsonb,
    "dismissed" boolean NOT NULL DEFAULT false,
    "detected_at" timestamp with time zone NOT NULL DEFAULT now()
  );`;
  console.log('✓ Table market_alerts verified');

  console.log('🎉 Database migration complete!');
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
