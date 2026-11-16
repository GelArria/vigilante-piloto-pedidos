import http from 'node:http';
import { findOrder } from './src/pedidos/orders.js';
import { total } from './src/pedidos/total.js';

// GET /pedidos/:id -> { id, cliente, total }. Customers only see their own orders.
const server = http.createServer((req, res) => {
  const match = /^\/pedidos\/([\w-]+)$/.exec(req.url.split('?')[0]);
  res.setHeader('content-type', 'application/json');
  if (req.method !== 'GET' || !match) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'no encontrado' }));
  }
  const order = findOrder(match[1]);
  if (!order || order.cliente !== req.headers['x-cliente']) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'pedido no encontrado' }));
  }
  res.end(JSON.stringify({ id: order.id, cliente: order.cliente, total: total(order.items) }));
});

server.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => console.log(`pedidos en ${server.address().port}`));
