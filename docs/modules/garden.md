# 12 — Garden

Tài liệu kỹ thuật của bounded context Garden. Phần nghiệp vụ (vấn đề, quy tắc, lộ trình) ở [BA Garden](../../product/ba/contexts/garden/01-ba-overview.md).

Đây là thiết kế đích. Hiện đã có lát G1a đến G1e, G2a, G2b (`GET /garden`), G3a (`garden-sim`) và G3b (trang `/garden`): bảng `garden_subjects` và `garden_entries`, cổng `GardenLedgerWriter` cùng writer Prisma, handler gieo/nhổ cây theo `HabitCreated` / `HabitPermanentlyDeleted`, handler ghi `TENDED` / `UNTENDED` theo `HabitCheckedIn` / `HabitCheckInUndone`, handler ghi sẹo theo `HabitRelapsed` gieo lại cây theo `HabitQuitStartChanged`, ghi `RESTED` / `RESUMED` theo `HabitLifecycleTransitioned`, ẩn/hiện cây theo `HabitTrashed` / `HabitRestoredFromTrash`, ghi `RHYTHM_SET` theo `HabitScheduleVersionStarted`, đổi tên cây theo `HabitRenamed`, và migration nạp lịch sử cho dữ liệu có từ trước. Phần chưa có được ghi _(dự kiến)_.

## 1. Ba trục độc lập

```
 sự kiện riêng của module      ngôn ngữ chung              hình dạng riêng
 HabitCheckedIn      ┐
 HabitRelapsed       ├─► NGUỒN ─► sổ ─► NHỊP ─► chuỗi kỳ + dấu ─► GIỐNG CÂY ─► hình học
 ProjectCycleClosed  ┤   (dịch)         (tính)                   (mọc)
 JournalEntrySealed  ┘
```

| Trục                       | Biết gì                         | Không biết gì           | Một cho mỗi  |
| -------------------------- | ------------------------------- | ----------------------- | ------------ |
| **Nguồn** (`GardenSource`) | sự kiện cụ thể của module       | cây mọc ra sao          | module       |
| **Nhịp** (`GardenRhythm`)  | thế nào là có chăm trong một kỳ | sự kiện gốc, hình dạng  | loại chủ thể |
| **Giống cây** (species)    | cách mọc thành hình             | module nào, sự kiện nào | giống cây    |

Ba trục ghép tự do: một module có thể ra nhiều giống (Habit: BUILD, QUIT); nhiều module có thể dùng chung một giống (Project và một module Học tương lai cùng là dây leo). Giống cây chỉ nhận chuỗi kỳ và dấu; nếu cần thêm thông tin thì mở rộng ngôn ngữ chung (thêm một dấu), không cho giống cây nhìn sự kiện gốc.

## 2. Ổ cắm

**Nguồn** là một nhóm outbox handler. Module gốc công bố integration event trong `contexts/<module>/contracts/` (xem `defineIntegrationEvent`). Garden viết mỗi handler `@OutboxHandler(<Contract>)` dịch payload thành dòng sổ, rồi ghi qua cổng `GardenLedgerWriter`. `OutboxRegistry` tự tìm handler lúc boot, nên không có router trung tâm hay danh sách nguồn phải sửa. Handler chỉ thấy payload của contract, không thấy domain event của module gốc.

```ts
// domain thuần; chỉ nguồn loại "cây" mới có
interface GardenRhythm {
  readonly subjectKind: GardenSubjectKind;
  readonly unit: 'WEEK' | 'MONTH' | 'YEAR'; // P1 chỉ cài WEEK
  periodState(period: Period, history: SubjectHistory): PeriodState;
}
```

Nhịp đăng ký qua multi-provider của Nest (`GARDEN_RHYTHMS`). Lõi không bao giờ `switch` theo `subject_kind`.

Một event chỉ được publish khi đã có handler (`OutboxRegistry` chặn lúc boot), nên event mới của Forge và handler Garden của nó luôn đi chung một PR. Event của cùng một Habit dùng `aggregateId = habitId`, nên outbox giao chúng đúng thứ tự ghi (`outbox_events.sequence`).

