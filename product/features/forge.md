# Forge v1 — Habit, Routine & Today

Forge là context chứa Habit và Routine: những cam kết lặp lại vô thời hạn mà người dùng chủ động muốn duy trì. Tên context lấy từ vibe giả kim thuật của Magnum Opus — rèn luyện là hành động lặp lại, kiên trì để tinh luyện bản thân, không phải một lần thắng-thua.

## Trạng thái triển khai

Product spec và data contract đã được chốt. Habit chạy thành một vertical slice từ PostgreSQL, NestJS đến Next.js: create, list/search/filter, detail, update, archive/restore, check-in/undo hôm nay và heatmap 90 ngày. Routine cũng đã chạy full-stack: collection có search/filter/sort/pagination, create/edit, detail read model, archive/restore, thêm/xóa Habit và đổi thứ tự bằng nút lên/xuống. Today đã chạy full-stack tại `GET /forge/today` và route `/today`: tổng hợp đúng những Habit đến hạn theo timezone của owner, nhóm theo Routine và cho phép check-in/undo ngay trên cùng màn hình. Ownership, optimistic locking, idempotency, timezone boundary, lifecycle, thứ tự membership và việc đồng bộ một Habit xuất hiện nhiều lần được kiểm tra bằng unit, component và HTTP E2E phù hợp với từng capability.

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
- Trang "Hôm nay": tổng hợp Habit + Routine đến hạn hôm nay. Một Habit có thể xuất hiện trong nhiều khối Routine; mọi vị trí dùng chung một trạng thái check-in. Habit không thuộc Routine active nào hiển thị riêng.
- Ownership guard và `revision` cho optimistic concurrency, giống Journal/Memory.
- “Hôm nay” được tính theo IANA timezone lưu trên user; dữ liệu cũ mặc định `UTC` cho đến khi người dùng chọn timezone.
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

`days` dùng ISO weekday `1..7` (`1` là thứ Hai, `7` là Chủ nhật), được sort và loại trùng khi tạo value object. `DAILY` luôn lưu mảng rỗng. Việc một Habit có đến hạn hay không phải nhận calendar date đã được diễn giải trong `User.timeZone`; domain không tự lấy timezone của process.

### HabitCheckIn

Bản ghi "ngày này Habit đã được làm". Đây **không phải** sub-entity của `Habit` aggregate — không load qua `Habit`, không nằm trong transaction boundary của `Habit`. Lý do: log tăng vô hạn theo thời gian, Habit vẫn hợp lệ dù chưa có check-in nào, và không có gì buộc phải load toàn bộ log để tồn tại Habit.

Nhưng khác với Timeline (thuần read-model, không có domain layer vì nó chỉ là nơi _chứa kết quả_ của event từ module khác), `HabitCheckIn` **là** nguồn phát sinh hành vi thật ("ghi nhận một lần đã làm") — nên nó vẫn là một aggregate nhỏ riêng, có repository riêng (`HABIT_CHECK_IN_REPOSITORY`), kế thừa `AggregateRoot` như Habit/Routine. Đường ghi (`CheckInHabitHandler`, `UndoCheckInHandler`) đi qua repository này. Đường đọc tổng hợp (heatmap, trạng thái hôm nay của nhiều Habit cùng lúc) đi qua một `HabitCheckInReader` riêng — không rehydrate aggregate cho mỗi dòng, cùng nguyên tắc CQRS đã dùng ở mọi module khác (ghi qua aggregate + repository, đọc danh sách/tổng hợp qua reader/query).

### Routine

Một tập hợp Habit đã tồn tại, gom theo thứ tự, dùng chung một ngữ cảnh (ví dụ "Buổi sáng"). Routine không sở hữu Habit — nó chỉ tham chiếu `habitId` qua bảng join `RoutineHabit`, không nhúng title/mô tả của Habit vào Routine. Khi hiển thị, title luôn được đọc mới nhất từ Habit tại thời điểm đọc, không có nguy cơ lệch dữ liệu như `RoutineStep` từng nhúng title/xpReward trong Forge OS.

