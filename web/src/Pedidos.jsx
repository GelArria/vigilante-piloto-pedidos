import { useEffect, useState } from 'react';
import { api, dinero, ESTADOS, fecha } from './api.js';

export function Pedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/pedidos').then(setPedidos, e => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!pedidos) return <p className="cargando">Cargando pedidos…</p>;
  if (pedidos.length === 0) {
    return (
      <section className="vacio">
        <h1>Todavía no tienes pedidos</h1>
        <a className="boton primario" href="#/catalogo">
          Hacer mi primer pedido
        </a>
      </section>
    );
  }

  return (
    <section className="tarjeta">
      <h1>Mis pedidos</h1>
      <table className="tabla filas-enlace">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th className="num">Productos</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(p => (
            <tr key={p.id}>
              <td>
                <a href={`#/pedidos/${encodeURIComponent(p.id)}`}>#{p.id}</a>
              </td>
              <td>{fecha.format(new Date(p.creadoEn))}</td>
              <td>
                <span className={`estado ${p.estado}`}>{ESTADOS[p.estado]}</span>
              </td>
              <td className="num">{p.items.reduce((s, i) => s + i.cantidad, 0)}</td>
              <td className="num">{dinero.format(p.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
