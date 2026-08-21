# Forge v1 — Habit & Routine

Forge là context chứa Habit và Routine: những cam kết lặp lại vô thời hạn mà người dùng chủ động muốn duy trì. Tên context lấy từ vibe giả kim thuật của Magnum Opus — rèn luyện là hành động lặp lại, kiên trì để tinh luyện bản thân, không phải một lần thắng-thua.

## Trạng thái triển khai

Đây là spec trước khi code — chưa có dòng nào trong `apps/server/src/contexts/forge` hay `apps/client/features/habit`. Tài liệu này chốt scope, database và ranh giới module để việc implement đi thẳng theo, không phải dò lại quyết định giữa đường.

## Vấn đề cần giải quyết

Forge OS từng có Habit/Routine với `xpReward`, `streak`, `maxStreak`, `habitStrength` và một hàm `fail()` chủ động trừ điểm khi bỏ lỡ. Đây là vòng lặp operant-conditioning: biến việc rèn luyện thành một trò chơi được-thua, tạo áp lực giữ streak (loss aversion) và làm động lực bên trong (intrinsic motivation) bị thế chỗ bởi phần thưởng bên ngoài (Self-Determination Theory).

Người dùng thực sự cần: một nơi khai báo "tôi muốn làm việc này đều đặn", một cách ghi lại "hôm nay đã làm chưa" không kèm phán xét, và một cách nhìn lại pattern theo thời gian để tự rút ra nhận xét — không phải một bộ máy tính điểm.

## Lời hứa của v1

Người dùng khai báo một Habit (tên, tần suất), mỗi ngày đến hạn có thể tick "đã làm" hoặc không tick — cả hai đều là trạng thái hợp lệ, không có nhánh nào bị coi là thất bại. Nhiều Habit có thể gộp thành một Routine theo thứ tự, dùng chung ở một ngữ cảnh (ví dụ buổi sáng). Người dùng xem lại pattern qua heatmap, tự diễn giải, không có hệ thống nhắc nhở hay chấm điểm.

## Phạm vi

### Có trong v1

- Tạo/sửa/lưu trữ Habit: `title`, `description` tùy chọn, `frequency` (`DAILY` hoặc `WEEKLY(days)`).
- Check-in Habit theo ngày; undo check-in **chỉ trong ngày hôm nay**.
- Idempotent check-in: bấm hai lần trong một ngày không tạo hai dòng log.
- Heatmap lịch sử check-in theo khoảng thời gian.
- Tạo/sửa/lưu trữ Routine: `title`, danh sách Habit con theo `order`.
- Thêm/xóa Habit khỏi Routine; sắp xếp lại thứ tự bằng nút lên/xuống.
- Trang "Hôm nay": tổng hợp Habit + Routine đến hạn hôm nay, gộp Habit thuộc Routine vào đúng khối Routine của nó, Habit không thuộc Routine nào hiển thị riêng.
- Ownership guard và `revision` cho optimistic concurrency, giống Journal/Memory.
- Lưu trữ (archive) Habit/Routine: biến mất khỏi "Hôm nay" và khỏi danh sách để thêm mới, nhưng Routine đã chứa Habit archived vẫn hiển thị Habit đó ở trạng thái đã lưu trữ, không xóa liên kết.

### Chưa có trong v1

- `TIMES_PER_WEEK(n)` — tần suất "N lần/tuần không cố định ngày". Việc tính "lần nào được coi là đến hạn" phức tạp hẳn khi không còn là lịch cố định; hoãn sang v1.1.
- Progress dạng "X/N lần gần nhất". Cần một quy tắc rõ ràng cho "N lần đến hạn gần nhất là gì" theo từng loại frequency — chưa đủ chắc để build ngay, hoãn tới khi có nhu cầu thật.
- Domain event, Outbox, tích hợp Timeline. Habit/Routine v1 hoàn toàn không phát event — thêm sau khi phần ghi/đọc cơ bản đã ổn định, theo đúng pattern Outbox đã có ở Journal/Memory.
- Quest hoặc bất kỳ liên kết nào tới cam kết có điểm kết thúc.
- Notification/reminder nhắc nhở.
- Gợi ý Journal prompt khi bỏ lỡ nhiều ngày.
- Sửa/xóa check-in của các ngày trong quá khứ.
- Drag-and-drop khi sắp xếp Routine.
- XP, streak hiển thị như điểm số, "combo", hoặc bất kỳ hình thức thưởng/phạt.

