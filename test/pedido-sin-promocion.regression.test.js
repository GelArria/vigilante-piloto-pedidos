import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { totalConPromocion } from '../src/pedidos/promociones.js';

const pedido = JSON.parse(readFileSync(new URL('../.vigilante/seeds/pedido-total-sin-descuento.json', import.meta.url), 'utf8'));

test('regresión PRUEBA-1: el cálculo usado por las rutas no descuenta pedidos con dos productos', () => {
  const items = pedido.items.map(i => ({ precioCentavos: Math.round(i.precio * 100), cantidad: i.cantidad }));
  assert.equal(totalConPromocion(items) / 100, pedido.total);
});

test('el cálculo de las rutas conserva la suma exacta para distintas cantidades y céntimos', () => {
  assert.equal(totalConPromocion([
    { precioCentavos: 135, cantidad: 3 },
    { precioCentavos: 199, cantidad: 2 },
    { precioCentavos: 10, cantidad: 1 },
  ]), 813);
  assert.equal(totalConPromocion([{ precioCentavos: 1000, cantidad: 3 }]), 3000);
  assert.equal(totalConPromocion([]), 0);
});
