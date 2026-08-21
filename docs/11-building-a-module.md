# 11 — Cách xây một module mới

Chương này mô tả quy trình code một vertical slice. Ví dụ xuyên suốt là “gắn Mood vào Journal”, vì slice này đủ nhỏ để nhìn rõ mọi boundary nhưng vẫn có ownership, validation, optimistic concurrency, API, UI và E2E.

## 0. Viết flow trước khi viết class

Ghi một câu use case:

> Người sở hữu một Journal entry đang còn chỉnh sửa được có thể tạo hoặc cập nhật đúng một Mood bằng label bắt buộc, intensity 1–5 tùy chọn và note tối đa 500 ký tự.

Từ câu này suy ra ngay:

- ownership thuộc Journal, nên Mood phải kiểm tra Journal của requester;
- quan hệ là một-một, nên database cần unique `journal_entry_id`;
- “còn chỉnh sửa được” là rule application/domain, không phải CSS disabled;
- intensity/note cần validation cả runtime DTO lẫn domain;
- “cập nhật” cần revision để không ghi đè tab khác;
- không có Mood là trạng thái hợp lệ, nên GET có thể trả 204 thay vì giả một object.

Nếu chưa viết được câu use case rõ như vậy, schema và class names vẫn còn quá sớm.

## 1. Database: biểu diễn sự thật bền vững

```prisma
model Mood {
  id             String   @id @default(uuid())
  journalEntryId String   @unique @map("journal_entry_id")
  label          MoodLabel
  intensity      Int?
  note           String?  @db.VarChar(500)
  revision       Int      @default(1)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  journalEntry JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)

  @@map("moods")
}
```

`id` là identity riêng của Mood. `journalEntryId @unique` biến business cardinality “một entry có tối đa một mood” thành database invariant; hai request race vẫn không tạo hai row. `intensity Int?` cho phép chưa chọn mức độ, nhưng Prisma chưa biểu diễn range nên migration thêm check constraint 1–5. `revision` là compare-and-swap counter. `onDelete: Cascade` nói Mood không có đời sống sau khi Journal bị xóa vĩnh viễn. `@@map` giữ TypeScript model singular/PascalCase và SQL table plural/snake_case. Quy tắc này áp dụng cho **mọi** field nhiều từ, không chỉ tên bảng: `journalEntryId`, `createdAt`, `updatedAt` ở trên đều có `@map` riêng. Các model bootstrap sớm nhất (`User`, `Role`, `Permission`, `AuditLog`, `Menu`) từng thiếu bước này ở nhiều field — cột vật lý thành camelCase có quote thay vì snake_case, phải vá lại bằng migration `align_snake_case_column_mapping`. Khi thêm field mới vào model cũ, kiểm tra luôn field cạnh nó đã có `@map` chưa trước khi copy pattern.

Sau khi migrate, kiểm tra cả hai phía:

```powershell
pnpm verify:migrations
pnpm --filter=@repo/database build
```

Lệnh đầu chứng minh database đã áp dụng đúng lịch sử và schema không drift. Lệnh sau chứng minh generated client/types mà server import được build lại.

## 2. Contracts: định nghĩa lời hứa ở boundary

```ts
export const MOOD_LABELS = [
  'JOYFUL',
  'CALM',
  'HOPEFUL',
  // ...
] as const;

export type MoodLabel = (typeof MOOD_LABELS)[number];

export interface MoodResponse {
  id: string;
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
```

Array runtime tồn tại để Server Action có thể kiểm tra input thật. Type alias được suy ra từ cùng array nên runtime vocabulary và compile-time vocabulary không trôi khỏi nhau. `MoodResponse` là shape ổn định mà server và client cùng hiểu; ngày được serialize thành ISO string thay vì để `Date` đi qua process boundary.

