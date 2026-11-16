// Loads customers, products and orders with explicit ids, in bulk. Shared by the preproduction restore and the demo data.
import { hashClave, hashToken, nuevoToken } from '../src/clientes/claves.js';

/**
 * datos: {
 *   clientes: [{ id, nombre, email, clave?, token? }]            clave/token absent = unusable random ones
 *   productos: [{ sku, nombre, categoria, unidad, precio, stock }] precio in USD
 *   pedidos: [{ id, cliente, direccion, estado?, creadoEn?, items: [{ sku, cantidad }] }]
 * }
 */
export async function cargarDatos(db, datos) {
  const clientes = datos.clientes ?? [];
  const hashes = await Promise.all(clientes.map(c => hashClave(c.clave ?? nuevoToken())));
  await db.query('insert into clientes (id, nombre, email, clave_hash) select * from unnest($1::text[], $2::text[], $3::text[], $4::text[])', [
    clientes.map(c => c.id),
    clientes.map(c => c.nombre),
    clientes.map(c => c.email.toLowerCase()),
    hashes,
  ]);
  const conToken = clientes.filter(c => c.token);
  await db.query("insert into sesiones (token_hash, cliente_id, expira_en) select t, c, now() + interval '10 years' from unnest($1::text[], $2::text[]) as x(t, c)", [
    conToken.map(c => hashToken(c.token)),
    conToken.map(c => c.id),
  ]);

  const productos = datos.productos ?? [];
  const { rows } = await db.query(
    'insert into productos (sku, nombre, categoria, unidad, precio_centavos, stock) select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::int[], $6::int[]) returning id, sku, nombre, precio_centavos',
    [
      productos.map(p => p.sku),
      productos.map(p => p.nombre),
      productos.map(p => p.categoria),
      productos.map(p => p.unidad),
      productos.map(p => Math.round(p.precio * 100)),
      productos.map(p => p.stock),
    ],
  );
  const porSku = new Map(rows.map(p => [p.sku, p]));

  const pedidos = datos.pedidos ?? [];
  await db.query(
    "insert into pedidos (id, cliente_id, direccion, estado, creado_en) select i, c, d, e, coalesce(f, now()) from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[]) as x(i, c, d, e, f)",
    [pedidos.map(p => p.id), pedidos.map(p => p.cliente), pedidos.map(p => p.direccion), pedidos.map(p => p.estado ?? 'pendiente'), pedidos.map(p => p.creadoEn ?? null)],
  );
  const items = pedidos.flatMap(p =>
    p.items.map(i => {
      const producto = porSku.get(i.sku);
      if (!producto) throw new Error(`el pedido ${p.id} usa un producto inexistente: ${i.sku}`);
      return { pedido: p.id, producto, cantidad: i.cantidad };
    }),
  );
  await db.query(
    'insert into pedido_items (pedido_id, producto_id, nombre, precio_centavos, cantidad) select * from unnest($1::text[], $2::int[], $3::text[], $4::int[], $5::int[])',
    [items.map(i => i.pedido), items.map(i => i.producto.id), items.map(i => i.producto.nombre), items.map(i => i.producto.precio_centavos), items.map(i => i.cantidad)],
  );

  // New orders and customers continue after the highest numeric id loaded.
  await db.query("select setval('pedidos_numero', greatest(1000, (select coalesce(max(id::int), 0) from pedidos where id ~ '^[0-9]+$')))");
  await db.query("select setval('clientes_numero', greatest(1, (select coalesce(max(substring(id from 9)::int), 0) from clientes where id ~ '^cliente-[0-9]+$')))");
}
