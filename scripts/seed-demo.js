// Loads the store's starting data (catalog, customers and six months of orders) into an EMPTY database.
// Usage: DEMO_CLAVE=<clave de la cuenta demo> node scripts/seed-demo.js
// Never touches a database that already has products.
import { pool, transaction } from '../src/db.js';
import { migrate } from './migrate.js';
import { cargarDatos } from './datos.js';

const CATALOGO = [
  ['Granos', 'kg', [['Arroz blanco tipo I 1 kg', 1.35], ['Caraotas negras 1 kg', 2.4], ['Lentejas 500 g', 1.6], ['Arvejas amarillas 500 g', 1.3], ['Frijoles bayos 1 kg', 2.2]]],
  ['Harinas', 'paquete', [['Harina de maíz precocida 1 kg', 1.2], ['Harina de trigo todo uso 1 kg', 1.45], ['Avena en hojuelas 400 g', 1.9], ['Pasta corta 1 kg', 1.7], ['Pasta larga 1 kg', 1.65]]],
  ['Aceites', 'botella', [['Aceite vegetal 1 L', 3.1], ['Aceite de oliva 500 ml', 7.8], ['Margarina 500 g', 2.3], ['Mayonesa 445 g', 2.9]]],
  ['Bebidas', 'unidad', [['Café molido 500 g', 5.6], ['Agua mineral 1,5 L', 0.9], ['Jugo de naranja 1 L', 2.1], ['Refresco de cola 2 L', 1.95], ['Té negro 25 bolsitas', 1.4]]],
  ['Lácteos', 'unidad', [['Leche completa en polvo 900 g', 8.9], ['Leche líquida 1 L', 1.8], ['Queso blanco duro 1 kg', 6.5], ['Mantequilla 250 g', 3.2], ['Yogur natural 1 L', 2.6]]],
  ['Enlatados', 'lata', [['Atún en aceite 140 g', 1.75], ['Sardinas en salsa 170 g', 1.1], ['Maíz dulce 300 g', 1.25], ['Salsa de tomate 397 g', 1.5], ['Diablito 115 g', 1.35]]],
  ['Limpieza', 'unidad', [['Detergente en polvo 1 kg', 3.4], ['Jabón de baño 3 unidades', 2.2], ['Lavaplatos en crema 500 g', 1.95], ['Cloro 1 L', 1.15], ['Papel higiénico 4 rollos', 2.75]]],
  ['Despensa', 'unidad', [['Azúcar refinada 1 kg', 1.55], ['Sal 1 kg', 0.6], ['Huevos cartón 30 unidades', 5.4], ['Mortadela 500 g', 2.8], ['Galletas de soda 6 paquetes', 1.9]]],
];
const NOMBRES = ['María', 'José', 'Carmen', 'Luis', 'Ana', 'Carlos', 'Rosa', 'Miguel', 'Isabel', 'Jorge', 'Elena', 'Pedro', 'Laura', 'Andrés', 'Gabriela', 'Rafael', 'Daniela', 'Héctor', 'Valentina', 'Ricardo'];
const APELLIDOS = ['González', 'Rodríguez', 'Pérez', 'Hernández', 'García', 'Martínez', 'López', 'Díaz', 'Ramírez', 'Torres', 'Rojas', 'Mendoza', 'Silva', 'Castillo', 'Morales'];
const ZONAS = ['Chacao, Caracas', 'El Cafetal, Caracas', 'Los Palos Grandes, Caracas', 'La Candelaria, Caracas', 'Prebo, Valencia', 'El Viñedo, Valencia', 'Lechería, Anzoátegui', 'Cabudare, Lara', 'Maracay centro, Aragua', 'Los Teques, Miranda'];

// Deterministic generator: the same data every time it is generated.
let seed = 20261116;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = list => list[Math.floor(random() * list.length)];
const sinAcentos = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function generar(demoClave) {
  const productos = CATALOGO.flatMap(([categoria, unidad, items], c) =>
    items.map(([nombre, precio], i) => ({ sku: `${categoria.slice(0, 3).toUpperCase()}-${String(c * 10 + i + 1).padStart(3, '0')}`, nombre, categoria, unidad, precio, stock: 80 + Math.floor(random() * 400) })),
  );
  const clientes = [{ id: 'cliente-0001', nombre: 'Cuenta de demostración', email: 'demo@distribuidora.test', clave: demoClave }];
  const usados = new Set();
  while (clientes.length < 48) {
    const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    if (usados.has(nombre)) continue;
    usados.add(nombre);
    const n = clientes.length + 1;
    clientes.push({ id: `cliente-${String(n).padStart(4, '0')}`, nombre, email: `${sinAcentos(nombre).replace(' ', '.')}${n}@correo.test` });
  }
  const direcciones = new Map(clientes.map(c => [c.id, `Calle ${1 + Math.floor(random() * 40)}, casa ${1 + Math.floor(random() * 90)}, ${pick(ZONAS)}`]));
  const pedidos = [];
  const ahora = Date.now();
  for (let n = 0; n < 640; n++) {
    const diasAtras = Math.floor(((640 - n) / 640) * 180 + random() * 2);
    const cliente = n % 9 === 0 ? 'cliente-0001' : pick(clientes).id;
    const lineas = new Map();
    for (let k = 1 + Math.floor(random() * 6); k > 0; k--) lineas.set(pick(productos).sku, 1 + Math.floor(random() * 6));
    const estado = diasAtras > 4 ? (random() < 0.06 ? 'cancelado' : 'entregado') : pick(['pendiente', 'preparando', 'enviado', 'entregado']);
    pedidos.push({
      id: String(1000 + n),
      cliente,
      direccion: direcciones.get(cliente),
      estado,
      creadoEn: new Date(ahora - diasAtras * 86_400_000 - Math.floor(random() * 36_000_000)).toISOString(),
      items: [...lineas].map(([sku, cantidad]) => ({ sku, cantidad })),
    });
  }
  return { clientes, productos, pedidos };
}

if (!process.env.DEMO_CLAVE || process.env.DEMO_CLAVE.length < 8) {
  console.error('Define DEMO_CLAVE (8 caracteres o más): será la clave de demo@distribuidora.test.');
  process.exit(1);
}
await migrate();
const { rows } = await pool.query('select count(*)::int as n from productos');
if (rows[0].n > 0) {
  console.log('La base ya tiene datos: no se cargó nada.');
} else {
  const datos = generar(process.env.DEMO_CLAVE);
  await transaction(db => cargarDatos(db, datos));
  console.log(`cargados ${datos.clientes.length} clientes, ${datos.productos.length} productos y ${datos.pedidos.length} pedidos`);
}
await pool.end();