Request write hiện do `SetMoodDto` ở server và input của Server Action ở client sở hữu. Cả hai dùng field `expectedRevision`: field này vắng khi create và phải có khi update; handler quyết định nhánh dựa trên Mood hiện có. Nếu nhiều consumer độc lập bắt đầu dùng cùng request shape, khi đó mới đáng nâng nó thành contract dùng chung thay vì tạo abstraction trước nhu cầu.

Contracts không import domain enum hoặc Prisma enum. Ba layer có thể cùng các string value nhưng ownership khác nhau: domain bảo vệ business vocabulary, Prisma mô tả storage, contract mô tả public API.

## 3. Domain: làm trạng thái sai trở nên khó tạo

```ts
static create(input: {
  journalEntryId: string;
  label: MoodLabel;
  intensity?: number | null;
  note?: string | null;
}): Mood {
  const now = new Date();
  return new Mood({
    id: MoodId.generate(),
    journalEntryId: input.journalEntryId,
    label: input.label,
    intensity: Mood.normalizeIntensity(input.intensity),
    note: Mood.normalizeNote(input.note),
    revision: 1,
    createdAt: now,
    updatedAt: now,
  });
}
```

Factory tạo identity trước database, vì aggregate có thể phát event/tham chiếu ID trước khi persist. `journalEntryId` được nhận từ application sau ownership check. Hai hàm normalize vừa validate vừa đưa `undefined`, blank string về canonical `null`. Revision bắt đầu từ 1 và hai timestamps nhận cùng một thời điểm tạo.

```ts
update(input: {
  label: MoodLabel;
  intensity?: number | null;
  note?: string | null;
}): void {
  const nextIntensity = Mood.normalizeIntensity(input.intensity);
  const nextNote = Mood.normalizeNote(input.note);

  const changed =
    this.props.label !== input.label ||
    this.props.intensity !== nextIntensity ||
    this.props.note !== nextNote;

  if (!changed) return;

  this.props.label = input.label;
  this.props.intensity = nextIntensity;
  this.props.note = nextNote;
  this.trackChange();
}
```

Normalize trước compare để `"  "` và `null` được coi là cùng trạng thái. Early return biến update không đổi dữ liệu thành no-op, tránh revision và `updatedAt` tăng giả. Mutate chỉ xảy ra sau khi mọi giá trị mới hợp lệ, nên exception không để aggregate ở trạng thái nửa cũ nửa mới.

Test domain trước khi viết Prisma. Nếu aggregate tests khó viết mà không boot framework, domain đang phụ thuộc outer layer.

## 4. Port: nói application cần gì, chưa nói dùng công nghệ nào

```ts
export const MOOD_REPOSITORY = Symbol('MOOD_REPOSITORY');

export interface MoodRepository {
  create(mood: Mood): Promise<boolean>;
  update(
    mood: Mood,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
  findByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<Mood | null>;
  deleteByJournalEntryIdForOwner(
    journalEntryId: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
```

Interface là TypeScript contract nhưng bị xóa ở runtime, vì vậy symbol `MOOD_REPOSITORY` là Nest injection token. `boolean` ở mutation không phải “thành công chung chung”; nó cho handler biết insert/compare-and-swap có thắng race hay không. Mọi read/write đều nhận owner hoặc đi qua relation owner để ownership không chỉ tồn tại ở controller. Repository không nhận DTO vì DTO thuộc HTTP boundary.

## 5. Application handler: điều phối policy xuyên aggregate

Pseudo-flow của `SetMoodHandler`:

