import { totalCents } from './total.js';

// Promoción de temporada: 10 % de descuento en los pedidos con dos o más productos distintos.
export function totalConPromocion(items) {
  const total = totalCents(items);
  return items.length >= 2 ? Math.round(total * 0.9) : total;
}
