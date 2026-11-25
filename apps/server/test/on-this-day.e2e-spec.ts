import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { DomainExceptionFilter } from '../src/presentation/filters/domain-exception.filter';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;

/** Hôm nay ở Việt Nam, YYYY-MM-DD. */
const todayInVietnam = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());

describe('On this day (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get('/reflection/on-this-day')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('returns memories and journal pages from this day in past years, in the account time zone', async () => {
    const owner = await registerAndLogin('owner');
    const other = await registerAndLogin('other');
    await prisma.user.update({
      where: { id: owner.id },
      data: { timeZone: TIME_ZONE },
    });

    const today = todayInVietnam();
    const year = Number(today.slice(0, 4));
    const monthDay = today.slice(5);
    // Hôm nay là 29/2 thì 1–2 năm trước không có ngày này: trường hợp 28/2
    // và 29/2 do spec của onThisDayMonthDays lo, ở đây chỉ cần một ngày thường.
    if (monthDay === '02-29') return;
    const past = (yearsAgo: number) => `${year - yearsAgo}-${monthDay}`;
    const dateOf = (day: string) => new Date(`${day}T00:00:00.000Z`);

    const memory = (
      title: string,
      day: string,
      overrides: Partial<{
        precision: 'DAY' | 'MONTH';
        state: 'ACTIVE' | 'TRASHED';
        sourceJournalEntryId: string;
        ownerId: string;
      }> = {},
    ) =>
      prisma.memory.create({
        data: {
          ownerId: overrides.ownerId ?? owner.id,
          title,
          content: title,
          occurredOn: dateOf(day),
          occurredOnPrecision: overrides.precision ?? 'DAY',
          state: overrides.state ?? 'ACTIVE',
          trashedAt: overrides.state === 'TRASHED' ? new Date() : null,
          sourceJournalEntryId: overrides.sourceJournalEntryId ?? null,
        },
      });

    const journal = (
      title: string | null,
      content: string,
      createdAt: Date,
      state: 'DRAFT' | 'SEALED' | 'TRASHED' = 'SEALED',
    ) =>
      prisma.journalEntry.create({
        data: { ownerId: owner.id, title, content, state, createdAt },
      });

    // 06:30 sáng ở Việt Nam là 23:30 hôm trước ở UTC: vẫn là ngày hôm nay.
    const earlyMorning = (day: string) =>
      new Date(dateOf(day).getTime() - 30 * 60 * 1000);
    // 03:00 sáng hôm sau ở Việt Nam là 20:00 hôm nay ở UTC: không phải hôm nay.
    const nextVietnamDay = (day: string) =>
      new Date(dateOf(day).getTime() + DAY_MS - 4 * 60 * 60 * 1000);

    const fansipan = await memory('Leo Fansipan', past(4));
    const written = await journal(
      null,
      '  Hôm nay mệt\n\nnhưng   vui.  ',
      earlyMorning(past(1)),
      'DRAFT',
    );
    // Trang đã sinh ra một ký ức cùng ngày: chỉ ký ức hiện ra.
    const source = await journal(
      'Chạy 10km',
      'Về đích.',
      earlyMorning(past(2)),
    );
    const distilled = await memory('Lần đầu chạy 10km', past(2), {
      sourceJournalEntryId: source.id,
    });

    // Không được hiện:
    await memory('Chỉ nhớ tháng', past(4), { precision: 'MONTH' });
    await memory('Đã bỏ vào thùng rác', past(4), { state: 'TRASHED' });
    await memory('Năm nay', past(0));
    await journal('Trang đã xóa', 'x', earlyMorning(past(1)), 'TRASHED');
    await journal('Sau nửa đêm ở Việt Nam', 'x', nextVietnamDay(past(1)));
    await memory('Của người khác', past(4), { ownerId: other.id });

    const response = await request(app.getHttpServer())
      .get('/reflection/on-this-day')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({
      date: today,
      items: [
        {
          kind: 'JOURNAL',
          id: written.id,
          title: null,
          excerpt: 'Hôm nay mệt nhưng vui.',
          day: past(1),
          yearsAgo: 1,
        },
        {
          kind: 'MEMORY',
          id: distilled.id,
          title: 'Lần đầu chạy 10km',
          excerpt: null,
          day: past(2),
          yearsAgo: 2,
        },
        {
          kind: 'MEMORY',
          id: fansipan.id,
          title: 'Leo Fansipan',
          excerpt: null,
          day: past(4),
          yearsAgo: 4,
        },
      ],
    });

    const others = await request(app.getHttpServer())
      .get('/reflection/on-this-day')
      .set('Authorization', `Bearer ${other.token}`)
      .expect(HttpStatus.OK);
    const othersIds = others.body.items.map((item: { id: string }) => item.id);
    for (const id of [fansipan.id, written.id, distilled.id]) {
      expect(othersIds).not.toContain(id);
    }
  });

  // Mở một mục của hôm nay là một lần nhìn lại: vườn sáng thêm và đèn của ký
  // ức đó sáng lên; mục không có trong danh sách hôm nay thì không tính
  // (BR-GDN-LT-003, BR-GDN-LN-007, BR-GDN-LN-008).
  it('lights the garden and the lantern when an item from this day is opened', async () => {
    const owner = await registerAndLogin('opener');
    await prisma.user.update({
      where: { id: owner.id },
      data: { timeZone: TIME_ZONE },
    });
    const today = todayInVietnam();
    // 29/2 chỉ có ở năm nhuận: lùi bốn năm thì ngày đó vẫn có.
    const yearsBack = today.slice(5) === '02-29' ? 4 : 3;
    const past = `${Number(today.slice(0, 4)) - yearsBack}-${today.slice(5)}`;
    const listed = await prisma.memory.create({
      data: {
        ownerId: owner.id,
        title: 'Biển Quy Nhơn',
        content: 'Sóng.',
        occurredOn: new Date(`${past}T00:00:00.000Z`),
        occurredOnPrecision: 'DAY',
      },
    });
    // Tạo thẳng trong DB thì không có MemoryCreated: treo đèn như lần nạp lịch sử.
    await prisma.gardenLantern.create({
      data: {
        ownerId: owner.id,
        memoryId: listed.id,
        occurredOn: listed.occurredOn,
        precision: 'DAY',
      },
    });
    const notToday = await prisma.memory.create({
      data: {
        ownerId: owner.id,
        title: 'Không phải hôm nay',
        content: 'x',
        occurredOnPrecision: 'UNKNOWN',
      },
    });
    const open = (kind: string, id: string) =>
      request(app.getHttpServer())
        .post('/reflection/on-this-day/opened')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ kind, id });

    await open('MEMORY', notToday.id)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) =>
        expect(body.code).toBe('ON_THIS_DAY_ITEM_NOT_FOUND'),
      );
    await open('JOURNAL', listed.id).expect(HttpStatus.NOT_FOUND);
    await open('MEMORY', listed.id).expect(HttpStatus.NO_CONTENT);
    await open('MEMORY', listed.id).expect(HttpStatus.NO_CONTENT);

    const deadline = Date.now() + 10_000;
    let lantern: { memoryId: string; litOn: string | null } | undefined;
    while (Date.now() < deadline) {
      const garden = await request(app.getHttpServer())
        .get('/garden')
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(HttpStatus.OK);
      lantern = (
        garden.body.lanterns as { memoryId: string; litOn: string | null }[]
      ).find((l) => l.memoryId === listed.id);
      if (lantern?.litOn && garden.body.light === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(lantern?.litOn).toBe(today);

    // Hai lần mở trong một ngày là một lần nhìn lại.
    expect(
      await prisma.gardenEntry.count({
        where: { ownerId: owner.id, kind: 'REFLECTED', sourceRef: listed.id },
      }),
    ).toBe(1);
    // Chờ outbox giao sự kiện cho Garden: dài hơn hạn 5s mặc định.
  }, 20_000);

  async function registerAndLogin(
    label: string,
  ): Promise<{ id: string; token: string }> {
    const suffix = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    const email = `on-this-day.${label}.${suffix}@example.com`;
    const password = 'on-this-day-password-123';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        username: `otd_${label}_${suffix}`.slice(0, 50),
        password,
      })
      .expect(HttpStatus.CREATED);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(HttpStatus.OK);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
    return { id: user.id, token: login.body.accessToken as string };
  }
});
