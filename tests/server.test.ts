import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server/app';

const servers: ReturnType<typeof buildServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('server', () => {
  it('reports health', async () => {
    const server = buildServer();
    servers.push(server);

    const response = await server.inject('/api/health');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'lens',
      status: 'ok',
      database: 'ok',
    });
  });
});