Những khả năng bị hoãn chỉ được đưa vào khi có nhu cầu sản phẩm thật, không phải vì đã từng tồn tại trong Forge OS.

## Khái niệm

### Habit

Một hành động người dùng muốn lặp lại, không có điểm kết thúc. Habit không "hoàn thành" — nó chỉ có các lần check-in rời rạc theo ngày.

### HabitFrequency

Value object xác định ngày nào Habit "đến hạn":

```text
DAILY           → mọi ngày
WEEKLY(days)    → chỉ các thứ trong tuần được chọn (ít nhất 1 ngày)
```

Không dùng JSON tự do như Forge OS (`{"days":[1,3,5]}` lẫn `{"every":1}` trong cùng một cột) — hai hình dạng này được model tách bạch, validate ở domain.

### HabitCheckIn

Bản ghi "ngày này Habit đã được làm". Đây **không phải** sub-entity của `Habit` aggregate — không load qua `Habit`, không nằm trong transaction boundary của `Habit`. Lý do: log tăng vô hạn theo thời gian, Habit vẫn hợp lệ dù chưa có check-in nào, và không có gì buộc phải load toàn bộ log để tồn tại Habit.

Nhưng khác với Timeline (thuần read-model, không có domain layer vì nó chỉ là nơi _chứa kết quả_ của event từ module khác), `HabitCheckIn` **là** nguồn phát sinh hành vi thật ("ghi nhận một lần đã làm") — nên nó vẫn là một aggregate nhỏ riêng, có repository riêng (`HABIT_CHECK_IN_REPOSITORY`), kế thừa `AggregateRoot` như Habit/Routine. Đường ghi (`CheckInHabitHandler`, `UndoCheckInHandler`) đi qua repository này. Đường đọc tổng hợp (heatmap, trạng thái hôm nay của nhiều Habit cùng lúc) đi qua một `HabitCheckInReader` riêng — không rehydrate aggregate cho mỗi dòng, cùng nguyên tắc CQRS đã dùng ở mọi module khác (ghi qua aggregate + repository, đọc danh sách/tổng hợp qua reader/query).

### Routine

Một tập hợp Habit đã tồn tại, gom theo thứ tự, dùng chung một ngữ cảnh (ví dụ "Buổi sáng"). Routine không sở hữu Habit — nó chỉ tham chiếu `habitId` qua bảng join `RoutineHabit`, không nhúng title/mô tả của Habit vào Routine. Khi hiển thị, title luôn được đọc mới nhất từ Habit tại thời điểm đọc, không có nguy cơ lệch dữ liệu như `RoutineStep` từng nhúng title/xpReward trong Forge OS.

Làm 2/3 Habit trong một Routine hôm nay vẫn là kết quả hợp lệ — Routine không có khái niệm "hoàn thành cả cụm" ở v1, vì mỗi Habit con vẫn check-in độc lập.

## Trạng thái

```text
Habit:   ACTIVE ──archive──► ARCHIVED
            ▲                    │
            └──────restore───────┘

Routine: ACTIVE ──archive──► ARCHIVED
            ▲                    │
            └──────restore───────┘
```

Không có "fail" hay "broken". Một ngày không check-in không chuyển Habit sang trạng thái nào cả — nó chỉ đơn giản là không có dòng log cho ngày đó.

## Các flow chính

### Tạo Habit

Người dùng nhập title, description tùy chọn, chọn frequency. Server validate title (trim, không rỗng, tối đa 200 ký tự — cùng rule với Journal) và frequency (`WEEKLY` phải có ít nhất 1 ngày). Habit mới luôn `ACTIVE`, revision 1.

### Check-in / Undo check-in

Bấm "Đã làm" ghi một dòng vào `habit_check_ins` cho ngày hôm nay; bấm lại (đã ghi) không tạo dòng trùng — `@@unique(habitId, date)` bắt lỗi này ở tầng database, writer coi vi phạm unique là idempotent-success, không throw. Undo chỉ xóa được dòng của **ngày hôm nay**; không có endpoint sửa ngày trong quá khứ.

