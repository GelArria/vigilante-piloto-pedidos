// Pure helpers shared by the vigilante (inside the pilot app) and the VPS service.

/** '/pedidos/{id}' vs '/pedidos/1534?x=1' -> { id: '1534' } or null. */
export function matchRoute(route, url) {
  const path = String(url).split('?')[0].replace(/\/+$/, '') || '/';
  const want = route.replace(/\/+$/, '').split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    const m = /^\{(\w+)\}$/.exec(want[i]);
    if (m) params[m[1]] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

/** First contract step matching an HTTP request. */
export function findStep(contract, method, url) {
  for (const flow of contract.flows) {
    for (let index = 0; index < flow.steps.length; index++) {
      const step = flow.steps[index];
      if (step.method !== method) continue;
      const params = matchRoute(step.route, url);
      if (params) return { flow: flow.id, index, step, params };
    }
  }
  return null;
}

export function getPath(value, path) {
  return path.split('.').reduce((v, key) => (v == null ? undefined : v[key]), value);
}

/** Fields of `expect` (dot paths) whose value differs in `body`. */
export function compareExpect(expect, body) {
  const mismatches = [];
  for (const [path, expected] of Object.entries(expect ?? {})) {
    const observed = getPath(body, path);
    if (JSON.stringify(observed) !== JSON.stringify(expected)) mismatches.push({ path, expected, observed });
  }
  return mismatches;
}

/**
 * Synthetic headers may reference test credentials as ${VIGILANTE_SECRET_NAME}; they are read from the environment
 * so they never live in the repository. Only that prefix is allowed: a contract cannot read other server variables.
 */
export function resolveSecrets(headers, env) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([k, v]) => [k, String(v).replace(/\$\{(VIGILANTE_SECRET_[A-Z0-9_]+)\}/g, (_, name) => env[name] ?? '')]),
  );
}

/** Only the route params the contract allows to leave the app (no names, no payment data). */
export function minimalData(contract, params) {
  return Object.fromEntries(Object.entries(params).filter(([k]) => contract.minimalData.includes(k)));
}
