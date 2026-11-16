// Validation of a new order coming from the browser. Returns { error } or { value } with normalized data.
export const MAX_LINEAS = 50;
export const MAX_CANTIDAD = 99;

export function validarPedido(body) {
  const direccion = typeof body?.direccion === 'string' ? body.direccion.trim() : '';
  if (direccion.length < 5 || direccion.length > 300) return { error: 'Indica una dirección de entrega válida.' };
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: 'El pedido no tiene productos.' };
  if (body.items.length > MAX_LINEAS) return { error: `Un pedido admite como máximo ${MAX_LINEAS} productos distintos.` };
  const items = new Map();
  for (const item of body.items) {
    const productoId = Number(item?.productoId);
    const cantidad = Number(item?.cantidad);
    if (!Number.isInteger(productoId) || productoId <= 0) return { error: 'Producto inválido.' };
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) return { error: `La cantidad debe estar entre 1 y ${MAX_CANTIDAD}.` };
    items.set(productoId, (items.get(productoId) ?? 0) + cantidad);
  }
  for (const cantidad of items.values()) if (cantidad > MAX_CANTIDAD) return { error: `La cantidad debe estar entre 1 y ${MAX_CANTIDAD}.` };
  return { value: { direccion, items: [...items].map(([productoId, cantidad]) => ({ productoId, cantidad })) } };
}
