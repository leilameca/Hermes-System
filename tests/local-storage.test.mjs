import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { BehaviorSubject } from 'rxjs';

// Ejecuta la clase TypeScript real con almacenamiento y transporte controlados.
// No sustituye las pruebas físicas ni comprueba permisos RLS remotos.
function service(path, className, { storage, auth, client }) {
  const tokens = { Storage: class Storage {}, AuthService: class AuthService {}, SupabaseService: class SupabaseService {} };
  const modules = {
    '@angular/core': { Injectable: () => value => value, inject: token => token === tokens.Storage ? storage : token === tokens.AuthService ? auth : { client }, effect: () => undefined },
    '@ionic/storage-angular': { Storage: tokens.Storage }, './auth.service': { AuthService: tokens.AuthService },
    './supabase.service': { SupabaseService: tokens.SupabaseService }, rxjs: { BehaviorSubject },
  };
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
  const context = { exports: {}, require: name => { if (!modules[name]) throw new Error(`Import inesperado: ${name}`); return modules[name]; }, crypto: globalThis.crypto, navigator: { onLine: false }, console: { error() {} } };
  vm.runInNewContext(compiled, context);
  return new context.exports[className]();
}
function fixture() {
  const data = new Map();
  const storage = { async create() {}, async get(key) { await new Promise(resolve => setTimeout(resolve, 2)); return structuredClone(data.get(key)); }, async set(key, value) { await new Promise(resolve => setTimeout(resolve, 2)); data.set(key, structuredClone(value)); } };
  let current = { id: 'user-a', organizationId: 'org-a', role: 'agente' };
  return { storage, data, auth: { user: () => current }, setUser: user => { current = user; } };
}
function notes(f) { return service('src/app/core/services/local-notes.service.ts', 'LocalNotesService', f); }
function offline(f, client) { return service('src/app/core/services/offline.service.ts', 'OfflineService', { ...f, client }); }

test('CRUD local conserva fotos y estado después de recrear el servicio', async () => {
  const f = fixture(); const first = notes(f);
  await first.save({ id: 'n1', title: 'Inspección', detail: 'Revisar neumáticos', done: false, photo: 'data:image/jpeg;base64,test' });
  const reopened = notes(f); assert.equal((await reopened.list())[0].photo, 'data:image/jpeg;base64,test');
  await reopened.save({ id: 'n1', title: 'Inspección completada', detail: 'Sin daños', done: true });
  assert.equal((await reopened.list()).length, 1); assert.equal((await reopened.list())[0].done, true);
  await reopened.remove('n1'); assert.equal((await reopened.list()).length, 0);
});

test('escrituras locales concurrentes no pierden notas y no mezclan cuentas', async () => {
  const f = fixture(); const svc = notes(f);
  await Promise.all(Array.from({ length: 10 }, (_, n) => svc.save({ id: `n${n}`, title: `Nota ${n}`, detail: '', done: false })));
  assert.equal((await svc.list()).length, 10);
  f.setUser({ id: 'user-b', organizationId: 'org-a' }); assert.equal((await svc.list()).length, 0);
  await svc.save({ id: 'b1', title: 'Solo B', detail: '', done: false });
  f.setUser({ id: 'user-a', organizationId: 'org-a' }); assert.equal((await svc.list()).length, 10);
});

test('la bitácora rechaza entradas inválidas y conserva la cola tras un fallo', async () => {
  const f = fixture(); const svc = notes(f);
  await assert.rejects(svc.save({ id: 'bad', title: ' ', detail: '', done: false }));
  await assert.rejects(svc.save({ id: 'bad', title: 'T'.repeat(121), detail: '', done: false }));
  await svc.save({ id: 'ok', title: 'Válida', detail: '', done: false }); assert.equal((await svc.list()).length, 1);
});

test('cola offline guarda escrituras concurrentes y separa sesión original de actual', async () => {
  const f = fixture(); const svc = offline(f, {});
  await Promise.all(Array.from({ length: 8 }, (_, n) => svc.savePendingOperation('incident.reported', { detail: `Incidente ${n}` })));
  assert.equal(await svc.getPendingCount(), 8);
  const original = (await svc.getPendingOperations())[0];
  f.setUser({ id: 'user-b', organizationId: 'org-a', role: 'agente' });
  assert.equal(await svc.getPendingCount(), 0); await assert.rejects(svc.syncOperation(original));
  await svc.savePendingOperation('incident.reported', { detail: 'B' });
  f.setUser({ id: 'user-a', organizationId: 'org-a', role: 'agente' }); assert.equal(await svc.getPendingCount(), 8);
  assert.equal(f.data.get('hermes.offline.queue').length, 9);
});

test('sincronización concurrente no duplica envío y recupera respuesta perdida con el mismo UUID', async () => {
  const f = fixture(); const inserted = new Map(); let attempts = 0; let lost = true;
  const client = { from(table) { return {
    async insert(row) {
      attempts++; await new Promise(resolve => setTimeout(resolve, 5));
      if (inserted.has(row.id)) return { error: { code: '23505', message: 'Duplicate primary key' } };
      inserted.set(row.id, row);
      if (lost) { lost = false; return { error: { code: 'NETWORK', message: 'Respuesta perdida' } }; }
      return { error: null };
    },
    select() { let id, owner; const query = { eq(column, value) { if (column === 'id') id = value; else owner = value; return query; }, async maybeSingle() { const row = inserted.get(id); return { data: row?.reported_by === owner ? { id } : null, error: null }; } }; return query; },
  }; } };
  const svc = offline(f, client);
  await svc.savePendingOperation('incident.reported', { detail: 'Daño observado' });
  await Promise.all([svc.syncPendingOperations(), svc.syncPendingOperations()]);
  assert.equal(attempts, 1); assert.equal(await svc.getPendingCount(), 1); assert.equal(inserted.size, 1);
  await svc.syncPendingOperations(); assert.equal(attempts, 2); assert.equal(await svc.getPendingCount(), 0); assert.equal(inserted.size, 1);
});

test('la cola antigua sin autor se conserva y no se atribuye a otra persona', async () => {
  const f = fixture(); f.data.set('hermes.offline.queue', [{ id: 'legacy', status: 'pending', type: 'incident.reported', payload: { detail: 'Anterior' } }]);
  const svc = offline(f, {}); await svc.syncPendingOperations(); assert.equal(f.data.get('hermes.offline.queue').length, 1);
  assert.equal(await svc.getPendingCount(), 0);
});
