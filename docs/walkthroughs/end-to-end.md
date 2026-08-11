# 09 — Code walkthrough từ request đến database

Tài liệu này không sao chép mọi dòng source. Nó lấy các đoạn quyết định architecture và giải thích từng dòng có ý nghĩa. Import barrel, dấu ngoặc và boilerplate formatter không được diễn giải lặp lại; trách nhiệm của chúng đã có trong catalog file.

## Walkthrough A — Set Mood

### 1. Route page tải dữ liệu

```ts
const { id } = await params;
let entry: JournalEntryResponse;
let mood: MoodResponse | null;

try {
  [entry, mood] = await Promise.all([getJournalEntry(id), getMood(id)]);
} catch (error) {
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
}

return <JournalEditor initialEntry={entry} initialMood={mood} />;
```

`await params` là contract Next.js 16: dynamic params là Promise. Hai biến được khai báo bằng public contracts để dữ liệu qua RSC boundary là plain JSON. `Promise.all` bắt đầu hai HTTP reads cùng lúc. 404 gọi `notFound()` để render route boundary; lỗi khác được rethrow tới error boundary. Component client chỉ nhận entry và mood, không nhận session/token/API client.

### 2. Feature read adapter chuẩn hóa 204

```ts
const mood = await apiFetch<MoodResponse | undefined>(
  `/journal/entries/${journalEntryId}/mood`,
);
return mood ?? null;
```

HTTP helper dùng `undefined` cho 204 vì không có body. Feature API đổi nó thành `null`, một domain-friendly state “Journal có tồn tại nhưng chưa gắn Mood”. 404 vẫn là exception nên không bị trộn với “chưa có Mood”.

### 3. UI gọi Server Action

```ts
const result = await setMood({
  journalEntryId,
  label,
  intensity,
  note,
  ...(mood ? { expectedRevision: mood.revision } : {}),
});
```

Create không gửi revision vì chưa có server record. Update gửi revision của snapshot UI đang sửa. Spread có điều kiện giữ JSON contract rõ hơn việc gửi `expectedRevision: undefined`.

### 4. Server Action không tin TypeScript

```ts
if (
  typeof input.journalEntryId !== 'string' ||
  !input.journalEntryId ||
  !validLabel(input.label) ||
  !validIntensity(input.intensity) ||
  (input.note !== null && typeof input.note !== 'string') ||
  (normalizedNote !== null && [...normalizedNote].length > 500) ||
  (input.expectedRevision !== undefined &&
    !validRevision(input.expectedRevision))
) {
  return { status: 'error', message: 'Dữ liệu mood không hợp lệ.' };
}
```

Server Action có thể bị gọi bằng crafted request, nên compile-time type không phải runtime validation. Journal ID phải là non-empty string. Label phải nằm trong shared vocabulary. Intensity là null hoặc integer 1–5. Note phải đúng type và tối đa 500 Unicode code points. Optional revision nếu xuất hiện phải là integer dương.

### 5. Controller tạo command

```ts
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
```

`journalEntryId` đã qua UUID pipe. `ownerId` lấy từ verified JWT, không lấy body. DTO đã validate body. Controller không gọi repository. CommandBus tìm handler. `unwrap()` ném domain exception cho global filter; success được presenter chuyển thành ISO-string response.

### 6. Handler bảo vệ ownership và state

```ts
const entry = await this.journalEntryRepository.findByIdForOwner(
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
```

Lookup đã scope owner nên missing và foreign entry có cùng outward result 404. Điều này chống enumeration. State check ở server là invariant use case; disabled button ở client không phải security.

### 7. Aggregate normalize và track change

```ts
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
```

Validate/normalize chạy trước mutation, nên exception không để aggregate ở state nửa cũ nửa mới. So sánh normalized values làm note `" calm "` và `"calm"` là no-op. No-op không tăng revision. Khi đổi thật, mọi field được gán rồi revision/timestamp tăng một lần.

### 8. Repository optimistic update

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

`updateMany` được dùng dù ID unique vì Prisma `update` ném khi condition phụ không match. WHERE gộp ID, relation, owner và expected revision thành một atomic write condition. Count 0 nghĩa stale/missing/race; handler đổi thành conflict. Repository không trả Prisma error detail ra ngoài.

## Walkthrough B — Journal autosave conflict

```text
Tab A và B cùng đọc revision 3
Tab B update expected=3 → database revision 4
Tab A update expected=3 → update count 0
API trả JOURNAL_ENTRY_REVISION_CONFLICT
UI giữ local draft A
UI tải snapshot revision 4
user chọn dùng latest hoặc rebase local lên latest
```

Điểm quan trọng là conflict không làm local input biến mất. `useJournalDraft` tách persisted snapshot, local draft và current revision. “Retry” chỉ hợp lệ sau khi đã lấy revision mới và người dùng/chính sách quyết định nội dung nào thắng.

## Walkthrough C — Access token refresh

```ts
const secondsLeft =
  expiresAt(session.accessToken) - Math.floor(Date.now() / 1000);
if (secondsLeft > REFRESH_THRESHOLD_SECONDS) {
  return NextResponse.next();
}

const refreshed = await refreshSessionSingleFlight(session.refreshToken);
```

Proxy không refresh mọi request; nó để token còn đủ hạn đi tiếp. Threshold tạo buffer để token không hết giữa render. Single-flight dùng refresh token rotation an toàn khi RSC tạo nhiều request đồng thời.

Nếu refresh fail và token cũ đã hết, protected route redirect login và xóa cookie. Nếu token cũ vẫn còn hạn, request được phép đi tiếp và không xóa cookie vì một concurrent refresh winner có thể đang set cookie mới.

## Walkthrough D — Module wiring

```ts
@Module({
  imports: [CqrsModule, JournalModule],
  controllers: [MoodController],
  providers: [
    { provide: MOOD_REPOSITORY, useClass: PrismaMoodRepository },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [MOOD_REPOSITORY],
})
export class MoodModule {}
```

`CqrsModule` cung cấp CommandBus/QueryBus và discovery handlers. `JournalModule` export Journal repository vì Mood application cần kiểm tra owner/state. Controller là inbound HTTP adapter. Provider binding chọn Prisma adapter. Handler arrays đăng ký use cases. Export repository chỉ dành cho module ngoài thật sự cần; export không có nghĩa public HTTP.

## Walkthrough E — CI dependency order

```json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**", "**/dist/**"]
}
```

`^build` nghĩa build dependencies trước package hiện tại. Inputs gồm source mặc định và env files, nên đổi env làm cache miss. Outputs cho Turbo biết artifact nào có thể restore. Next cache bị loại vì nó là intermediate cache, không phải deploy artifact độc lập.

## Cách tự walkthrough một file mới

Đọc theo sáu câu hỏi:

1. File thuộc layer/context nào?
2. Input đến từ nguồn tin cậy hay không tin cậy?
3. Rule nào nằm ở đây và tại sao không ở layer khác?
4. File phụ thuộc abstraction hay implementation?
5. Failure được biểu diễn và chuyển tiếp thế nào?
6. Test nào chứng minh behavior quan trọng nhất?

Nếu không trả lời được câu 1, vị trí file có thể sai. Nếu không trả lời được câu 3, file có thể chỉ là indirection. Nếu không có câu 5, happy path có thể đang che race/error. Nếu không có câu 6, architecture mới chỉ là ý định.
