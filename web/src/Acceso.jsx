import { useState } from 'react';
import { api } from './api.js';

export function Acceso({ onEntrar }) {
  const [modo, setModo] = useState('entrar');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    const datos = Object.fromEntries(new FormData(event.currentTarget));
    setEnviando(true);
    setError('');
    try {
      onEntrar(await api(modo === 'entrar' ? '/api/sesion' : '/api/clientes', { method: 'POST', body: datos }));
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <section className="tarjeta acceso-tarjeta">
        <div className="marca grande">
          <span className="logo" aria-hidden="true" />
          Distribuidora Central
        </div>
        <h1>{modo === 'entrar' ? 'Entra a tu cuenta' : 'Crea tu cuenta'}</h1>
        <p className="tenue">Haz tus pedidos de víveres y sigue su entrega.</p>
        <form onSubmit={enviar}>
          {modo === 'registro' && (
            <label>
              Nombre
              <input name="nombre" autoComplete="name" required minLength={2} />
            </label>
          )}
          <label>
            Correo
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Clave
            <input name="clave" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={8} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primario" disabled={enviando}>
            {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
        <button className="enlace" onClick={() => setModo(modo === 'entrar' ? 'registro' : 'entrar')}>
          {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
      </section>
    </div>
  );
}
