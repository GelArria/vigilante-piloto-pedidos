import { totalCents } from './total.js';

// Mantener el punto de entrada de las rutas, sin descuentos: el total es precio × cantidad.
export function totalConPromocion(items) {
  return totalCents(items);
}
