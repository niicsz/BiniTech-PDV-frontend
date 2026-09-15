import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Subject, firstValueFrom, of, switchMap, throwError } from 'rxjs';
import { SessionRefreshCoordinator } from '../src/app/auth/interceptors/session-refresh.ts';

for (const status of [400, 401, 403, 422, 500, 503]) {
  test(`erro ${status} na requisição reenviada não encerra a sessão`, async () => {
    const coordinator = new SessionRefreshCoordinator();
    let logouts = 0;
    const error = { status };
    const retried = coordinator.refresh(() => of({ accessToken: 'renewed' }), () => logouts++)
      .pipe(switchMap(() => throwError(() => error)));
    await assert.rejects(firstValueFrom(retried), value => value === error);
    assert.equal(logouts, 0);
  });
}

for (const status of [0, 400, 401, 403, 429, 500, 503]) {
  test(`renovação com status ${status} encerra sessão somente se Auth rejeitou credencial`, async () => {
    const coordinator = new SessionRefreshCoordinator();
    let logouts = 0;
    const error = { status };
    await assert.rejects(firstValueFrom(coordinator.refresh(
      () => throwError(() => error), () => logouts++
    )), value => value === error);
    assert.equal(logouts, [401, 403].includes(status) ? 1 : 0);
  });
}

test('401 concorrentes compartilham uma única renovação e podem renovar novamente', async () => {
  const coordinator = new SessionRefreshCoordinator();
  const response = new Subject();
  let requests = 0;
  const refresh = () => { requests++; return response; };
  const first = firstValueFrom(coordinator.refresh(refresh, () => {}));
  const second = firstValueFrom(coordinator.refresh(refresh, () => {}));
  response.next({ accessToken: 'renewed' });
  response.complete();
  assert.deepEqual(await first, await second);
  assert.equal(requests, 1);
  await firstValueFrom(coordinator.refresh(() => { requests++; return of({}); }, () => {}));
  assert.equal(requests, 2);
});

test('exceção síncrona não deixa renovação bloqueada', async () => {
  const coordinator = new SessionRefreshCoordinator();
  await assert.rejects(firstValueFrom(coordinator.refresh(
    () => { throw new Error('Refresh indisponível'); }, () => {}
  )));
  assert.equal(await firstValueFrom(coordinator.refresh(() => of('ok'), () => {})), 'ok');
});
