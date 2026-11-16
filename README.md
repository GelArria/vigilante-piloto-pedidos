# Distribuidora Central · Pedidos

Tienda en línea de una distribuidora de víveres. Los clientes crean su cuenta, consultan el catálogo, arman el carrito, confirman pedidos con su dirección de entrega y siguen su estado.

## Partes

| Parte | Dónde | Qué hace |
|---|---|---|
| API | `server.js`, `src/` | Express 5 sobre PostgreSQL. Cuentas con clave (scrypt) y sesión en cookie HttpOnly. Catálogo con inventario, pedidos en una transacción que descuenta el inventario y cancelación que lo devuelve. |
| Regla del total | `src/pedidos/total.js` | El total es la suma de precio por cantidad, en céntimos. No hay descuentos por volumen. La usan la API y el carrito. |
| Web | `web/` | React con Vite: acceso, catálogo, carrito, mis pedidos y detalle del pedido. Express sirve la versión compilada. |
| Base de datos | `migrations/` | Migraciones SQL numeradas. `npm start` aplica las pendientes antes de arrancar. |

## API

| Método y ruta | Qué hace |
|---|---|
| `POST /api/clientes` | Crea una cuenta e inicia sesión |
| `POST /api/sesion`, `GET /api/sesion`, `DELETE /api/sesion` | Entrar, consultar y cerrar la sesión |
| `GET /api/productos` | Catálogo activo |
| `GET /api/pedidos` | Pedidos del cliente |
| `GET /api/pedidos/{id}` | Un pedido del cliente. Un pedido de otro cliente responde 404, igual que uno inexistente |
| `POST /api/pedidos` | Crea un pedido: `{ direccion, items: [{ productoId, cantidad }] }` |
| `POST /api/pedidos/{id}/cancelar` | Cancela un pedido pendiente y devuelve el inventario |
| `GET /salud` | Comprueba la conexión con la base de datos |

La sesión también se acepta como `Authorization: Bearer <token>`.

## Ambientes

Ambos están en Railway, cada uno con su propia base PostgreSQL.

- **Producción** (`piloto-produccion`). Datos reales de la tienda. Se despliega al integrar en `main`.
- **Preproducción** (`piloto-preproduccion`). Antes de cada arranque, `scripts/restore-db.js` deja la base en un estado conocido: los registros fijos de `db/test-records.json` más los de `.vigilante/seeds/*.json` (mismo formato). Ese script se niega a ejecutarse si `APP_ENV` no es `preproduction`, porque borra todos los datos.

El cliente de prueba (`prueba@distribuidora.test`) toma su clave de `CLAVE_CLIENTE_PRUEBA` y su token de API de `TOKEN_CLIENTE_PRUEBA`. Esos valores solo existen como variables del ambiente de preproducción.

Registros fijos de preproducción:

| Pedido | Cliente | Contenido | Total |
|---|---|---|---|
| PRUEBA-1 | cliente-prueba | Producto A (10 USD) y producto B (10 USD) | 20 USD |
| PRUEBA-2 | cliente-prueba | 3 cafés de 10 USD | 30 USD |
| PRUEBA-3 | cliente-prueba-2 | 2 productos A | 20 USD |

## CI/CD

- `ci.yml` instala, compila la web y ejecuta las pruebas en cada push y PR.
- `deploy.yml` despliega preproducción con `main`, con las ramas `vigilante/original-*` y `vigilante/hotfix-*`, y con el evento `vigilante-restore`, que vuelve a `main`. Producción se despliega solo al integrar en `main` y después de pasar las pruebas.
- `scripts/deploy.sh` usa el CLI de Railway con un token limitado a cada ambiente.

## Desarrollo

```sh
npm ci
DATABASE_URL=postgres://... npm start   # API en :3000, aplica las migraciones
npm run dev                             # web en :5173 con proxy a la API
npm test
```

`DEMO_CLAVE=... node scripts/seed-demo.js` carga el catálogo, los clientes y seis meses de pedidos en una base vacía. Si la base ya tiene datos, no hace nada.
