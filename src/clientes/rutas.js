import { Router } from 'express';
import { pool } from '../db.js';
import { hashClave, verificarClave } from './claves.js';
import { cerrarSesion, crearSesion, requiereCliente } from './sesion.js';

export const clientes = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

clientes.post('/api/clientes', async (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const clave = String(req.body?.clave ?? '');
  if (nombre.length < 2 || nombre.length > 120) return res.status(400).json({ error: 'Indica tu nombre.' });
  if (!EMAIL.test(email) || email.length > 200) return res.status(400).json({ error: 'El correo no es válido.' });
  if (clave.length < 8 || clave.length > 200) return res.status(400).json({ error: 'La clave debe tener al menos 8 caracteres.' });
  const { rows } = await pool.query(
    `insert into clientes (id, nombre, email, clave_hash)
     values ('cliente-' || lpad(nextval('clientes_numero')::text, 4, '0'), $1, $2, $3)
     on conflict (email) do nothing returning id, nombre, email`,
    [nombre, email, await hashClave(clave)],
  );
  if (!rows[0]) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  await crearSesion(req, res, rows[0].id);
  res.status(201).json(rows[0]);
});

clientes.post('/api/sesion', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const { rows } = await pool.query('select id, nombre, email, clave_hash from clientes where email = $1', [email]);
  // shortcut: no rate limit on login attempts, add one before exposing real customer accounts.
  if (!rows[0] || !(await verificarClave(String(req.body?.clave ?? ''), rows[0].clave_hash))) {
    return res.status(401).json({ error: 'Correo o clave incorrectos.' });
  }
  await crearSesion(req, res, rows[0].id);
  res.json({ id: rows[0].id, nombre: rows[0].nombre, email: rows[0].email });
});

clientes.get('/api/sesion', requiereCliente, (req, res) => res.json(req.cliente));

clientes.delete('/api/sesion', async (req, res) => {
  await cerrarSesion(req, res);
  res.status(204).end();
});