### Xem chi tiết Habit — heatmap

Trang chi tiết đọc danh sách ngày đã check-in trong một khoảng thời gian, hiển thị dạng lưới màu theo ngày. Không có số streak, không có progress bar.

### Tạo Routine và quản lý Habit con

Tạo Routine với title. Thêm Habit vào Routine chỉ chấp nhận Habit cùng owner, `order` là số Habit hiện có + 1. Sắp xếp lại bằng nút lên/xuống, cập nhật `order` cho toàn bộ danh sách trong một transaction. Đọc Routine luôn resolve title Habit con qua Reader port, không qua dữ liệu nhúng sẵn.

### Trang "Hôm nay"

Lấy toàn bộ Habit `ACTIVE` của owner, lọc theo frequency (DAILY luôn qua; WEEKLY chỉ qua nếu hôm nay thuộc `days`), tra check-in hôm nay cho từng Habit trong một query duy nhất, gộp theo Routine sở hữu. Mỗi ô check-in trên trang này gọi đúng command check-in dùng chung với trang chi tiết Habit — một hành động, nhiều điểm vào, cùng mức an toàn dữ liệu.

### Lưu trữ (archive)

Archive dùng compare-and-swap theo `expectedRevision`, set `isActive = false`. Habit đã archive biến mất khỏi "Hôm nay" và danh sách để thêm vào Routine mới, nhưng Routine đã chứa nó vẫn hiển thị Habit đó (đánh dấu đã lưu trữ, không cho check-in tiếp) — dữ liệu lịch sử không biến mất theo trạng thái hiện tại, cùng nguyên tắc Memory giữ khi Journal nguồn bị xóa.

## Business rules

1. Owner lấy từ access token; mọi truy vấn áp dụng ownership, ID của owner khác được xử lý như không tồn tại.
2. Title được trim, không rỗng, tối đa 200 ký tự.
3. `WEEKLY` phải có ít nhất 1 ngày trong tuần; `DAILY` không cần tham số.
4. Habit/Routine mới luôn `ACTIVE`, revision 1.
5. Update và archive/restore phải có `expectedRevision`.
6. Một check-in cho mỗi `(habitId, date)`; ghi trùng không lỗi, không tạo dòng mới.
7. Undo check-in chỉ hợp lệ với ngày hôm nay.
8. Thêm Habit vào Routine yêu cầu Habit và Routine cùng owner; một Habit không xuất hiện trùng trong cùng một Routine (`@@unique(routineId, habitId)`).
9. Archive Habit không xóa liên kết `RoutineHabit` đã có.
10. Không có trường điểm số, streak-lưu-sẵn, hay cờ thắng/thua ở bất kỳ bảng nào.

## Database

```prisma
enum HabitFrequencyType {
  DAILY
  WEEKLY
}

model Habit {
  id            String              @id @default(uuid())
  ownerId       String              @map("owner_id")
  title         String              @db.VarChar(200)
  description   String?             @db.Text
  frequencyType HabitFrequencyType  @map("frequency_type")
  frequencyDays Int[]               @default([]) @map("frequency_days") // ISO weekday 1–7, rỗng nếu DAILY
  isActive      Boolean             @default(true) @map("is_active")
  revision      Int                 @default(1)
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")

  owner        User               @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  checkIns     HabitCheckIn[]
  routineLinks RoutineHabit[]

  @@index([ownerId, isActive])
  @@map("habits")
}

model HabitCheckIn {
  id        String   @id @default(uuid())
  habitId   String   @map("habit_id")
  ownerId   String   @map("owner_id")
  date      DateTime @db.Date // calendar date, khong gio/timezone — cung kieu Memory.occurredOn
  createdAt DateTime @default(now()) @map("created_at")

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date])
  @@index([habitId, date])
  @@map("habit_check_ins")
}

model Routine {
  id        String   @id @default(uuid())
  ownerId   String   @map("owner_id")
  title     String   @db.VarChar(200)
  isActive  Boolean  @default(true) @map("is_active")
  revision  Int      @default(1)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  owner  User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  habits RoutineHabit[]

  @@index([ownerId, isActive])
  @@map("routines")
}

model RoutineHabit {
  routineId String @map("routine_id")
  habitId   String @map("habit_id")
  order     Int

  routine Routine @relation(fields: [routineId], references: [id], onDelete: Cascade)
  habit   Habit   @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@id([routineId, habitId])
  @@index([routineId, order])
  @@map("routine_habits")
}
```

