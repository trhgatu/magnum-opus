import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

describe('Mood (E2E)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;

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

    ownerToken = await registerAndLogin('owner');
    otherToken = await registerAndLogin('other');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication', async () => {
    const entryId = '00000000-0000-4000-8000-000000000001';

    await request(app.getHttpServer())
      .get(`/journal/entries/${entryId}/mood`)
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('runs the private Mood lifecycle with independent revision protection', async () => {
    const createdEntry = await request(app.getHttpServer())
      .post('/journal/entries')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'A day worth remembering',
        content: 'The air became quiet after the rain.',
      })
      .expect(HttpStatus.CREATED);

    const entryId = createdEntry.body.id as string;
    expect(createdEntry.body.revision).toBe(1);

    await request(app.getHttpServer())
      .get(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    const createdMood = await request(app.getHttpServer())
      .put(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'CALM',
        intensity: 3,
        note: 'Quiet after the rain',
      })
      .expect(HttpStatus.OK);

    expect(createdMood.body).toMatchObject({
      journalEntryId: entryId,
      label: 'CALM',
      intensity: 3,
      note: 'Quiet after the rain',
      revision: 1,
    });
    expect(createdMood.body).not.toHaveProperty('ownerId');

    await request(app.getHttpServer())
      .get(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('JOURNAL_ENTRY_NOT_FOUND'));

    await request(app.getHttpServer())
      .put(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'HOPEFUL',
        expectedRevision: 9,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('MOOD_REVISION_CONFLICT'));

    const updatedMood = await request(app.getHttpServer())
      .put(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'HOPEFUL',
        intensity: 4,
        note: 'A clearer direction',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);

    expect(updatedMood.body).toMatchObject({
      label: 'HOPEFUL',
      intensity: 4,
      note: 'A clearer direction',
      revision: 2,
    });

    await request(app.getHttpServer())
      .patch(`/journal/entries/${entryId}/seal`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.revision).toBe(2));

    await request(app.getHttpServer())
      .put(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        label: 'CALM',
        expectedRevision: 2,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('MOOD_JOURNAL_ENTRY_NOT_EDITABLE'),
      );

    await request(app.getHttpServer())
      .get(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.revision).toBe(2));

    await request(app.getHttpServer())
      .patch(`/journal/entries/${entryId}/reopen`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 2 })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .delete(`/journal/entries/${entryId}/mood`)
      .query({ expectedRevision: 1 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('MOOD_REVISION_CONFLICT'));

    await request(app.getHttpServer())
      .delete(`/journal/entries/${entryId}/mood`)
      .query({ expectedRevision: 2 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/journal/entries/${entryId}/mood`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);
  });

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `mood.${label}.${suffix}@example.com`;
    const password = 'mood-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `mood_${label}_${suffix}`,
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
