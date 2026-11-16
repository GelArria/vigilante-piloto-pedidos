import express from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './src/db.js';
import { clientes } from './src/clientes/rutas.js';
import { productos } from './src/productos/rutas.js';
import { pedidos } from './src/pedidos/rutas.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  next();
});

app.get('/salud', async (req, res) => {
  await pool.query('select 1');
  res.json({ ok: true });
});
app.use(clientes);
app.use(productos);
app.use(pedidos);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// The browser app: built files, and index.html for every client-side route.
const web = join(import.meta.dirname, 'web', 'dist');
if (existsSync(web)) {
  app.use(express.static(web, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(join(web, 'index.html')));
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' });
});

const server = app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '127.0.0.1', () => console.log(`tienda en ${server.address().port}`));
