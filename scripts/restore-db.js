// Restores the preproduction database to a known state: the fixed test records plus the case records in .vigilante/seeds/.
// Usage: node scripts/restore-db.js <database file>
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('falta la ruta de la base de datos');
rmSync(file, { force: true });
const db = new DatabaseSync(file);
db.exec('create table orders (id text primary key, cliente text not null, items text not null)');
const insert = db.prepare('insert or replace into orders (id, cliente, items) values (?, ?, ?)');

const records = JSON.parse(readFileSync('db/test-records.json', 'utf8'));
if (existsSync('.vigilante/seeds')) {
  for (const name of readdirSync('.vigilante/seeds').filter(n => n.endsWith('.json'))) {
    const seed = JSON.parse(readFileSync(`.vigilante/seeds/${name}`, 'utf8'));
    for (const record of Array.isArray(seed) ? seed : [seed]) {
      if (typeof record?.id === 'string' && typeof record?.cliente === 'string' && Array.isArray(record?.items)) records.push(record);
      else console.warn(`registro ignorado en ${name}: necesita id, cliente e items`);
    }
  }
}
for (const r of records) insert.run(r.id, r.cliente, JSON.stringify(r.items));
console.log(`base restaurada: ${records.length} registros en ${file}`);
