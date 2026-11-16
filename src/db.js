import { DatabaseSync } from 'node:sqlite';

// Each environment has its own database: production data, or preproduction test records restored by the CI/CD.
const db = new DatabaseSync(process.env.DATABASE_FILE ?? 'data.db', { readOnly: true });

export function findOrder(id) {
  const row = db.prepare('select id, cliente, items from orders where id = ?').get(id);
  return row && { id: row.id, cliente: row.cliente, items: JSON.parse(row.items) };
}
