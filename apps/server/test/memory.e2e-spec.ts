import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Memory (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

    prisma = app.get(PrismaService);
    ownerToken = await registerAndLogin('owner');
    otherToken = await registerAndLogin('other');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/memories')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('runs the private Memory lifecycle with revision protection', async () => {
    const created = await createMemory(ownerToken, {
      title: 'The quiet station',
      content: 'Rain moved slowly across the empty platform.',
      occurredOn: '2024-08-01',
      occurredOnPrecision: 'MONTH',
    });

    const memoryId = created.body.id as string;
    expect(created.body).toMatchObject({
      title: 'The quiet station',
      content: 'Rain moved slowly across the empty platform.',
      occurredOn: '2024-08-01',
      occurredOnPrecision: 'MONTH',
      state: 'ACTIVE',
      revision: 1,
    });
    expect(created.body).not.toHaveProperty('ownerId');

    // Create đi qua Outbox trước khi tới bảng Timeline — đợi thay vì assert
    // ngay, cùng lý do đã giải thích ở journal.e2e-spec.ts.
    const timelineEntry = await waitFor(() =>
      prisma.reflectionTimelineEntry.findUnique({
        where: {
          entryType_sourceId: {
            entryType: 'MEMORY_CREATED',
            sourceId: memoryId,
          },
        },
      }),
    );
    expect(timelineEntry).not.toBeNull();

    await request(app.getHttpServer())
      .get(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('MEMORY_NOT_FOUND'));

    await request(app.getHttpServer())
      .put(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        title: 'Cross-owner overwrite',
        content: 'This update must never be applied.',
        occurredOn: null,
        occurredOnPrecision: 'UNKNOWN',
        expectedRevision: 1,
      })
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => expect(body.code).toBe('MEMORY_NOT_FOUND'));

    const updated = await request(app.getHttpServer())
      .put(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'The quiet station after rain',
        content: 'The platform became clear when the rain stopped.',
        occurredOn: '2024-08-16',
        occurredOnPrecision: 'DAY',
        expectedRevision: 1,
      })
      .expect(HttpStatus.OK);
    expect(updated.body).toMatchObject({
      title: 'The quiet station after rain',
      occurredOn: '2024-08-16',
      occurredOnPrecision: 'DAY',
      revision: 2,
    });

    await request(app.getHttpServer())
      .put(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Stale overwrite',
        content: 'The stale version must not win.',
        occurredOn: null,
        occurredOnPrecision: 'UNKNOWN',
        expectedRevision: 1,
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) => expect(body.code).toBe('MEMORY_REVISION_CONFLICT'));

    const defaultList = await request(app.getHttpServer())
      .get('/memories?search=quiet&sortBy=occurredOn&sortOrder=desc')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    expect(defaultList.body.data).toHaveLength(1);
    expect(defaultList.body.data[0].id).toBe(memoryId);

    const trashed = await lifecycle(memoryId, 'trash', 2);
    expect(trashed.body).toMatchObject({
      state: 'TRASHED',
      revision: 3,
    });

    const activeList = await request(app.getHttpServer())
      .get('/memories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    expect(activeList.body.data).toHaveLength(0);

    const trashList = await request(app.getHttpServer())
      .get('/memories?state=TRASHED')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    expect(trashList.body.data).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/memories/${memoryId}/restore`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ expectedRevision: 3 })
      .expect(HttpStatus.NOT_FOUND);

    const restored = await lifecycle(memoryId, 'restore', 3);
    expect(restored.body).toMatchObject({
      state: 'ACTIVE',
      revision: 4,
    });

    await request(app.getHttpServer())
      .delete(`/memories/${memoryId}`)
      .query({ expectedRevision: 4 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }) =>
        expect(body.code).toBe('MEMORY_PERMANENT_DELETE_FORBIDDEN'),
      );

    await lifecycle(memoryId, 'trash', 4);

    await request(app.getHttpServer())
      .delete(`/memories/${memoryId}`)
      .query({ expectedRevision: 5 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('validates the Journal source boundary and keeps Memory after source deletion', async () => {
    const otherEntry = await createJournalEntry(otherToken, 'Private source');

    await createMemory(ownerToken, {
      sourceJournalEntryId: otherEntry.body.id as string,
      title: 'Invalid source',
      content: 'A Memory cannot reference another owner Journal entry.',
    })
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) =>
        expect(body.code).toBe('MEMORY_SOURCE_JOURNAL_NOT_FOUND'),
      );

    const sourceEntry = await createJournalEntry(ownerToken, 'Source entry');
    const sourceEntryId = sourceEntry.body.id as string;

    const createdMemory = await createMemory(ownerToken, {
      sourceJournalEntryId: sourceEntryId,
      title: 'What remains',
      content: 'This distilled memory survives its source Journal entry.',
    });
    const memoryId = createdMemory.body.id as string;
    expect(createdMemory.body.sourceJournalEntryId).toBe(sourceEntryId);

    const linkedMemories = await request(app.getHttpServer())
      .get(`/memories?sourceJournalEntryId=${sourceEntryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK);
    expect(linkedMemories.body.data).toHaveLength(1);
    expect(linkedMemories.body.data[0].id).toBe(memoryId);

    await request(app.getHttpServer())
      .get(`/memories?sourceJournalEntryId=${otherEntry.body.id as string}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.data).toHaveLength(0));

    await request(app.getHttpServer())
      .patch(`/journal/entries/${sourceEntryId}/trash`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision: 1 })
      .expect(HttpStatus.OK);

    await request(app.getHttpServer())
      .delete(`/journal/entries/${sourceEntryId}`)
      .query({ expectedRevision: 2 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.NO_CONTENT);

    await request(app.getHttpServer())
      .get(`/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(HttpStatus.OK)
      .expect(({ body }) => expect(body.sourceJournalEntryId).toBeNull());
  });

  async function waitFor<T>(
    read: () => Promise<T | null>,
    timeoutMs = 2_000,
    intervalMs = 50,
  ): Promise<T | null> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const result = await read();
      if (result) return result;
      if (Date.now() >= deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  function createMemory(
    token: string,
    body: {
      sourceJournalEntryId?: string;
      title: string;
      content: string;
      occurredOn?: string;
      occurredOnPrecision?: 'DAY' | 'MONTH' | 'YEAR' | 'UNKNOWN';
    },
  ) {
    return request(app.getHttpServer())
      .post('/memories')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function createJournalEntry(token: string, title: string) {
    return request(app.getHttpServer())
      .post('/journal/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title,
        content: `${title} content`,
      })
      .expect(HttpStatus.CREATED);
  }

  function lifecycle(
    memoryId: string,
    action: 'trash' | 'restore',
    expectedRevision: number,
  ) {
    return request(app.getHttpServer())
      .patch(`/memories/${memoryId}/${action}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ expectedRevision })
      .expect(HttpStatus.OK);
  }

  async function registerAndLogin(label: string): Promise<string> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `memory.${label}.${suffix}@example.com`;
    const password = 'memory-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `memory_${label}_${suffix}`,
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