Habit và Routine có quan hệ nhiều-nhiều. Một hành vi như “Uống nước” có thể thuộc cả Routine “Buổi sáng” lẫn “Ngày làm việc” mà không tạo hai Habit trùng nhau. Check-in vẫn thuộc về Habit, không thuộc về membership hay Routine; vì vậy tick Habit ở một vị trí sẽ làm mọi vị trí khác của chính Habit đó phản ánh trạng thái đã làm trong ngày.

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

Bấm "Đã làm" ghi một dòng vào `habit_check_ins` cho calendar date hiện tại trong `User.timeZone`; bấm lại không tạo dòng trùng — `@@unique(habitId, date)` bắt lỗi này ở tầng database, writer coi vi phạm unique là idempotent-success, không throw. Undo chỉ xóa được dòng của **ngày hôm nay theo cùng timezone**; không có endpoint sửa ngày trong quá khứ. Handler nhận clock và timezone reader qua port để test được thời điểm sát nửa đêm, không gọi trực tiếp timezone của server.

Runtime hiện cung cấp ba endpoint owner-scoped:

- `PUT /habits/:habitId/check-ins/today`: tạo check-in hôm nay. Gọi lại trả đúng record đã có thay vì tạo bản ghi thứ hai.
- `DELETE /habits/:habitId/check-ins/today`: bỏ check-in hôm nay. Gọi khi chưa có record vẫn thành công để thao tác undo có tính idempotent.
- `GET /habits/:habitId/check-ins?from=YYYY-MM-DD&to=YYYY-MM-DD`: trả các ngày đã check-in trong khoảng, tối đa 366 ngày, làm dữ liệu đầu vào cho heatmap.
- `GET /habits/:habitId/check-ins/today`: trả calendar date theo `User.timeZone` cùng trạng thái check-in hiện tại. Client dùng endpoint này thay vì suy đoán “hôm nay” bằng timezone của browser hoặc Next.js process.

Luồng ghi không import `Habit` aggregate trực tiếp. `HabitCheckInContextService` đọc `{ id, isActive }` qua `CheckInHabitReader`, đọc IANA timezone qua `UserTimeZoneReader`, lấy instant qua `Clock`, rồi mới tạo calendar date. Nhờ vậy Habit và HabitCheckIn vẫn là hai aggregate độc lập; test có thể cố định clock/timezone mà không sửa thời gian của máy chạy test. Habit đã archive không nhận check-in mới, nhưng vẫn được undo check-in hôm nay để sửa một thao tác nhầm trước đó.

### Xem chi tiết Habit — heatmap

Route `/habits/:id` đọc Habit và trạng thái hôm nay song song. Khi backend trả calendar date chuẩn của owner, Server Component mới suy ra khoảng 90 ngày rồi đọc history; dependency này là một waterfall có chủ ý vì mốc kết thúc không được lấy từ timezone của process. UI render history thành heatmap read-only, còn nút check-in/undo gọi Server Action và nhận lại trạng thái `today` chuẩn từ backend.

Client tổ chức theo feature boundary `features/habit/{api,actions,lib,components}`. API adapter chỉ chạy phía server; Server Actions validate input không tin cậy và chuyển lỗi API thành result serializable; page là Server Component; editor, lifecycle và check-in là Client Component nhỏ tại đúng điểm tương tác. Filter/search/sort/page nằm trong URL nên reload và back/forward giữ nguyên view.

Trang chi tiết đọc danh sách ngày đã check-in trong một khoảng thời gian, hiển thị dạng lưới màu theo ngày. Không có số streak, không có progress bar.

### Tạo Routine và quản lý Habit con

