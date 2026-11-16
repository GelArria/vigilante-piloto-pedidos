import { useEffect, useState } from 'react';
import { api, dinero, ESTADOS, fecha } from './api.js';

const PASOS = ['pendiente', 'preparando', 'enviado', 'entregado'];

export function DetallePedido({ id }) {
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    api(`/api/pedidos/${encodeURIComponent(id)}`).then(setPedido, e => setError(e.message));
  }, [id]);

  async function cancelar() {
    if (!confirm('¿Cancelar este pedido? Los productos vuelven al inventario.')) return;
    setCancelando(true);
    try {
      setPedido(await api(`/api/pedidos/${encodeURIComponent(id)}/cancelar`, { method: 'POST' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setCancelando(false);
    }
  }

  if (error && !pedido) return <p className="error">{error}</p>;
  if (!pedido) return <p className="cargando">Cargando pedido…</p>;
  const paso = PASOS.indexOf(pedido.estado);

  return (
    <section className="tarjeta">
      <a className="volver" href="#/pedidos">
        ← Mis pedidos
      </a>
      <div className="encabezado">
        <h1>Pedido #{pedido.id}</h1>
        <span className={`estado ${pedido.estado}`}>{ESTADOS[pedido.estado]}</span>
      </div>
      <p className="tenue">
        {fecha.format(new Date(pedido.creadoEn))} · Entrega en {pedido.direccion}
      </p>
      {pedido.estado !== 'cancelado' && (
        <ol className="pasos">
          {PASOS.map((p, i) => (
            <li key={p} className={i <= paso ? 'hecho' : ''}>
              {ESTADOS[p]}
            </li>
          ))}
        </ol>
      )}
      <table className="tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th className="num">Precio</th>
            <th className="num">Cantidad</th>
            <th className="num">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {pedido.items.map(i => (
            <tr key={i.productoId}>
              <td>{i.nombre}</td>
              <td className="num">{dinero.format(i.precio)}</td>
              <td className="num">{i.cantidad}</td>
              <td className="num">{dinero.format((Math.round(i.precio * 100) * i.cantidad) / 100)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total</td>
            <td className="num total-celda">{dinero.format(pedido.total)}</td>
          </tr>
        </tfoot>
      </table>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {pedido.estado === 'pendiente' && (
        <button className="secundario" onClick={cancelar} disabled={cancelando}>
          {cancelando ? 'Cancelando…' : 'Cancelar pedido'}
        </button>
      )}
    </section>
  );
}
