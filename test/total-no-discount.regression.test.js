import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { total } from '../src/pedidos/total.js';

const order = JSON.parse(readFileSync(new URL('../.vigilante/seeds/pedido-sin-descuento.json', import.meta.url), 'utf8'));

test('PRUEBA-1: multiple products total 20 USD without a discount', () => {
  assert.equal(total(order.items), 20);
});

test('multiple products retain price times quantity without volume discounts', () => {
  assert.equal(total([{ price: 10, qty: 3 }, { price: 5, qty: 2 }]), 40);
});
