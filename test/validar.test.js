import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPedido } from '../src/pedidos/validar.js';

const direccion = 'Calle 4, casa 12, Chacao';

test('un pedido válido se normaliza y une las líneas repetidas', () => {
  const { value } = validarPedido({ direccion: `  ${direccion} `, items: [{ productoId: 3, cantidad: 2 }, { productoId: '3', cantidad: 1 }, { productoId: 5, cantidad: 1 }] });
  assert.deepEqual(value, { direccion, items: [{ productoId: 3, cantidad: 3 }, { productoId: 5, cantidad: 1 }] });
});

test('rechaza un pedido sin productos o sin dirección', () => {
  assert.ok(validarPedido({ direccion, items: [] }).error);
  assert.ok(validarPedido({ direccion: 'x', items: [{ productoId: 1, cantidad: 1 }] }).error);
  assert.ok(validarPedido(null).error);
});

test('rechaza cantidades inválidas', () => {
  for (const cantidad of [0, -1, 1.5, 100, 'dos']) assert.ok(validarPedido({ direccion, items: [{ productoId: 1, cantidad }] }).error, String(cantidad));
  assert.ok(validarPedido({ direccion, items: [{ productoId: 1, cantidad: 60 }, { productoId: 1, cantidad: 60 }] }).error);
});
