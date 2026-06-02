import { db } from '../src/db/index.ts';
import { operations, clients } from '../src/db/schema.ts';
import { eq, ilike } from 'drizzle-orm';

const ops = await db.select({ id: operations.id, status: operations.status, client_nombre: clients.nombre })
  .from(operations)
  .leftJoin(clients, eq(operations.client_id, clients.id))
  .where(ilike(clients.nombre, '%polla%'));

console.log('Found:', JSON.stringify(ops, null, 2));

for (const op of ops) {
  await db.delete(operations).where(eq(operations.id, op.id));
  console.log('Deleted:', op.id);
}