## 3. Bố cục

Garden là một bounded context, cùng bố cục bốn tầng như các context khác. Dòng đánh `*` là dự kiến, chưa có:

```
apps/server/src/contexts/garden/
├─ garden.module.ts
├─ domain/garden-subject.ts             GardenSubjectKind, GardenVariant, CURRENT_SIM_VERSION
├─ domain/garden-entry.ts               GardenEntryKind, GardenMark, GardenSchedule (lịch trong `detail` của RHYTHM_SET)
├─ domain/garden-week.ts                gardenWeeks, weedsAfter (thuần: chuỗi tuần, sẹo, cỏ)
├─ domain/                            * climate (P2+)
├─ application/
│  ├─ ports/garden-ledger-writer.port.ts
│  ├─ ports/garden-ledger-reader.port.ts, clock.port.ts, user-time-zone-reader.port.ts
│  └─ queries/get-garden.query.ts       (sau này ?at= để tua, P4)
├─ infrastructure/
│  ├─ outbox/                           ← chỗ duy nhất biết contract của Forge
│  │  ├─ plant-created-habit.handler.ts, uproot-deleted-habit.handler.ts
│  │  ├─ record-habit-check-in.handler.ts, record-habit-check-in-undone.handler.ts
│  │  ├─ record-habit-relapse.handler.ts, replant-quit-habit.handler.ts
│  │  ├─ record-habit-lifecycle.handler.ts, hide-trashed-habit.handler.ts, show-restored-habit.handler.ts
│  │  └─ record-habit-rhythm.handler.ts, rename-habit-tree.handler.ts
│  ├─ writers/prisma-garden-ledger.writer.ts
│  └─ readers/prisma-garden-ledger.reader.ts, prisma-user-time-zone.reader.ts
└─ presentation/                        GET /garden (garden.controller.ts, garden.presenter.ts)

packages/garden-sim/                    thuần TS (G3a): grow(simVersion, { seed, species, weeks })
  rng.ts     hash, rng                    hạt giống ổn định theo id cây
  versions/  v1                           space colonization + pipe model; không bao giờ sửa phiên bản cũ
                                          giống cây (tree, thorn-bush) là hình dạng trong từng phiên bản; * vine, fallback (P3)
packages/contracts/src/garden/          GardenResponse, enum dùng chung
apps/client/features/garden/            (G3b)
  components/garden-view.tsx             khung trang: tải scene (next/dynamic, ssr: false), lời kể, danh sách cây
  components/garden-scene.tsx            three.js: cây, bụi gai, mắt gỗ, sẹo, cỏ, lối đá; chỉ vẽ khi có thay đổi
  lib/garden-story.ts                    lời kể không điểm số hay đếm tuần (KD-GDN-002), chỉ có tháng gieo; nhắc tên lúc gieo nếu đã đổi tên
  api/garden.ts                          GET /garden (server-only)
apps/client/app/(protected)/garden/     page.tsx, loading.tsx, error.tsx
```

## 4. Luật phụ thuộc (thêm vào `architecture/dependency-rules.spec.ts`)

| Luật                                                                                              | Lý do                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Garden chỉ chạm context khác qua `contexts/<module>/contracts`, và chỉ từ `infrastructure/outbox` | Garden application và domain không biết Forge. Luật outbox adapter đã có sẵn lo phần này |
| Không context nào import `garden`                                                                 | Module nguồn không biết vườn tồn tại                                                     |
| `garden/domain` không import Prisma hay Nest                                                      | Nhịp, cỏ, khí hậu là hàm thuần                                                           |
| `packages/garden-sim` không phụ thuộc gói nào                                                     | Chạy được ở server, client, test                                                         |

## 5. Luồng

**Gieo** (đã có, G1a):

```
CreateHabitHandler lưu Habit + forge.habit.created.v1 vào outbox (một transaction)
→ publisher → OutboxRegistry → PlantCreatedHabitHandler (Garden)
→ ghi garden_subjects (trùng (subject_kind, subject_id) thì bỏ qua)
```

