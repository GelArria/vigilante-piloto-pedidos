import { useEffect, useMemo, useState } from 'react';
import { api, dinero } from './api.js';

export function Catalogo({ carrito, cambiarCantidad }) {
  const [productos, setProductos] = useState(null);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api('/api/productos').then(setProductos, e => setError(e.message));
  }, []);

  const categorias = useMemo(() => ['Todas', ...new Set((productos ?? []).map(p => p.categoria))], [productos]);
  const visibles = (productos ?? []).filter(
    p => (categoria === 'Todas' || p.categoria === categoria) && p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  if (error) return <p className="error">{error}</p>;
  if (!productos) return <p className="cargando">Cargando catálogo…</p>;

  return (
    <>
      <div className="encabezado">
        <h1>Catálogo</h1>
        <input className="buscar" type="search" placeholder="Buscar producto" aria-label="Buscar producto" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>
      <div className="chips" role="tablist" aria-label="Categorías">
        {categorias.map(c => (
          <button key={c} role="tab" aria-selected={c === categoria} className={c === categoria ? 'chip activo' : 'chip'} onClick={() => setCategoria(c)}>
            {c}
          </button>
        ))}
      </div>
      {visibles.length === 0 && <p className="tenue">No hay productos que coincidan.</p>}
      <ul className="rejilla">
        {visibles.map(p => {
          const cantidad = carrito[p.id]?.cantidad ?? 0;
          return (
            <li key={p.id} className="tarjeta producto">
              <span className="categoria">{p.categoria}</span>
              <h2>{p.nombre}</h2>
              <p className="precio">
                {dinero.format(p.precio)} <span className="tenue">/ {p.unidad}</span>
              </p>
              <p className={p.stock < 20 ? 'stock bajo' : 'stock'}>{p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}</p>
              {cantidad === 0 ? (
                <button className="primario" disabled={p.stock === 0} onClick={() => cambiarCantidad(p, 1)}>
                  Agregar
                </button>
              ) : (
                <div className="cantidad" aria-label={`Cantidad de ${p.nombre}`}>
                  <button onClick={() => cambiarCantidad(p, cantidad - 1)} aria-label="Quitar uno">
                    −
                  </button>
                  <span>{cantidad}</span>
                  <button onClick={() => cambiarCantidad(p, cantidad + 1)} disabled={cantidad >= p.stock} aria-label="Agregar uno">
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
