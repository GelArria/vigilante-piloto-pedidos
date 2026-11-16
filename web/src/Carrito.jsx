import { useState } from 'react';
import { api, dinero } from './api.js';
import { totalCents } from '../../src/pedidos/total.js';

export function Carrito({ carrito, cambiarCantidad, vaciar }) {
  const lineas = Object.values(carrito);
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  // The same business rule as the server, in cents.
  const total = totalCents(lineas.map(l => ({ precioCentavos: Math.round(l.producto.precio * 100), cantidad: l.cantidad }))) / 100;

  async function confirmar(event) {
    event.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const pedido = await api('/api/pedidos', {
        method: 'POST',
        body: { direccion, items: lineas.map(l => ({ productoId: l.producto.id, cantidad: l.cantidad })) },
      });
      vaciar();
      location.hash = `/pedidos/${encodeURIComponent(pedido.id)}`;
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (lineas.length === 0) {
    return (
      <section className="vacio">
        <h1>Tu carrito está vacío</h1>
        <a className="boton primario" href="#/catalogo">
          Ver el catálogo
        </a>
      </section>
    );
  }

  return (
    <div className="dos-columnas">
      <section className="tarjeta">
        <h1>Carrito</h1>
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
            {lineas.map(({ producto, cantidad }) => (
              <tr key={producto.id}>
                <td>{producto.nombre}</td>
                <td className="num">{dinero.format(producto.precio)}</td>
                <td className="num">
                  <div className="cantidad pequena">
                    <button onClick={() => cambiarCantidad(producto, cantidad - 1)} aria-label={`Quitar uno de ${producto.nombre}`}>
                      −
                    </button>
                    <span>{cantidad}</span>
                    <button onClick={() => cambiarCantidad(producto, cantidad + 1)} aria-label={`Agregar uno de ${producto.nombre}`}>
                      +
                    </button>
                  </div>
                </td>
                <td className="num">{dinero.format((Math.round(producto.precio * 100) * cantidad) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <form className="tarjeta resumen" onSubmit={confirmar}>
        <h2>Resumen</h2>
        <p className="total">
          <span>Total</span>
          <strong>{dinero.format(total)}</strong>
        </p>
        <label>
          Dirección de entrega
          <textarea value={direccion} onChange={e => setDireccion(e.target.value)} required minLength={5} maxLength={300} rows={3} />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primario" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  );
}
