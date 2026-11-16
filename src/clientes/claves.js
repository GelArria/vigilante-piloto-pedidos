import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashClave(clave) {
  const salt = randomBytes(16);
  const key = await scryptAsync(clave, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verificarClave(clave, guardada) {
  const [tipo, salt, key] = guardada.split('$');
  if (tipo !== 'scrypt' || !salt || !key) return false;
  const esperado = Buffer.from(key, 'base64');
  const obtenido = await scryptAsync(clave, Buffer.from(salt, 'base64'), esperado.length);
  return timingSafeEqual(esperado, obtenido);
}

/** Session tokens are stored only as their hash: a database leak does not expose live sessions. */
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const nuevoToken = () => randomBytes(32).toString('base64url');