```ts
const entry = await journals.findByIdForOwner(
  command.journalEntryId,
  command.ownerId,
);
if (!entry) {
  return Result.fail(new JournalEntryNotFoundException(command.journalEntryId));
}
if (entry.state !== JournalEntryState.DRAFT) {
  return Result.fail(
    new MoodJournalEntryNotEditableException(
      command.journalEntryId,
      entry.state,
    ),
  );
}

const existing = await moods.findByJournalEntryIdForOwner(
  command.journalEntryId,
  command.ownerId,
);
if (!existing) {
  const mood = Mood.create(/* normalized domain input */);
  const created = await moods.create(mood);
  return created ? Result.ok(mood) : Result.fail(/* revision conflict */);
}

if (command.expectedRevision !== existing.revision) {
  return Result.fail(/* revision conflict */);
}

const expectedRevision = existing.revision;
existing.update(/* input */);
if (existing.revision === expectedRevision) return Result.ok(existing);

const updated = await moods.update(existing, command.ownerId, expectedRevision);
return updated ? Result.ok(existing) : Result.fail(/* revision conflict */);
```

Hai check đầu dùng Journal repository vì Journal sở hữu owner và lifecycle. Không duplicate `ownerId` vào Mood chỉ để query tiện hơn nếu domain không nói Mood sở hữu nó. Handler trả `Result.fail` cho failure nghiệp vụ có dự kiến; controller `unwrap()` và exception filter chuyển failure thành HTTP. Check revision trước mutation cho lỗi dễ hiểu; predicate trong repository vẫn bắt buộc vì database có thể đổi giữa read và write. So sánh revision sau `update` nhận biết no-op để không gửi SQL thừa.

Handler test mock hai repository và phủ: journal không tồn tại, journal sealed/trashed, create, update đúng revision, missing/stale revision, no-op và race trả false.

## 6. Infrastructure: map tường minh và update có điều kiện

```ts
const result = await this.prisma.mood.updateMany({
  where: {
    id: raw.id,
    journalEntryId: raw.journalEntryId,
    revision: expectedRevision,
    journalEntry: { ownerId },
  },
  data: {
    label: raw.label,
    intensity: raw.intensity,
    note: raw.note,
    revision: raw.revision,
    updatedAt: raw.updatedAt,
  },
});

return result.count === 1;
```

`updateMany` được dùng dù chỉ mong một row vì nó trả count thay vì ném not-found và cho phép compare predicate rõ ràng. `id + journalEntryId + owner relation + revision` là atomic authorization/concurrency predicate tại database. Count 0 có nghĩa row/ownership không match hoặc revision đổi; application map kết quả thành conflict phù hợp với use case mà không rò chi tiết tồn tại của tài nguyên khác owner.

Mapper phải switch enum tường minh. Cast `as MoodLabel` ngắn hơn nhưng sẽ âm thầm chấp nhận vocabulary drift. Mapper test iterate mọi enum member để migration thêm label sẽ buộc code mapping được cập nhật.

## 7. Presentation: giữ HTTP ở mép hệ thống

```ts
@Put()
async setMood(
  @GetUser('id') ownerId: string,
  @Param('entryId', new ParseUUIDPipe()) journalEntryId: string,
  @Body() body: SetMoodDto,
): Promise<MoodResponse> {
  const result = await this.commandBus.execute(
    new SetMoodCommand(
      journalEntryId,
      ownerId,
      body.label,
      body.intensity,
      body.note,
      body.expectedRevision,
    ),
  );
  return MoodPresenter.toResponse(result.unwrap());
}
```

Class-level controller đã giữ path `journal/entries/:entryId/mood`, nên method chỉ cần `@Put()`. `GetUser` lấy identity từ verified JWT, không nhận ownerId từ body. `ParseUUIDPipe` chặn ID sai cú pháp trước query. DTO validate body. Controller chuyển transport input thành command, dispatch, unwrap result và presenter chuyển output; không hỏi Prisma hoặc tự xét Journal state.

`MoodModule` bind `MoodRepository` tới `PrismaMoodRepository`, import `JournalModule` vì handler cần Journal port, đăng ký controller và handlers. Nếu quên export Journal repository từ `JournalModule`, Nest không resolve được dependency — đó là composition error, không phải lý do chuyển logic sang controller.

## 8. Client: Server Component đọc, Server Action ghi

Route page:

```ts
const [entry, mood] = await Promise.all([
  getJournalEntry(id),
  getMood(id),
]);

return <JournalEditor initialEntry={entry} initialMood={mood} />;
```

Đọc chạy trên Next server nên backend URL/token không lộ cho browser. Hai request độc lập chạy song song. `getMood` đổi backend 204 thành `null`, làm component nhận một state rõ ràng.

Server Action:

```ts
export async function setMood(input: {
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  expectedRevision?: number;
}): Promise<MoodMutationResult> {
  const normalizedNote =
    typeof input.note === "string" ? input.note.trim() || null : input.note;

  if (/* runtime UUID/label/intensity/note/revision checks fail */) {
    return { status: "error", message: "Dữ liệu mood không hợp lệ." };
  }

  try {
    const mood = await apiFetch<MoodResponse>(
      `/journal/entries/${input.journalEntryId}/mood`,
      { method: "PUT", body: JSON.stringify(/* validated fields */) },
    );
    revalidatePath(`/journal/${input.journalEntryId}`);
    return { status: "success", mood };
  } catch (error) {
    return failure(error);
  }
}
```

Type annotation giúp caller trong code nhưng không phải security boundary, vì Server Action vẫn có thể bị gọi bằng payload ngoài UI. Các guard vì vậy kiểm tra runtime trước API call. API call dùng server session. `revalidatePath` làm lần navigation/render sau thấy dữ liệu mới. Expected 409 được `failure()` map thành action state có code/correlation ID để UI hướng dẫn reload và hỗ trợ tra log.

Client component giữ draft selection và pending state, nhưng server response là source of truth. Sau success nó thay local Mood bằng response có revision mới. Nếu giữ revision cũ, lần save tiếp theo sẽ tự tạo conflict giả.

## 9. E2E: chứng minh câu use case ban đầu

Browser test không cần kiểm tra mọi enum label; unit test đã làm việc đó. Nó cần chứng minh flow mà người dùng thấy:

1. đăng nhập và mở Journal thuộc owner;
2. chọn Mood, intensity/note và save;
3. reload vẫn thấy dữ liệu đã persist;
4. mở hai tab, save tab A rồi save tab B bằng revision cũ;
5. tab B thấy conflict thay vì ghi đè;
6. sealed/trashed Journal không cho mutation.

Một E2E tốt đóng vòng từ UI → Server Action → backend → database → response → UI. Nếu chỉ mock API, đó là component integration test chứ chưa phải E2E.

## 10. Thứ tự kiểm tra trước commit

Chạy từ hẹp đến rộng để feedback nhanh:

```powershell
pnpm --filter=server test -- mood.aggregate.spec.ts
pnpm --filter=server test -- set-mood.handler.spec.ts
pnpm --filter=server test -- prisma-mood.repository.spec.ts
pnpm --filter=server test -- dependency-rules.spec.ts
pnpm --filter=server check-types
pnpm --filter=client test
pnpm check-types
pnpm lint
pnpm build
pnpm verify:migrations
pnpm verify:docs
```

Không sửa test để làm implementation sai “xanh”. Khi test và requirement mâu thuẫn, quay lại product flow, ghi rõ quyết định rồi thay contract/test/code cùng nhau.

## Checklist dùng lại cho module sau

- Product sentence có actor, trigger, rule và result.
- Database constraint bảo vệ cardinality/range quan trọng ngay cả khi app race.
- Contract có runtime vocabulary nếu input đi qua network/browser.
- Aggregate không import framework/persistence.
- Handler kiểm tra ownership và orchestration; aggregate kiểm tra invariant nội tại.
- Repository mutation dùng tenant/owner scope và expected revision khi cần.
- Controller chỉ làm transport mapping.
- UI không giữ token và không coi local state là persisted truth.
- Domain, handler, adapter, HTTP và browser tests mỗi lớp chứng minh đúng trách nhiệm.
- Module wiring và architecture rules đều pass.