Xóa vĩnh viễn Habit thì `forge.habit.permanently-deleted.v1` đi qua `UprootDeletedHabitHandler`, xóa hàng của nó.

**Ghi** (đã có, G1b) (người dùng check-in):

```
CheckInHabitHandler lưu check-in + forge.habit.checked-in.v1 vào outbox (một transaction), trả kết quả ngay
→ publisher → OutboxRegistry → RecordHabitCheckInHandler (Garden)
→ dịch payload thành một TENDED
→ ghi garden_entries (trùng source_event_id thì bỏ qua)
```

Check-in trùng ngày thì transaction rollback, không phát event lần hai. Rút lại check-in đi qua `HabitCheckIn.undo()` và `forge.habit.check-in-undone.v1`, thành một `UNTENDED`; chỉ lần xóa được dòng mới phát event. Habit chưa có cây thì dòng sổ bị bỏ qua; nạp lịch sử (G1e) bù lại. Event check-in dùng `aggregateId = habitId`, nên luôn tới sau `HabitCreated` của cùng Habit.

Garden lỗi thì outbox thử lại; check-in không bị ảnh hưởng.

**Sẹo và gieo lại** (đã có, G1c) (Habit QUIT):

```
LogRelapseHandler lưu tái phạm + forge.habit.relapsed.v1 vào outbox (một transaction)
→ RecordHabitRelapseHandler (Garden) → một MARKED với mark SCAR

UpdateHabitHandler đổi quitStartedAt → forge.habit.quit-start-changed.v1 cùng transaction với update
→ ReplantQuitHabitHandler (Garden) → đổi planted_on của cây
```

Ngày của sẹo là ngày theo múi giờ tài khoản lúc tái phạm (BR-GDN-SB-002). Sổ ghi đủ từng lần tái phạm; gộp một sẹo mỗi tuần là việc của lúc diễn giải (BR-GDN-004). Gieo lại chỉ dời `planted_on`, không xóa dòng sổ nào; lúc đọc, dòng trước ngày gieo bị bỏ qua (BR-GDN-007). Chỉ sửa tên mà giữ nguyên ngày thì không phát event.

**Nghỉ và Thùng rác** (đã có, G1d-1):

```
Archive / Restore Habit → forge.habit.lifecycle-transitioned.v1 cùng transaction với update
→ RecordHabitLifecycleHandler (Garden) → ARCHIVED thành RESTED, RESTORED thành RESUMED, vào ngày hiệu lực

Trash / Untrash Habit → forge.habit.trashed.v1 / forge.habit.restored-from-trash.v1
→ HideTrashedHabitHandler / ShowRestoredHabitHandler → đặt / xóa hidden_at của cây
```

Cây trong Thùng rác chỉ bị ẩn; sổ giữ nguyên (BR-GDN-SB-007). Đưa Habit đang sống vào Thùng rác phát thêm `ARCHIVED`, nên những ngày trong Thùng rác là nghỉ (BR-GDN-006). Lưu trữ / khôi phục từ trước G1d được nạp lịch sử (G1e) ghi lại thành `RESTED` / `RESUMED`, kể cả lần vào Thùng rác từ trạng thái sống (Forge đã lưu nó là `ARCHIVED`). Với Thùng rác, G1e chỉ đặt `hidden_at` theo trạng thái hiện tại; các lần vào/ra Thùng rác trước đó không dựng lại được.

**Nhịp** (đã có, G1d-2) (Habit BUILD):

```
Tạo Habit BUILD / đổi tần suất → forge.habit.schedule-version-started.v1 cùng transaction
→ RecordHabitRhythmHandler (Garden) → RHYTHM_SET từ ngày hiệu lực, detail = { type, days }
```

Lúc tạo, `HabitCreated` ghi vào outbox trước, nên cây được gieo trước khi có nhịp đầu tiên. Đổi lịch nhiều lần trong một ngày ghi nhiều `RHYTHM_SET` cùng ngày; lúc đọc (G2), dòng ghi sau thắng. Lịch có từ trước G1d-2 được nạp lịch sử (G1e) bù lại.