So với Forge OS: không có `xpReward`, `comboXp`, `streak`, `maxStreak`, `habitStrength`, `actionType`. `HabitCheckIn`/`RoutineCompletion` kiểu cũ bị thay bằng một bảng log duy nhất (`HabitCheckIn`) — Routine không có completion riêng, vì "hoàn thành Routine" chỉ là suy ra từ check-in của các Habit con, không cần lưu thêm. `date` dùng `@db.Date` (không giờ, không timezone) — cùng kiểu `Memory.occurredOn` đã có trong chính magnum-opus, tránh lỗi lệch ngày khi tính unique-per-day và heatmap mà vẫn có index/so sánh native của Postgres, thay vì string tự parse. Mọi field nhiều từ đều có `@map` snake_case ngay từ đầu — không lặp lại drift đã phải vá ở `users`/`roles`/`permissions`.

## Chuẩn hóa & khả năng mở rộng

**Theo chuẩn hiện có:** `revision` cho optimistic concurrency (giống Journal/Memory/Mood), ownership qua `ownerId` lấy từ token (không nhận từ body), Reader port cho quan hệ chéo module (`RoutineHabit` đọc title Habit qua port, không import domain Habit trực tiếp vào Routine — đúng pattern `MemorySourceJournalReader`), `@map` snake_case đầy đủ, index theo đúng truy vấn thật sẽ chạy (`(ownerId, isActive)` cho danh sách, `(habitId, date)` cho heatmap/check-in).

**Một quyết định về shape của domain layer, không phải thêm hạ tầng mới:** `Habit`, `Routine` và `HabitCheckIn` đều kế thừa `AggregateRoot<T>` — base class dùng chung với Journal/Memory/Mood, không phải machinery riêng cho Forge. Đây chỉ là dùng đúng vocabulary "aggregate" đã có, không phải chuẩn bị trước cho Outbox. Repository v1 ghi aggregate bình thường, **không** đọc `pullDomainEvents()` hay ghi `outbox_events` — vì hiện tại không method nào gọi `addDomainEvent()`, viết sẵn đường ống cho một danh sách luôn rỗng là dựng hạ tầng cho nhu cầu chưa tồn tại.

**Mở rộng sau này không cần đổi write model:**

- Domain event (`HabitCheckedInEvent` từ `HabitCheckIn.create()`, `RoutineArchivedEvent` từ `Routine.archive()`...) thêm được bằng cách gọi `addDomainEvent()` trong domain method **và** thêm đoạn đọc `pullDomainEvents()` + ghi Outbox vào `save()` của repository — đúng công thức đã dùng ở `PrismaJournalEntryRepository`/`PrismaMemoryRepository`, chỉ mất vài dòng khi thật cần, không cần làm trước.
- `TIMES_PER_WEEK(n)` thêm được vào `HabitFrequencyType` bằng một migration mở rộng enum, không phá dữ liệu cũ (`DAILY`/`WEEKLY` không đổi ý nghĩa).
- Progress "X/N" là read-only, tính từ `HabitCheckIn` — thêm một query mới bất kỳ lúc nào, không đụng gì tới bảng ghi.
- Nếu Quest cần tham chiếu tới một Habit ("cam kết làm Habit X trong 30 ngày"), Quest chỉ cần giữ `habitId` và đọc qua Reader port riêng của nó — không cần Habit biết gì về Quest, giữ đúng nguyên tắc phụ thuộc một chiều đã áp dụng ở Memory→Journal.

**Rủi ro còn mở, chưa chốt:** cách tính "N lần đến hạn gần nhất" khi `WEEKLY` có ngày không đều — đây là lý do progress bị hoãn hẳn khỏi v1 thay vì cố làm nửa vời.