Tạo Routine với title. Thêm Habit vào Routine chỉ chấp nhận Habit cùng owner, đang active và chưa có trong chính Routine đó; `order` là số Habit hiện có + 1. Cùng một Habit vẫn có thể được thêm vào Routine khác. Aggregate chỉ giữ danh sách `habitId` có thứ tự, không import Habit aggregate và không sao chép title/mô tả của Habit.

`RoutineHabitReader` là port do Routine application sở hữu, chỉ đọc lượng dữ liệu tối thiểu để xác minh Habit trước khi thêm. Mutation đi qua `RoutineMutationService`: load theo owner, kiểm tra `expectedRevision`, gọi domain method rồi compare-and-swap. Repository chỉ thay membership sau khi compare-and-swap thành công và thực hiện toàn bộ thao tác trong một transaction; stale revision vì thế không thể xóa hay ghi lại thứ tự hiện có.

Create, list và mutation response trả `habitIds` vì các flow đó chỉ cần state của aggregate. `GET /routines/:id` dùng read model riêng: một owner-scoped Prisma query join membership với Habit rồi trả `habits` theo thứ tự, mỗi item gồm `id`, title mới nhất, `isActive` và `order`. Habit đã archive vẫn xuất hiện để Routine không mất ngữ cảnh; client có thể đánh dấu và khóa thao tác không còn hợp lệ mà không phát sinh N+1 request. Query side không rehydrate aggregate và không đưa phụ thuộc Habit vào Routine domain.

Client tổ chức theo feature boundary `features/routine/{api,actions,lib,components}`. Collection và detail là Server Component; API adapter chỉ chạy phía server. Editor, lifecycle và membership manager là các Client Component nhỏ gọi Server Action. Mọi mutation gửi `expectedRevision`, giữ lại error code an toàn để UI nhận biết conflict, rồi revalidate collection và detail. URL là nguồn sự thật cho search, trạng thái, sort và pagination; reload hoặc back/forward không làm mất view hiện tại.

Trang detail không tải trước toàn bộ Habit vào React payload. Khi selector được mở, Client Component tìm kiếm qua Next.js BFF Route Handler; backend phân trang và loại ngay trong PostgreSQL các Habit đã thuộc Routine, đã archive hoặc thuộc owner khác. Browser chỉ nhận read model tối thiểu `{ id, title }`. Habit đã archive nhưng đã tồn tại trong membership vẫn được hiển thị trong trình tự để không làm mất lịch sử.

### Trang "Hôm nay"

Lấy toàn bộ Habit `ACTIVE` của owner, tính calendar date/ISO weekday theo `User.timeZone`, lọc theo frequency (DAILY luôn qua; WEEKLY chỉ qua nếu hôm nay thuộc `days`) rồi tra check-in hôm nay cho từng Habit trong một query duy nhất. Sau đó reader gắn mỗi Habit vào tất cả Routine `ACTIVE` chứa nó. Habit có thể xuất hiện ở nhiều khối nhưng mọi bản hiển thị dùng chung `habitId` và cùng trạng thái check-in; Habit không thuộc Routine active nào xuất hiện ở nhóm standalone. Mỗi ô check-in gọi đúng command dùng chung với trang chi tiết Habit — một hành động, nhiều điểm vào, cùng mức an toàn dữ liệu.

Backend cố định một instant từ `TodayClock` cho toàn bộ request, sau đó `TodayReader` diễn giải instant đó bằng IANA timezone của owner. Vì vậy calendar date, ISO weekday và truy vấn check-in không thể lệch nhau khi request đi qua ranh giới nửa đêm. Today là read model tổng hợp, không phải aggregate mới và không sở hữu Habit, Routine hay Check-in.

Client đọc Today bằng Server Component và chỉ đưa trạng thái tương tác xuống hook `useTodayCheckIns`. Hook chuẩn hóa các Habit trùng theo `habitId`, cập nhật mọi vị trí của cùng Habit trong một lần và gọi lại command check-in/undo đã có. Khi mutation thất bại, trạng thái trước thao tác được khôi phục và lỗi an toàn được hiển thị; khi thành công, route được refresh để nhận lại read model chuẩn từ server.

