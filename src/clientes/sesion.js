import { pool } from '../db.js';
import { hashToken, nuevoToken } from './claves.js';

const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

function leerToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return /(?:^|;\s*)sesion=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
}

export async function crearSesion(req, res, clienteId) {
  const token = nuevoToken();
  await pool.query('insert into sesiones (token_hash, cliente_id, expira_en) values ($1, $2, $3)', [hashToken(token), clienteId, new Date(Date.now() + DURACION_MS)]);
  const segura = req.secure ? '; Secure' : '';
  res.setHeader('set-cookie', `sesion=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DURACION_MS / 1000}${segura}`);
}

export async function cerrarSesion(req, res) {
  const token = leerToken(req);
  if (token) await pool.query('delete from sesiones where token_hash = $1', [hashToken(token)]);
  res.setHeader('set-cookie', 'sesion=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

/** Middleware: puts the logged-in customer in req.cliente or answers 401. */
export async function requiereCliente(req, res, next) {
  const token = leerToken(req);
  if (token) {
    const { rows } = await pool.query(
      'select c.id, c.nombre, c.email from sesiones s join clientes c on c.id = s.cliente_id where s.token_hash = $1 and s.expira_en > now()',
      [hashToken(token)],
    );
    if (rows[0]) {
      req.cliente = rows[0];
      return next();
    }
  }
  res.status(401).json({ error: 'Inicia sesión para continuar.' });
}
