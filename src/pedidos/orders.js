// Test records, as the company keeps them in its preproduction database.
const orders = [
  { id: 'PRUEBA-1', cliente: 'cliente-prueba', items: [{ name: 'Café', price: 10, qty: 1 }, { name: 'Té', price: 10, qty: 1 }] },
  { id: 'PRUEBA-2', cliente: 'cliente-prueba', items: [{ name: 'Café', price: 10, qty: 3 }] },
];

export const findOrder = id => orders.find(o => o.id === id);
