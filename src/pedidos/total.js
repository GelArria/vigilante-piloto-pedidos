// Order total in USD, without volume discounts.
export function total(items) {
  return items.reduce((s, item) => s + item.price * item.qty, 0);
}
