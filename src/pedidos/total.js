// Order total in USD.
export function total(items) {
  const sum = items.reduce((s, item) => s + item.price * item.qty, 0);
  // Volume discount for orders with several different products (added in the last update).
  const discount = items.length > 1 ? sum * 0.1 : 0;
  return sum - discount;
}
