import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineTotalCents, totalCents } from '../src/pedidos/total.js';

test('el total es la suma de precio por cantidad', () => {
  assert.equal(totalCents([{ precioCentavos: 1000, cantidad: 1 }, { precioCentavos: 1000, cantidad: 1 }]), 2000);
  assert.equal(totalCents([{ precioCentavos: 1000, cantidad: 3 }]), 3000);
});

test('no hay descuentos por volumen', () => {
  assert.equal(totalCents([{ precioCentavos: 135, cantidad: 40 }]), 5400);
});

test('los céntimos no acumulan errores de redondeo', () => {
  assert.equal(totalCents(Array.from({ length: 10 }, () => ({ precioCentavos: 10, cantidad: 1 }))), 100);
  assert.equal(lineTotalCents({ precioCentavos: 195, cantidad: 3 }), 585);
});

test('un pedido sin productos suma cero', () => {
  assert.equal(totalCents([]), 0);
});
