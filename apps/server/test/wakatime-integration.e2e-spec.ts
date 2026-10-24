import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

// Chỉ các luồng không gọi WakaTime thật: chưa kết nối, ngắt kết nối,
// validate body, xác thực. Luồng gọi WakaTime được phủ bởi unit test với
// fetch giả (wakatime-http.client.spec.ts).
describe('WakaTime integration (E2E)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    token = await registerAndLogin();
  });

  afterAll(async () => {
    await app?.close();
  });

  const authed = (method: 'get' | 'put' | 'delete', url: string) =>
    request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${token}`);

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/integrations/wakatime')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('answers 204 with an empty body before WakaTime is connected', async () => {
    const response = await authed('get', '/integrations/wakatime').expect(
      HttpStatus.NO_CONTENT,
    );

    expect(response.text).toBe('');
  });

  it('disconnects idempotently when nothing is connected', async () => {
    await authed('delete', '/integrations/wakatime').expect(
      HttpStatus.NO_CONTENT,
    );
    await authed('delete', '/integrations/wakatime').expect(
      HttpStatus.NO_CONTENT,
    );
  });

  it('rejects a request without a usable key before calling WakaTime', async () => {
    for (const body of [
      {},
      { apiKey: '' },
      { apiKey: 'x'.repeat(256) },
      { apiKey: '   ' },
      { apiKey: 'waka_ fake' },
    ]) {
      await authed('put', '/integrations/wakatime')
        .send(body)
        .expect(HttpStatus.BAD_REQUEST);
    }
  });

  it('rejects unknown fields and a non-boolean confirmation', async () => {
    await authed('put', '/integrations/wakatime')
      .send({ apiKey: 'waka_fake', token: 'x' })
      .expect(HttpStatus.BAD_REQUEST);
    await authed('put', '/integrations/wakatime')
      .send({ apiKey: 'waka_fake', confirmAccountChange: 'yes' })
      .expect(HttpStatus.BAD_REQUEST);
  });

  async function registerAndLogin(): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `wakatime.${suffix}@example.com`;
    const password = 'wakatime-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `wakatime_${suffix}`.slice(0, 50),
        password,
      })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    return login.body.accessToken as string;
  }
});