**Đổi tên** (đã có, G2a): đổi tiêu đề Habit phát `forge.habit.renamed.v1` cùng transaction với update; `RenameHabitTreeHandler` cập nhật `garden_subjects.name`. `name_at_planting` giữ tên lúc gieo cho câu chuyện của cây (Q-GDN-10, BR-GDN-009).

**Nạp lịch sử** (đã có, G1e): migration `20261121150000_garden_backfill`, chạy một lần khi deploy, trong một transaction.

| Bước | Nguồn                         | Kết quả                                                                                  |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | `habits` chưa có cây          | gieo (BUILD từ `created_on`, QUIT từ `quit_started_at`), ẩn nếu đang ở Thùng rác         |
| 2–3  | `habits`                      | QUIT dời `planted_on` về ngày bắt đầu bỏ hiện tại; `hidden_at` khớp trạng thái Thùng rác |
| 4    | `habit_check_ins`             | `TENDED`, trừ ngày sổ đã có một lần chăm còn hiệu lực                                    |
| 5    | `habit_relapses`              | `MARKED` / `SCAR` theo múi giờ hiện tại của tài khoản                                    |
| 6    | `habit_lifecycle_transitions` | `RESTED` / `RESUMED`                                                                     |
| 7    | `habit_schedule_versions`     | `RHYTHM_SET`                                                                             |

Mỗi nguồn chỉ ghi phần sổ còn thiếu: ngày nào có n dòng nguồn mà sổ đã có k dòng cùng loại (cùng lịch, với `RHYTHM_SET`) thì chỉ ghi thêm n − k. Nhờ vậy Habit tạo giữa các lát G1a–G1d không bị ghi trùng những gì đã vào sổ lúc chạy thật, và chạy lại không ra dòng mới. Dòng nạp dùng `source_event_id = backfill:<nguồn>:<id>` (BR-GDN-SB-005). Giới hạn: DB không lưu múi giờ lúc tái phạm, nên sẹo nạp lại tính theo múi giờ hiện tại; tài khoản từng đổi múi giờ có thể lệch ngày ở vài sẹo cũ. Múi giờ PostgreSQL không nhận ra thì dùng UTC.

**Luống** (đã có, G4): thêm Habit vào Routine phát `forge.routine.habit-added.v1` (cùng transaction, `aggregateId = habitId` nên luôn tới sau `HabitCreated`, kèm tên Routine). `AssignHabitBedHandler` đặt `bed_id` / `bed_name` chỉ khi cây chưa có luống: luống chốt ở lần đầu Habit vào một Routine, rời Routine hay vào Routine khác sau đó không dời cây (BR-GDN-008). Migration `20261122090000_garden_beds` nạp luống từ lịch sử thành viên. Với dữ liệu cũ đây là ước lượng tốt nhất: bảng lịch sử thành viên được dựng từ thành viên hiện tại, không giữ các lần rời Routine trước đó và ngày vào là ngày suy ra, nên "Routine đầu tiên" của Habit cũ có thể là một Routine vào sau. CHECK `garden_subjects_bed_complete` giữ `bed_id` và `bed_name` luôn cùng có hoặc cùng không. Đổi tên Routine sau đó không đổi tên luống. Client xếp mỗi luống thành một cụm trên nền đất riêng, cây không có luống đứng dọc lối đá (`lib/garden-layout.ts`).

**Đọc** (đã có, G2b) (người dùng mở vườn):

```
GET /garden → GetGardenHandler
→ PrismaGardenLedgerReader: garden_subjects không ẩn + garden_entries theo thứ tự ghi
→ hôm nay theo múi giờ tài khoản
→ garden-week.ts (thuần): gardenWeeks → chuỗi tuần CARED / PENDING / RESTED / SKIPPED + sẹo; weedsAfter → bậc cỏ
→ GardenResponse { today, trees: [{ id, subjectKind, subjectId, variant, name, nameAtPlanting, bed, simVersion, plantedOn, weeks: [{ start, status, scarred }], weeds }] }
→ client (G3b, /garden): grow(tree.simVersion, { seed: tree.id, species: tree.variant === 'QUIT' ? 'thorn-bush' : 'tree', weeks: tree.weeks }) dựng hình học → three.js vẽ
```

