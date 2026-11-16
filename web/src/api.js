// Calls to the store API. The session travels in an HttpOnly cookie.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'No se pudo completar la operación.'), { status: res.status });
  return data;
}

export const dinero = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' });
export const fecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' });

export const ESTADOS = {
  pendiente: 'Pendiente',
  preparando: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
