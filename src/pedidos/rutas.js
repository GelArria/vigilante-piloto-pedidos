import { Router } from 'express';
import { pool, transaction } from '../db.js';
import { requiereCliente } from '../clientes/sesion.js';
import { totalCents } from './total.js';
import { validarPedido } from './validar.js';

export const pedidos = Router();

/** Loads orders with their items. The total is always calculated with the business rule in total.js. */
async function cargar(where, params) {
  const { rows } = await pool.query(
    `select p.id, p.cliente_id, p.estado, p.direccion, p.creado_en,
            coalesce(json_agg(json_build_object('productoId', i.producto_id, 'nombre', i.nombre, 'precioCentavos', i.precio_centavos, 'cantidad', i.cantidad)
                     order by i.nombre) filter (where i.pedido_id is not null), '[]') as items
     from pedidos p left join pedido_items i on i.pedido_id = p.id
     where ${where} group by p.id order by p.creado_en desc limit 200`,
    params,
  );
  return rows.map(p => ({
    id: p.id,
    cliente: p.cliente_id,
    estado: p.estado,
    direccion: p.direccion,
    creadoEn: p.creado_en,
    items: p.items.map(i => ({ productoId: i.productoId, nombre: i.nombre, precio: i.precioCentavos / 100, cantidad: i.cantidad })),
    total: totalCents(p.items) / 100,
  }));
}

pedidos.get('/api/pedidos', requiereCliente, async (req, res) => {
  res.json(await cargar('p.cliente_id = $1', [req.cliente.id]));
});

pedidos.get('/api/pedidos/:id', requiereCliente, async (req, res) => {
  // Another customer's order answers exactly like a missing one: its existence is not revealed.
  const [pedido] = await cargar('p.id = $1 and p.cliente_id = $2', [req.params.id, req.cliente.id]);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado.' });
  res.json(pedido);
});

pedidos.post('/api/pedidos', requiereCliente, async (req, res) => {
  const { error, value } = validarPedido(req.body);
  if (error) return res.status(400).json({ error });
  const result = await transaction(async db => {
    const ids = value.items.map(i => i.productoId);
    const { rows } = await db.query('select id, nombre, precio_centavos, stock, activo from productos where id = any($1) for update', [ids]);
    const porId = new Map(rows.map(p => [p.id, p]));
    for (const item of value.items) {
      const p = porId.get(item.productoId);
      if (!p?.activo) return { status: 400, body: { error: 'Uno de los productos ya no está disponible.' } };
      if (p.stock < item.cantidad) return { status: 409, body: { error: `No hay suficiente ${p.nombre}: quedan ${p.stock}.` } };
    }
    const {
      rows: [pedido],
    } = await db.query("insert into pedidos (id, cliente_id, direccion) values (nextval('pedidos_numero')::text, $1, $2) returning id", [
      req.cliente.id,
      value.direccion,
    ]);
    for (const item of value.items) {
      const p = porId.get(item.productoId);
      await db.query('update productos set stock = stock - $1 where id = $2', [item.cantidad, p.id]);
      await db.query('insert into pedido_items (pedido_id, producto_id, nombre, precio_centavos, cantidad) values ($1, $2, $3, $4, $5)', [
        pedido.id,
        p.id,
        p.nombre,
        p.precio_centavos,
        item.cantidad,
      ]);
    }
    return { status: 201, id: pedido.id };
  });
  if (result.status !== 201) return res.status(result.status).json(result.body);
  const [pedido] = await cargar('p.id = $1', [result.id]);
  res.status(201).json(pedido);
});

pedidos.post('/api/pedidos/:id/cancelar', requiereCliente, async (req, res) => {
  const cancelado = await transaction(async db => {
    const { rowCount } = await db.query("update pedidos set estado = 'cancelado' where id = $1 and cliente_id = $2 and estado = 'pendiente'", [
      req.params.id,
      req.cliente.id,
    ]);
    if (!rowCount) return false;
    // The stock reserved by the order goes back to the catalog.
    await db.query('update productos p set stock = p.stock + i.cantidad from pedido_items i where i.pedido_id = $1 and p.id = i.producto_id', [req.params.id]);
    return true;
  });
  if (!cancelado) return res.status(409).json({ error: 'Solo se puede cancelar un pedido pendiente.' });
  const [pedido] = await cargar('p.id = $1', [req.params.id]);
  res.json(pedido);
});
