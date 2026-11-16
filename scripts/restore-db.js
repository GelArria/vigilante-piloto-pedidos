// Puts the preproduction database in a known state: the fixed test records plus the records of each case in .vigilante/seeds/.
// The CI/CD runs it before every preproduction start. It erases all data, so it refuses to run anywhere else.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pool, transaction } from '../src/db.js';
import { migrate } from './migrate.js';
import { cargarDatos } from './datos.js';

if (process.env.APP_ENV !== 'preproduction') {
  console.error('restore-db solo se ejecuta con APP_ENV=preproduction: borra todos los datos.');
  process.exit(1);
}

const datos = JSON.parse(readFileSync('db/test-records.json', 'utf8'));
// Credentials of the test customer come from the environment, never from the repository.
for (const c of datos.clientes) {
  if (c.id === 'cliente-prueba') Object.assign(c, { clave: process.env.CLAVE_CLIENTE_PRUEBA, token: process.env.TOKEN_CLIENTE_PRUEBA });
}
if (existsSync('.vigilante/seeds')) {
  for (const name of readdirSync('.vigilante/seeds').filter(n => n.endsWith('.json')).sort()) {
    const seed = JSON.parse(readFileSync(`.vigilante/seeds/${name}`, 'utf8'));
    for (const key of ['clientes', 'productos', 'pedidos']) datos[key].push(...(seed[key] ?? []));
    console.log(`registros del caso cargados: ${name}`);
  }
}

await migrate();
await transaction(async db => {
  await db.query('truncate pedido_items, pedidos, sesiones, productos, clientes restart identity');
  await cargarDatos(db, datos);
});
console.log(`base de preproducción restaurada: ${datos.clientes.length} clientes, ${datos.productos.length} productos, ${datos.pedidos.length} pedidos`);
await pool.end();