Server chỉ gửi chuỗi tuần; việc mọc cây chạy ở trình duyệt. `garden-sim` v1 lấy nguyên thuật toán của bản phác "Khu vườn của Tú 3D": tuần `CARED` mọc 4 nhịp (có sẹo thì để một vòng sẹo trên thân); tuần `RESTED` đứng yên, chăm lại sau đó thì cành bẻ hướng và để mắt gỗ; tuần `SKIPPED` (lưu trữ) và `PENDING` không làm gì, nên khôi phục là mọc tiếp từ chỗ cũ, không có dấu (BR-GDN-005). Test của gói so dấu vân tay của cây (số node, vị trí node cuối, vị trí sẹo) với bản phác để v1 không bị đổi. Mắt gỗ không có trong response: garden-sim suy ra từ một tuần `CARED` đi sau `RESTED`. Policy được kiểm bằng 9 ví dụ của BA §8.8 (`garden-week.spec.ts`).

## 6. Thêm một module mới

| Việc                                                       | Ở đâu                                                    | Đụng lõi?     |
| ---------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| Module phát sự kiện                                        | context của module                                       | không         |
| Viết nguồn: handler dịch contract + nạp lịch sử            | `garden/infrastructure/outbox/`                          | không         |
| Viết nhịp, nếu là loại cây                                 | `garden/domain/rhythm/`                                  | không         |
| Đăng ký handler vào `providers`, nhịp vào `GARDEN_RHYTHMS` | `garden.module.ts`                                       | vài dòng      |
| Giá trị enum mới, nếu cần                                  | Prisma + contracts                                       | một migration |
| Giống cây mới, nếu cần; thiếu thì dùng `fallback`          | `garden-sim/versions/` (phiên bản mới) + registry client | không         |
| Chạy nạp lịch sử một lần                                   | lệnh                                                     | không         |

Trước khi thêm, module phải qua KD-GDN-011: việc của nó là chăm sóc hoặc nhìn lại, không phải đo đếm.

## 7. Dữ liệu

Hiện có bốn Prisma enum: `GardenSubjectKind` (`HABIT`) và `GardenVariant` (`BUILD`, `QUIT`) cho `garden_subjects`, `GardenEntryKind` (`TENDED`, `UNTENDED`, `MARKED`, `RESTED`, `RESUMED`, `RHYTHM_SET`) và `GardenMark` (`SCAR`) cho `garden_entries`; cột `mark` chỉ có giá trị khi `kind = MARKED`, cột `detail` (JSONB, `{ type, days }`) chỉ có giá trị khi `kind = RHYTHM_SET`; cả hai được giữ bằng CHECK. `garden_entries` thuộc về một chủ thể (`ON DELETE CASCADE`), nên nhổ cây thì sổ đi theo. `garden_entries.sequence` (BIGSERIAL) là thứ tự ghi: phần đọc xếp sổ theo nó, vì `recorded_at` có thể trùng (cùng mili giây, hoặc mọi dòng của lần nạp lịch sử). `garden_subjects.name` là tên hiện tại, đổi theo Habit; `name_at_planting` không bao giờ đổi. G2a thêm `name` cho phép null để server cũ còn gieo được cây trong lúc deploy; G2b đồng bộ lại `name` từ `habits.title` cho mọi cây (server cũ có thể đã đổi tên mà không phát `HabitRenamed`) rồi đặt `NOT NULL`. `garden_subjects.hidden_at` khác null khi Habit nằm trong Thùng rác. Các loại sổ khác là dự kiến. Thêm loại mới là thêm giá trị enum kèm một migration nhỏ, giống `ActivityEvent.kind`.
