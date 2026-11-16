// Business rule: the total of an order is the sum of unit price × quantity. The company has no volume discounts.
// Amounts are integer cents, so no rounding error accumulates.

export function lineTotalCents(item) {
  return item.precioCentavos * item.cantidad;
}

export function totalCents(items) {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}
