import { Router } from 'express';
import { pool } from '../db.js';

export const productos = Router();

productos.get('/api/productos', async (req, res) => {
  const { rows } = await pool.query('select id, sku, nombre, categoria, unidad, precio_centavos, stock from productos where activo order by categoria, nombre');
  res.json(rows.map(p => ({ id: p.id, sku: p.sku, nombre: p.nombre, categoria: p.categoria, unidad: p.unidad, precio: p.precio_centavos / 100, stock: p.stock })));
});
