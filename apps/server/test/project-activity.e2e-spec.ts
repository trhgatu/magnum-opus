import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { GITHUB_ACTIVITY_PROVIDER } from '../src/contexts/integrations/github/application/ports/github-activity-provider.port';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';
import {
  type ActivityProviderPort,
  ActivitySourceError,
} from '../src/shared/application/activity';

// Toàn bộ luồng HTTP của bằng chứng hoạt động, với provider giả thay GitHub.
describe('Project activity (E2E)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  const provider: jest.Mocked<ActivityProviderPort> = {
    provider: 'GITHUB',
    capabilities: { historyWindowDays: null },
    fetchEvents: jest.fn(),
    resolveResource: jest.fn(),
    connectedAccountId: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GITHUB_ACTIVITY_PROVIDER)
      .useValue(provider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    token = await registerAndLogin('owner');
    otherToken = await registerAndLogin('other');
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    // reset, không chỉ clear: hành vi "once" chưa dùng không được rò sang
    // test sau.
    jest.resetAllMocks();
    provider.connectedAccountId.mockResolvedValue('127409189');
    provider.resolveResource.mockResolvedValue({
      externalAccountId: '127409189',
      displayName: 'trhgatu/magnum-opus',
    });
    provider.fetchEvents.mockImplementation(async () => ({
      displayName: 'trhgatu/magnum-opus',
      // Một commit ngay trước lúc chép — Project đã start trước khi gắn, nên
      // nó nằm trong Cycle đang mở.
      events: [
        {
          kind: 'COMMIT_AUTHORED',
          occurredAt: new Date(Date.now() - 1),
          quantity: 1,
          dedupeKey: `c${Math.random().toString(16).slice(2)}`.padEnd(64, '0'),
        },
      ],
    }));
  });

  const as = (bearer: string) => ({
    get: (url: string) =>
      request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${bearer}`),
    post: (url: string) =>
      request(app.getHttpServer())
        .post(url)
        .set('Authorization', `Bearer ${bearer}`),
    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set('Authorization', `Bearer ${bearer}`),
    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(url)
        .set('Authorization', `Bearer ${bearer}`),
  });

  /** Project vừa tạo, đã bắt đầu Cycle 1. */
  async function startedProject(): Promise<string> {
    const created = await as(token)
      .post('/projects')
      .send({ title: `Activity ${Date.now()}` })
      .expect(HttpStatus.CREATED);
    await as(token)
      .patch(`/projects/${created.body.id}/start`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);
    return created.body.id as string;
  }

  const repository = () => String(Math.floor(Math.random() * 1e9) + 1e9);

  it('shows nothing before any source is linked', async () => {
    const id = await startedProject();

    const response = await as(token)
      .get(`/projects/${id}/activity`)
      .expect(HttpStatus.OK);

    expect(response.body).toMatchObject({
      projectId: id,
      sources: [],
      currentCycle: null,
      divergences: [],
    });
    expect(provider.fetchEvents).not.toHaveBeenCalled();
  });

  it('links a repository, copies it, and shows the cycle activity', async () => {
    const id = await startedProject();
    const resourceId = repository();

    const linked = await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: resourceId })
      .expect(HttpStatus.CREATED);
    expect(linked.body).toMatchObject({
      provider: 'GITHUB',
      externalResourceId: resourceId,
      displayName: 'trhgatu/magnum-opus',
      status: 'ACTIVE',
      error: null,
    });
    expect(provider.fetchEvents).toHaveBeenCalledTimes(1);

    const activity = await as(token)
      .get(`/projects/${id}/activity`)
      .expect(HttpStatus.OK);
    expect(activity.body.sources).toHaveLength(1);
    expect(activity.body.currentCycle).toMatchObject({
      cycleNumber: 1,
      metrics: { commits: 1 },
    });
    // Vừa chép khi gắn: còn mới, không gọi nguồn lần nữa.
    expect(provider.fetchEvents).toHaveBeenCalledTimes(1);

    const sources = await as(token)
      .get(`/projects/${id}/activity/sources`)
      .expect(HttpStatus.OK);
    expect(
      sources.body.map((source: { feedId: string }) => source.feedId),
    ).toEqual([linked.body.feedId]);
  });

  it('answers 200 with the same source when the link is sent again', async () => {
    const id = await startedProject();
    const body = { provider: 'GITHUB', externalResourceId: repository() };

    const first = await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send(body)
      .expect(HttpStatus.CREATED);
    const again = await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send(body)
      .expect(HttpStatus.OK);

    expect(again.body.feedId).toBe(first.body.feedId);
    expect(again.body.linkedAt).toBe(first.body.linkedAt);

    // Kết nối hỏng sau lần gắn đầu: gửi lại vẫn là 200, không hỏi nguồn.
    provider.resolveResource.mockRejectedValueOnce(
      new ActivitySourceError('GITHUB_TOKEN_REVOKED'),
    );
    await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send(body)
      .expect(HttpStatus.OK);
    expect(provider.resolveResource).toHaveBeenCalledTimes(1);
  });

  it('shares one feed between two projects linking the same repository', async () => {
    const body = { provider: 'GITHUB', externalResourceId: repository() };

    const a = await as(token)
      .post(`/projects/${await startedProject()}/activity/sources`)
      .send(body)
      .expect(HttpStatus.CREATED);
    const b = await as(token)
      .post(`/projects/${await startedProject()}/activity/sources`)
      .send(body)
      .expect(HttpStatus.CREATED);

    expect(b.body.feedId).toBe(a.body.feedId);
  });

  it('unlinks a source, and reports one that is not linked', async () => {
    const id = await startedProject();
    const linked = await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: repository() })
      .expect(HttpStatus.CREATED);

    await as(token)
      .delete(`/projects/${id}/activity/sources/${linked.body.feedId}`)
      .expect(HttpStatus.NO_CONTENT);
    await as(token)
      .delete(`/projects/${id}/activity/sources/${linked.body.feedId}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) =>
        expect(body.code).toBe('ACTIVITY_SOURCE_NOT_FOUND'),
      );
    await as(token)
      .get(`/projects/${id}/activity/sources`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body).toEqual([]));
  });

  it('maps a source the connection cannot read to its API error', async () => {
    const id = await startedProject();
    provider.resolveResource.mockRejectedValueOnce(
      new ActivitySourceError('GITHUB_NOT_CONNECTED'),
    );
    await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: repository() })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('GITHUB_NOT_CONNECTED'));

    provider.resolveResource.mockRejectedValueOnce(
      new ActivitySourceError('GITHUB_REPOSITORY_NOT_ACCESSIBLE'),
    );
    await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: repository() })
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) =>
        expect(body.code).toBe('GITHUB_REPOSITORY_NOT_ACCESSIBLE'),
      );
  });

  it('still links when the first copy fails, with the error on the source', async () => {
    const id = await startedProject();
    provider.fetchEvents.mockRejectedValueOnce(
      new ActivitySourceError('GITHUB_UNAVAILABLE'),
    );

    const linked = await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: repository() })
      .expect(HttpStatus.CREATED);

    expect(linked.body).toMatchObject({
      status: 'ACTIVE',
      error: { code: 'GITHUB_UNAVAILABLE' },
    });
  });

  it('rejects an invalid source before calling the provider', async () => {
    const id = await startedProject();

    for (const body of [
      {},
      { provider: 'GITLAB', externalResourceId: '1' },
      { provider: 'GITHUB', externalResourceId: 'trhgatu/magnum-opus' },
      { provider: 'GITHUB', externalResourceId: '01067270000' },
    ]) {
      await as(token)
        .post(`/projects/${id}/activity/sources`)
        .send(body)
        .expect(HttpStatus.BAD_REQUEST);
    }
    expect(provider.resolveResource).not.toHaveBeenCalled();
  });

  it('hides another owner’s project behind PROJECT_NOT_FOUND', async () => {
    const id = await startedProject();

    // Mỗi request tạo khi tới lượt: supertest đóng server sau mỗi request.
    for (const call of [
      () => as(otherToken).get(`/projects/${id}/activity`),
      () => as(otherToken).get(`/projects/${id}/activity/sources`),
      () =>
        as(otherToken)
          .post(`/projects/${id}/activity/sources`)
          .send({ provider: 'GITHUB', externalResourceId: repository() }),
    ]) {
      await call()
        .expect(HttpStatus.NOT_FOUND)
        .expect(({ body }) => expect(body.code).toBe('PROJECT_NOT_FOUND'));
    }
  });

  it('freezes the cycle activity into a snapshot when the cycle closes', async () => {
    const id = await startedProject();
    await as(token)
      .post(`/projects/${id}/activity/sources`)
      .send({ provider: 'GITHUB', externalResourceId: repository() })
      .expect(HttpStatus.CREATED);
    await as(token)
      .patch(`/projects/${id}/complete`)
      .send({ expectedRevision: 2 })
      .expect(HttpStatus.OK);

    // Snapshot đi qua outbox (bất đồng bộ): đợi tối đa vài giây.
    let snapshots: Array<Record<string, unknown>> = [];
    for (let attempt = 0; attempt < 50 && snapshots.length === 0; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const response = await as(token)
        .get(`/projects/${id}/activity/snapshots`)
        .expect(HttpStatus.OK);
      snapshots = response.body;
    }

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      cycleId: expect.any(String),
      metrics: { commits: 1 },
      sources: [
        expect.objectContaining({
          provider: 'GITHUB',
          displayName: 'trhgatu/magnum-opus',
        }),
      ],
    });
  });

  it('lists no snapshots for another owner', async () => {
    const id = await startedProject();

    await as(otherToken)
      .get(`/projects/${id}/activity/snapshots`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/projects/${crypto.randomUUID()}/activity`)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  async function registerAndLogin(name: string): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `pa.${name}.${suffix}@example.com`;
    const password = 'activity-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username: `pa_${name}_${suffix}`.slice(0, 50), password })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    return login.body.accessToken as string;
  }
});
