// Applies the pending files of migrations/ in order, each one in its own transaction.
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { pool } from '../src/db.js';

export async function migrate() {
  const client = await pool.connect();
  try {
    // Two instances starting at once must not apply the same migration twice.
    await client.query('select pg_advisory_lock(7300)');
    await client.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())');
    const done = new Set((await client.query('select nombre from migraciones')).rows.map(r => r.nombre));
    for (const name of readdirSync('migrations').filter(n => n.endsWith('.sql')).sort()) {
      if (done.has(name)) continue;
      await client.query('begin');
      try {
        await client.query(readFileSync(`migrations/${name}`, 'utf8'));
        await client.query('insert into migraciones (nombre) values ($1)', [name]);
        await client.query('commit');
        console.log(`migración aplicada: ${name}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(7300)').catch(() => {});
    client.release();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate();
  await pool.end();
}
