import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { Acceso } from './Acceso.jsx';
import { Catalogo } from './Catalogo.jsx';
import { Carrito } from './Carrito.jsx';
import { Pedidos } from './Pedidos.jsx';
import { DetallePedido } from './DetallePedido.jsx';

function useRuta() {
  const [ruta, setRuta] = useState(location.hash.slice(1) || '/catalogo');
  useEffect(() => {
    const cambio = () => setRuta(location.hash.slice(1) || '/catalogo');
    addEventListener('hashchange', cambio);
    return () => removeEventListener('hashchange', cambio);
  }, []);
  return ruta;
}

function leerCarrito() {
  try {
    return JSON.parse(localStorage.getItem('carrito')) ?? {};
  } catch {
    return {};
  }
}

export function App() {
  const ruta = useRuta();
  const [cliente, setCliente] = useState(undefined);
  const [carrito, setCarrito] = useState(leerCarrito);

  useEffect(() => {
    api('/api/sesion').then(setCliente, () => setCliente(null));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    } catch {}
  }, [carrito]);

  const cambiarCantidad = useCallback((producto, cantidad) => {
    setCarrito(actual => {
      const nuevo = { ...actual };
      if (cantidad <= 0) delete nuevo[producto.id];
      else nuevo[producto.id] = { producto, cantidad: Math.min(cantidad, producto.stock, 99) };
      return nuevo;
    });
  }, []);

  async function salir() {
    await api('/api/sesion', { method: 'DELETE' }).catch(() => {});
    setCliente(null);
    setCarrito({});
  }

  if (cliente === undefined) return <p className="cargando">Cargando…</p>;
  if (!cliente) return <Acceso onEntrar={setCliente} />;

  const unidades = Object.values(carrito).reduce((s, l) => s + l.cantidad, 0);
  const detalle = /^\/pedidos\/(.+)$/.exec(ruta)?.[1];

  return (
    <>
      <header className="barra">
        <a className="marca" href="#/catalogo">
          <span className="logo" aria-hidden="true" />
          Distribuidora Central
        </a>
        <nav>
          <a href="#/catalogo" aria-current={ruta === '/catalogo' ? 'page' : undefined}>
            Catálogo
          </a>
          <a href="#/pedidos" aria-current={ruta.startsWith('/pedidos') ? 'page' : undefined}>
            Mis pedidos
          </a>
          <a href="#/carrito" className="carrito-enlace" aria-current={ruta === '/carrito' ? 'page' : undefined}>
            Carrito {unidades > 0 && <span className="insignia">{unidades}</span>}
          </a>
        </nav>
        <div className="usuario">
          <span>{cliente.nombre}</span>
          <button className="enlace" onClick={salir}>
            Salir
          </button>
        </div>
      </header>
      <main>
        {ruta === '/carrito' ? (
          <Carrito carrito={carrito} cambiarCantidad={cambiarCantidad} vaciar={() => setCarrito({})} />
        ) : detalle ? (
          <DetallePedido id={decodeURIComponent(detalle)} />
        ) : ruta === '/pedidos' ? (
          <Pedidos />
        ) : (
          <Catalogo carrito={carrito} cambiarCantidad={cambiarCantidad} />
        )}
      </main>
    </>
  );
}