Hai trạng thái rỗng mang ý nghĩa khác nhau:

- `NO_ACTIVE_HABITS`: chưa có Habit active nào; màn hình dẫn tới flow tạo Habit.
- `NOTHING_DUE`: có Habit active nhưng không Habit nào đến hạn trong calendar date hiện tại; đây là một ngày hợp lệ, không phải lỗi hay thất bại.

Today v1 không tính tiến độ Routine, không phát sinh `RoutineCompletion`, không hiển thị streak, tỷ lệ hoàn thành hay phần thưởng. Một Habit chưa check-in chỉ là một hành động chưa được đánh dấu trong ngày, không phải một kết quả bị phán xét.

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
8. Thêm Habit vào Routine yêu cầu Habit và Routine cùng owner; database dùng composite foreign key mang `ownerId` để chặn liên kết chéo tenant.
9. Habit và Routine là quan hệ nhiều-nhiều; khóa chính ghép `(routineId, habitId)` ngăn thêm trùng một Habit vào cùng Routine nhưng không cản tái sử dụng Habit ở Routine khác.
10. `RoutineHabit.order` bắt đầu từ 1 và không trùng trong một Routine.
11. Archive Habit không xóa liên kết `RoutineHabit` đã có; archive Routine không archive Habit, các Habit active của Routine đó trở lại nhóm standalone trên trang “Hôm nay”.
12. Calendar date và ISO weekday luôn được tính theo `User.timeZone`, không theo timezone của API process.
13. Không có trường điểm số, streak-lưu-sẵn, hay cờ thắng/thua ở bất kỳ bảng nào.

## Database

```prisma
enum HabitFrequencyType {
  DAILY
  WEEKLY
}

model Habit {
  id            String             @id @default(uuid())
  ownerId       String             @map("owner_id")
  title         String             @db.VarChar(200)
  description   String?            @db.Text
  frequencyType HabitFrequencyType @map("frequency_type")
  frequencyDays Int[]              @default([]) @map("frequency_days") // ISO weekday 1–7, rỗng nếu DAILY
  isActive      Boolean            @default(true) @map("is_active")
  revision      Int                @default(1)
  createdAt     DateTime           @default(now()) @map("created_at")
  updatedAt     DateTime           @updatedAt @map("updated_at")

  owner        User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  checkIns     HabitCheckIn[]
  routineLinks RoutineHabit[]

  @@unique([id, ownerId])
  @@index([ownerId, isActive])
  @@map("habits")
}

model HabitCheckIn {
  id        String   @id @default(uuid())
  habitId   String   @map("habit_id")
  ownerId   String   @map("owner_id")
  date      DateTime @db.Date // calendar date trong User.timeZone; cột không giữ giờ/timezone
  createdAt DateTime @default(now()) @map("created_at")

  habit Habit @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@unique([habitId, date])
  @@index([ownerId, date])
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

  @@unique([id, ownerId])
  @@index([ownerId, isActive])
  @@map("routines")
}

model RoutineHabit {
  routineId String @map("routine_id")
  habitId   String @map("habit_id")
  ownerId   String @map("owner_id")
  order     Int

  routine Routine @relation(fields: [routineId, ownerId], references: [id, ownerId], onDelete: Cascade)
  habit   Habit   @relation(fields: [habitId, ownerId], references: [id, ownerId], onDelete: Cascade)

  @@id([routineId, habitId])
  @@unique([routineId, order])
  @@map("routine_habits")
}
```

`User` có thêm `timeZone String @default("UTC") @map("time_zone") @db.VarChar(64)`. Đây là preference xuyên context, không phải state của Habit; Forge application chỉ đọc nó qua port để chuyển instant của clock thành calendar date.

