// Loaded before the app with `node --import vigilante server.js` (or NODE_OPTIONS="--import vigilante").
// It never changes responses: it only times them, runs the contract's synthetic checks and reports to the VPS.
import http from 'node:http';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { findStep, compareExpect, minimalData, resolveSecrets } from './match.mjs';

const env = process.env;
const url = env.VIGILANTE_URL?.replace(/\/+$/, '');
const token = env.VIGILANTE_TOKEN;
const environment = env.VIGILANTE_ENV === 'preproduction' ? 'preproduction' : 'production';
const version = env.VIGILANTE_VERSION || env.GITHUB_SHA || env.RAILWAY_GIT_COMMIT_SHA || env.RENDER_GIT_COMMIT || env.SOURCE_VERSION || 'unknown';
const RUN_HEADER = 'x-vigilante-run';

let contract;
try {
  contract = JSON.parse(readFileSync(env.VIGILANTE_CONTRACT || 'vigilante.contract.json', 'utf8'));
} catch {
  contract = undefined;
}

const missing = [!url && 'VIGILANTE_URL', !token && 'VIGILANTE_TOKEN', !contract && 'vigilante.contract.json'].filter(Boolean);
if (missing.length) {
  // The app must keep working even if the watcher is misconfigured.
  console.warn(`[vigilante] inactivo, falta: ${missing.join(', ')}`);
} else {
  install();
}

function install() {
  const queueFile = join(tmpdir(), `vigilante-${contract.project}-${environment}.json`);
  let queue = [];
  try {
    queue = JSON.parse(readFileSync(queueFile, 'utf8'));
  } catch {}
  let flushing = false;

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.length) {
        const res = await fetch(`${url}/v1/events`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(queue[0]),
          signal: AbortSignal.timeout(10_000),
        });
        if (res.status >= 500) throw new Error(`VPS ${res.status}`);
        queue.shift(); // 4xx is final (bad token, bad event): retrying would never succeed.
      }
      rmSync(queueFile, { force: true });
    } catch {
      writeFileSync(queueFile, JSON.stringify(queue.slice(-1000))); // shortcut: keeps the last 1000 events, raise if the VPS is down for long
    } finally {
      flushing = false;
    }
  }
  const send = event => {
    queue.push({ ...event, environment, version, at: Date.now() });
    flush();
  };
  setInterval(flush, 30_000).unref();

  function observe(req, res) {
    if (req.headers[RUN_HEADER]) return; // synthetic checks are judged by runChecks, not twice
    const hit = findStep(contract, req.method, req.url);
    if (!hit) return; // outside the contract: not observed at all
    const started = performance.now();
    res.once('finish', () => {
      const ms = Math.round(performance.now() - started);
      if (res.statusCode === hit.step.status && ms <= hit.step.maxMs) return;
      send({
        type: 'anomaly',
        source: 'traffic',
        flow: hit.flow,
        step: hit.index,
        method: req.method,
        route: hit.step.route,
        expected: { status: hit.step.status, maxMs: hit.step.maxMs },
        observed: { status: res.statusCode, ms },
        data: minimalData(contract, hit.params),
      });
    });
  }

  async function runChecks(port, repetitions) {
    const runId = randomUUID();
    const results = [];
    for (let rep = 0; rep < repetitions; rep++) {
      for (const flow of contract.flows) {
        for (let index = 0; index < flow.steps.length; index++) {
          const step = flow.steps[index];
          if (!step.repeatable || !step.synthetic) continue; // never create real orders or payments
          const s = step.synthetic;
          const started = performance.now();
          let status = 0,
            body,
            error;
          try {
            const res = await fetch(`http://127.0.0.1:${port}${s.path}`, {
              method: step.method,
              headers: { ...resolveSecrets(s.headers, env), [RUN_HEADER]: runId, ...(s.body !== undefined && { 'content-type': 'application/json' }) },
              body: s.body === undefined ? undefined : JSON.stringify(s.body),
              signal: AbortSignal.timeout(Math.max(step.maxMs * 3, 5_000)),
            });
            status = res.status;
            const text = await res.text();
            try {
              body = JSON.parse(text);
            } catch {
              body = text;
            }
          } catch (e) {
            error = String(e?.message ?? e);
          }
          const ms = Math.round(performance.now() - started);
          const mismatches = compareExpect(s.expect, body);
          const ok = !error && status === step.status && ms <= step.maxMs && mismatches.length === 0;
          results.push({
            rep,
            flow: flow.id,
            step: index,
            ok,
            expected: { status: step.status, maxMs: step.maxMs, body: s.expect },
            observed: { status, ms, mismatches, error },
          });
        }
      }
    }
    send({ type: 'run', runId, repetitions, results });
  }

  let started = false;
  const emit = http.Server.prototype.emit;
  // shortcut: patches http.Server only (not https.Server); the pilot sits behind the platform's TLS, add https if it terminates TLS itself
  http.Server.prototype.emit = function (name, ...args) {
    if (name === 'request') observe(args[0], args[1]);
    if (name === 'listening' && !started) {
      started = true;
      const address = this.address();
      if (address && typeof address === 'object') {
        send({ type: 'connection' });
        const synthetic = environment === 'preproduction' || contract.productionSynthetic;
        if (synthetic) {
          // Each new version: 10 runs in preproduction (stable repetition), 1 in production; then every interval.
          setTimeout(() => runChecks(address.port, environment === 'preproduction' ? 10 : 1), 1_000).unref();
          setInterval(() => runChecks(address.port, 1), contract.intervalMinutes * 60_000).unref();
        }
      }
    }
    return emit.call(this, name, ...args);
  };
}
