/**
 * Migration: create collaborator_users table and move login data from collaborators.
 *
 * Run once with: npx tsx src/db/migrate-collaborator-users.ts
 *
 * For each collaborador (role='colaborador'), creates a matching row in collaborator_users
 * with the same email, password_hash, nombre, and activo flag.
 * Admin users keep logging in via the collaborators table directly.
 *
 * Also updates password_reset_tokens: drops the old FK to collaborators,
 * leaves user_id as a plain uuid (points to collaborator_users for colaboradores,
 * collaborators for admins).
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Creating collaborator_users table...");

  await sql`
    CREATE TABLE IF NOT EXISTS collaborator_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )
  `;

  console.log("Migrating existing colaborador login data...");

  const result = await sql`
    INSERT INTO collaborator_users (collaborator_id, nombre, email, password_hash, activo)
    SELECT id, nombre, email, password_hash, activo
    FROM collaborators
    WHERE role = 'colaborador'
      AND email NOT IN (SELECT email FROM collaborator_users)
    RETURNING id, email
  `;

  console.log(`Migrated ${result.length} users:`, result.map((r: any) => r.email));

  // Drop the FK constraint on password_reset_tokens.user_id first
  console.log("Dropping FK constraint on password_reset_tokens.user_id...");
  const fks = await sql`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'password_reset_tokens' AND constraint_type = 'FOREIGN KEY'
  `;
  for (const fk of fks) {
    console.log("Dropping FK:", fk.constraint_name);
    await sql.query(`ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS ${fk.constraint_name}`);
  }

  // Update existing password_reset_tokens to point to collaborator_users.id
  console.log("Updating password_reset_tokens to point to collaborator_users...");

  await sql`
    UPDATE password_reset_tokens prt
    SET user_id = cu.id
    FROM collaborator_users cu
    JOIN collaborators c ON c.id = cu.collaborator_id
    WHERE prt.user_id = c.id AND c.role = 'colaborador'
  `;

  console.log("Done!");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