Prisma không biểu diễn được toàn bộ invariant bằng DSL nên migration SQL bổ sung check constraints: title đã trim và không rỗng, revision từ 1 trở lên, weekday chỉ thuộc `1..7`, `DAILY` đi với mảng rỗng, `WEEKLY` đi với ít nhất một ngày và `RoutineHabit.order` từ 1 trở lên. Domain vẫn validate trước để trả error contract dễ hiểu; constraint là lớp bảo vệ cuối cho seed, script hoặc adapter tương lai.

So với Forge OS: không có `xpReward`, `comboXp`, `streak`, `maxStreak`, `habitStrength`, `actionType`. `HabitCheckIn`/`RoutineCompletion` kiểu cũ bị thay bằng một bảng log duy nhất (`HabitCheckIn`) — Routine không có completion riêng, vì "hoàn thành Routine" chỉ là suy ra từ check-in của các Habit con, không cần lưu thêm. `date` dùng `@db.Date`; timezone được áp dụng trước khi ghi, còn cột chỉ giữ calendar date. Mọi field nhiều từ đều có `@map` snake_case ngay từ đầu — không lặp lại drift đã phải vá ở `users`/`roles`/`permissions`.

## Chuẩn hóa & khả năng mở rộng

**Theo chuẩn hiện có:** `revision` cho optimistic concurrency (giống Journal/Memory/Mood), ownership qua `ownerId` lấy từ token (không nhận từ body), Reader port cho quan hệ chéo module (`RoutineHabit` đọc title Habit qua port, không import domain Habit trực tiếp vào Routine — đúng pattern `MemorySourceJournalReader`), `@map` snake_case đầy đủ, index theo đúng truy vấn thật sẽ chạy (`(ownerId, isActive)` cho danh sách, `(ownerId, date)` cho Today/heatmap và unique `(habitId, date)` cho idempotency).

**Một quyết định về shape của domain layer, không phải thêm hạ tầng mới:** `Habit`, `Routine` và `HabitCheckIn` đều kế thừa `AggregateRoot` — base class dùng chung với Journal/Memory/Mood, không phải machinery riêng cho Forge. Đây chỉ là dùng đúng vocabulary "aggregate" đã có, không phải chuẩn bị trước cho Outbox. Repository v1 ghi aggregate bình thường, **không** đọc `pullDomainEvents()` hay ghi `outbox_events` — vì hiện tại không method nào gọi `addDomainEvent()`, viết sẵn đường ống cho một danh sách luôn rỗng là dựng hạ tầng cho nhu cầu chưa tồn tại.

**Mở rộng sau này không cần đổi write model:**

- Domain event (`HabitCheckedInEvent` từ `HabitCheckIn.create()`, `RoutineArchivedEvent` từ `Routine.archive()`...) thêm được bằng cách gọi `addDomainEvent()` trong domain method **và** thêm đoạn đọc `pullDomainEvents()` + ghi Outbox vào `save()` của repository — đúng công thức đã dùng ở `PrismaJournalEntryRepository`/`PrismaMemoryRepository`, chỉ mất vài dòng khi thật cần, không cần làm trước.
- `TIMES_PER_WEEK(n)` thêm được vào `HabitFrequencyType` bằng một migration mở rộng enum, không phá dữ liệu cũ (`DAILY`/`WEEKLY` không đổi ý nghĩa).
- Progress "X/N" là read-only, tính từ `HabitCheckIn` — thêm một query mới bất kỳ lúc nào, không đụng gì tới bảng ghi.
- Nếu Quest cần tham chiếu tới một Habit ("cam kết làm Habit X trong 30 ngày"), Quest chỉ cần giữ `habitId` và đọc qua Reader port riêng của nó — không cần Habit biết gì về Quest, giữ đúng nguyên tắc phụ thuộc một chiều đã áp dụng ở Memory→Journal.

**Rủi ro còn mở, chưa chốt:** cách tính "N lần đến hạn gần nhất" khi `WEEKLY` có ngày không đều — đây là lý do progress bị hoãn hẳn khỏi v1 thay vì cố làm nửa vời.
