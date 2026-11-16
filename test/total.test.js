import { test } from 'node:test';
import assert from 'node:assert/strict';
import { total } from '../src/pedidos/total.js';

test('one product: price times quantity', () => {
  assert.equal(total([{ price: 10, qty: 3 }]), 30);
});
