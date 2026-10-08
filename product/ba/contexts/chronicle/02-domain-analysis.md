# Chronicle — Domain Analysis

> **Status:** Candidate / Draft
>
> **Domain:** Chronicle
>
> **Purpose:** Xác định domain model cho Chronicle V1 — Snapshot entity,
> cơ chế đóng băng theo tháng, và ngữ nghĩa reader cho từng module nguồn.

---

## 1. Related Documentation

`01-ba-overview.md` (Chronicle) — authoritative baseline, đặc biệt
KD-CHR-002 (live compute tháng hiện tại / snapshot tháng đã đóng),
KD-CHR-009 (tháng đã đóng dựng lại từ lịch sử rồi đóng băng), KD-CHR-011
(ranh giới tháng theo owner's time zone).

`../forge/temporal-history/02-domain-analysis.md` — lịch sử Habit/Routine
và quy tắc "trạng thái tại ngày D" (§4) mà reader Habit/Routine dùng.

---

## 2. Domain Analysis Principles

### DAP-CHR-001 — One Generic Section Table, Not One Table Per Module

**(Đã đổi từ thiết kế ban đầu — xem lý do bên dưới)** Chronicle dùng
1 bảng con generic duy nhất, `ChronicleSnapshotSection`
(`snapshotId`, `module`, `data: Json`), thay vì 1 bảng Prisma riêng
cho mỗi module nguồn. Mỗi module (Habit, Routine, Project, Journal,
Mood, Memory) là 1 row trong bảng này, phân biệt bằng cột `module`
(string), với `data` chứa toàn bộ số liệu của module đó dưới dạng
JSON — bao gồm cả các mảng con trước đây định làm bảng riêng
(`quitHabits`, `mood.distribution`) nay nằm ngay trong `data`.

**Lý do đổi từ "mỗi module 1 bảng"**: Chronicle được xác định sẽ có
rất nhiều module nguồn tham gia theo thời gian (không dừng ở 6 module
V1 — KD-CHR-005 đã dự trù Task, Goal, v.v.). Với thiết kế "mỗi module
1 bảng", thêm 1 module mới luôn cần 1 migration (bảng mới, quan hệ
mới), và đọc/ghi 1 snapshot đầy đủ có độ phức tạp tăng tuyến tính
theo số module (N bảng cần join khi đọc, N câu insert khi ghi). Với
thiết kế generic-section, thêm module mới chỉ là thêm 1 giá trị
`module` mới + 1 TypeScript type tương ứng ở tầng application —
**không migration, không đổi shape query** (luôn luôn 1 bảng cha + 1
`include: { sections: true }`), dù có 6 hay 60 module. Type-safety
cho `data` chuyển sang tầng application (1 discriminated union
`ChronicleSectionData`, mỗi module 1 interface, validate bằng Zod
trước khi ghi) thay vì được Postgres enforce trực tiếp — chấp nhận
được vì `data` chỉ được ghi từ đúng 1 chỗ trong code (query handler
tạo snapshot), không phải input trực tiếp từ người dùng.

Pattern này tương tự cách các hệ thống có nhiều loại "card"/"widget"
khác nhau trong 1 danh sách vẫn tổ chức (Notion blocks, Stripe
line-item snapshots) — một bảng chứa nhiều "loại nội dung" phân biệt
bằng discriminator, thay vì một bảng riêng cho mỗi loại.

### DAP-CHR-002 — Snapshot Is Created Lazily, Not by a Scheduled Job

Không có cron/worker "đóng tháng". Snapshot của một tháng đã qua được
tạo **đúng 1 lần**, vào lúc có request đầu tiên xem tháng đó (từ bất
kỳ ai — thực tế luôn là chính owner). Lý do: mỗi owner có
`User.timeZone` riêng (KD-CHR-011) — một job chạy theo giờ server sẽ
luôn sai lệch với "nửa đêm" thực tế của một số owner. Lazy-on-view né
hoàn toàn vấn đề chọn giờ chạy job.

### DAP-CHR-003 — Current Month Never Has a Snapshot Row

Tháng hiện tại luôn compute real-time, không tạo/đọc snapshot. Việc
"tháng này có phải tháng hiện tại không" được xác định bằng cách so
`(year, month)` được request với ngày hiện tại theo `owner.timeZone`
— không dựa vào việc có snapshot row hay không (tránh nhầm giữa
"tháng hiện tại" và "tháng đã qua nhưng chưa ai xem lần nào").

### DAP-CHR-004 — Chronicle Readers Read History, Not Current State

**(Đã điều chỉnh 2026-10-08 — thiết kế trước đọc `Habit.isActive`/
`Routine.isActive` hiện tại và cho rằng không cần lifecycle log; điều
đó làm habit đã archive biến mất khỏi các tháng nó từng hoạt động.
Xem `01-ba-overview.md` KD-CHR-009.)**

Mỗi module-reader của Chronicle chỉ đọc dữ liệu **có ngày hiệu lực**,
để dựng lại đúng trạng thái tại từng ngày trong kỳ:

```text
Habit/Routine  — lịch sử Forge (../forge/temporal-history/):
                 lifecycle transition, schedule version, membership,
                 createdOn; cộng HabitCheckIn, HabitRelapse
Project        — ProjectLifecycleTransition
Journal/Mood   — JournalEntry.createdAt (+ state hiện tại, KD-CHR-009)
Memory         — Memory.createdAt (+ state hiện tại, KD-CHR-009)
```

Reader **không** đọc `Habit.isActive`, `Habit.frequencyType/
frequencyDays`, `Routine.isActive`, `RoutineHabit` — đó là trạng thái
hiện tại, chỉ đúng cho hôm nay.

### DAP-CHR-005 — Snapshot Period Is Generic, Not Hardcoded to Month

`ChronicleSnapshot` định danh kỳ bằng 3 field tổng quát thay vì
`year`/`month` cố định: `periodType` (enum `DAY | MONTH | QUARTER |
YEAR`), `periodKey` (string canonical, vd `"2026-09"` cho MONTH,
`"2026-Q3"` cho QUARTER — dùng trong unique constraint), và
`periodStart`/`periodEnd` (`DateTime` thật, dùng để range-query và so
sánh biên thay vì parse `periodKey`). V1 chỉ dùng `periodType =
MONTH` — API contract (`03-api-contract.md`) vẫn chỉ expose
`/chronicle/:year/:month`, `periodKey` được tính từ `year`/`month`
ở tầng application (`computePeriodKey`), không lộ ra ngoài response.

**Hai loại ranh giới (KD-CHR-011)**: value object `ChroniclePeriod`
mang 2 cặp ranh giới nửa mở `[from, to)`, vì dữ liệu nguồn có 2 kiểu
cột khác nhau:

```text
firstDate/endDate — ngày lịch date-only (YYYY-MM-DDT00:00Z)
  → cho cột date-only đã lưu ngày lịch của owner (vd HabitCheckIn.date)
  → so trực tiếp, KHÔNG quy đổi múi giờ (tránh lệch thêm 1 lần nữa)

start/end — instant thật của 00:00 đầu tháng / đầu tháng sau
            tại owner.timeZone (vd tháng 9/2026 ở UTC+7:
            2026-08-31T17:00Z → 2026-09-30T17:00Z)
  → cho cột timestamp (JournalEntry.createdAt, Memory.createdAt,
    ProjectLifecycleTransition.occurredAt)
  → đây cũng là giá trị lưu vào periodStart/periodEnd của snapshot
```

Dùng nhầm cặp ranh giới là lỗi bị "đóng băng" vĩnh viễn trong
snapshot của tháng đã đóng, nên mỗi reader phải ghi rõ nó dùng cặp
nào cho từng cột.

**Lý do tổng quát hóa ngay từ V1**: cùng lý do với DAP-CHR-001 (tránh
migration khi mở rộng) — nếu sau này cần Chronicle theo tuần/quý/năm,
`ChronicleSnapshot` không cần đổi cấu trúc, chỉ thêm giá trị
`periodType` mới + endpoint mới map sang cùng bảng. `@@unique` đổi
từ `(ownerId, year, month)` thành `(ownerId, periodType, periodKey)`.

### DAP-CHR-006 — One Reader Contract, Registered, Not Wired by Hand

Mọi module-reader implement **cùng 1 interface** và tự khai báo nó
thuộc module nào, thay vì mỗi module 1 port/token riêng mà query
handler phải inject từng cái:

```typescript
interface ChronicleSectionReader<M extends ChronicleModule> {
  readonly module: M; // 'habit' | 'journal' | ...
  readonly schemaVersion: number; // DAP-CHR-008
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ChronicleSectionDataByModule[M]>;
}
```

Mọi reader được gom vào 1 token duy nhất (`CHRONICLE_SECTION_READERS`,
mảng). Query handler chỉ duyệt mảng đó — không biết có bao nhiêu
module, không biết tên module nào.

**Thêm module mới** = thêm 1 giá trị vào `CHRONICLE_MODULES` + 1 type
section-data + 1 reader + 1 dòng đăng ký. Query handler, repository
snapshot và bảng database **không đổi**. (Response API và giao diện vẫn
cần thêm field/khối hiển thị cho module mới — đó là phần trình bày,
không phải phần tính toán.)

**Kiểm tra khi khởi động**: mỗi giá trị trong `CHRONICLE_MODULES` phải
có đúng 1 reader trong registry — thiếu hoặc trùng thì app không khởi
động được (fail fast), thay vì lỗi âm thầm lúc người dùng mở Chronicle.

### DAP-CHR-007 — A Snapshot Can Gain Sections, Never Lose or Change Them

Snapshot được tạo với đúng các module tồn tại **lúc đó**. Khi có module
mới (vd Task), snapshot cũ không có section `task`. Quy tắc:

```text
Đọc snapshot của kỳ đã đóng:
  với mỗi reader trong registry:
    section của module đó đã có → dùng (DAP-CHR-008)
    chưa có → tính section đó cho đúng kỳ của snapshot, LƯU THÊM vào
              snapshot, rồi dùng
```

Section đã có không bao giờ bị sửa hay xóa vì lý do này — snapshot chỉ
được **thêm** section còn thiếu. Vì reader đọc dữ liệu có ngày hiệu lực
(DAP-CHR-004), section tính bù cho tháng cũ vẫn đúng với tháng đó.

Section của module không còn trong registry (module bị gỡ khỏi
Chronicle) được bỏ qua khi đọc, không bị xóa.

### DAP-CHR-008 — Every Section Carries Its Schema Version

Shape của `data` sẽ thay đổi theo thời gian (vd thêm chỉ số mới cho
Habit). Mỗi section lưu kèm `schemaVersion` — phiên bản shape mà reader
đã dùng lúc ghi. Mỗi reader khai báo phiên bản hiện tại của nó
(DAP-CHR-006). Khi đọc section:

```text
section.schemaVersion = reader.schemaVersion  → dùng nguyên
section.schemaVersion < reader.schemaVersion  →
  a. Thay đổi bổ sung có giá trị mặc định suy ra được (vd thêm field
     mảng → mặc định rỗng): reader cung cấp hàm nâng cấp, chạy trong
     bộ nhớ khi đọc, KHÔNG ghi lại.
  b. Thay đổi không suy ra được từ data cũ: tính lại section từ lịch sử
     và THAY THẾ section đó với schemaVersion mới.
section.schemaVersion > reader.schemaVersion  → lỗi hệ thống (code
  cũ hơn dữ liệu — không được xảy ra khi deploy đúng thứ tự)
```

Trường hợp (b) là **ngoại lệ có chủ đích duy nhất** của tính bất biến
snapshot. Nó an toàn vì section được tính lại từ cùng dữ liệu lịch sử
(DAP-CHR-004), không phải từ trạng thái hiện tại. Mỗi lần nâng phiên
bản, người viết reader phải ghi rõ thay đổi đó thuộc (a) hay (b).

---

## 3. Domain Concepts

### 3.1. ChronicleSnapshot (Entity mới, cha)

```text
ChronicleSnapshot
├── ChronicleSnapshotId
├── ownerId
├── periodType: DAY | MONTH | QUARTER | YEAR   (V1 chỉ dùng MONTH)
├── periodKey            (string canonical, vd "2026-09" — unique key)
├── periodStart          (DateTime, đầu kỳ)
├── periodEnd            (DateTime, cuối kỳ)
├── computedAt           (thời điểm snapshot được tạo, không phải
│                         thời điểm kỳ kết thúc)
└── sections: ChronicleSnapshotSection[]   (1 dòng / module — §3.2)
```

Unique theo `(ownerId, periodType, periodKey)` — mỗi owner chỉ có tối
đa 1 snapshot cho mỗi kỳ (DAP-CHR-005).

**Không có `updatedAt`** — snapshot bất biến sau khi tạo (KD-CHR-009).
Không có `expectedRevision`/optimistic concurrency vì không ai được
sửa nó qua API.

### 3.2. ChronicleSnapshotSection (Entity mới, generic — DAP-CHR-001)

```text
ChronicleSnapshotSection
├── snapshotId
├── module: string        ("habit" | "routine" | "project" | "journal"
│                          | "mood" | "memory", mở rộng được)
├── schemaVersion: int    (phiên bản shape của `data` — DAP-CHR-008)
├── computedAt            (lúc section này được tính — có thể muộn hơn
│                          snapshot.computedAt nếu là section tính bù,
│                          DAP-CHR-007)
└── data: Json            (shape theo `module`, xem dưới)
```

Unique theo `(snapshotId, module)` — mỗi module chỉ có 1 section /
snapshot.

`data` của mỗi `module` theo shape TypeScript sau (định nghĩa và
validate ở tầng application, không phải Prisma model):

```typescript
interface HabitSectionData {
  buildCompletionRate: number; // 0.0–1.0, gộp mọi Habit BUILD có ngày due (§5)
  bestStreak: { habitTitle: string; days: number } | null;
  mostConsistentHabit: {
    habitTitle: string;
    completionRate: number;
  } | null;
  quitHabits: Array<{ habitTitle: string; daysSinceLastRelapse: number }>;
}

interface RoutineSectionData {
  completionRate: number; // 0.0–1.0
}

interface ProjectSectionData {
  activeCount: number;
  completedCount: number;
  stoppedCount: number;
}

interface JournalSectionData {
  entryCount: number;
}

interface MoodSectionData {
  dominantMood: MoodLabel | null;
  distribution: Partial<Record<MoodLabel, number>>; // label → count,
  // chỉ chứa label có count > 0
}

interface MemorySectionData {
  memoryCount: number;
}
```

**Vì sao `quitHabits` và `distribution` nằm trong `data` (JSON) thay
vì bảng con riêng:** trong thiết kế "mỗi module 1 bảng" trước đây,
2 mảng này cần bảng 1-N riêng vì Prisma model không biểu diễn được
mảng lồng trong 1 row. Sau khi chuyển `data` sang JSON (DAP-CHR-001),
mảng lồng không còn là vấn đề — `quitHabits`/`distribution` là 1
phần bình thường của `data`, không cần bảng riêng, không mất
type-safety vì được validate bằng Zod schema tương ứng với từng
interface ở trên trước khi ghi.

`MoodLabel` vẫn là enum Prisma có sẵn (10 giá trị: `JOYFUL`, `CALM`,
`HOPEFUL`, `ENERGETIC`, `NEUTRAL`, `TIRED`, `ANXIOUS`, `SAD`, `ANGRY`,
`OVERWHELMED`) — `MoodSectionData` tái dùng type này ở tầng
TypeScript dù lưu trong JSON, không phải string tự do.

---

## 4. Snapshot Lifecycle

```text
GetMonthlyChronicleQuery(ownerId, year, month):
  1. periodKey = computePeriodKey(MONTH, year, month)
     (periodStart/periodEnd tính theo owner.timeZone — KD-CHR-011)
  2. isCurrentMonth = (year, month) == hôm nay theo owner.timeZone
  3. if isCurrentMonth:
       → compute trực tiếp từ mọi reader trong registry (DAP-CHR-006),
         KHÔNG đọc/ghi snapshot
       → trả kết quả, không persist
  4. if !isCurrentMonth:
       → tìm ChronicleSnapshot theo (ownerId, MONTH, periodKey)
       → nếu có →
           a. đọc snapshot + sections
           b. section thiếu → tính bù + lưu thêm (DAP-CHR-007)
           c. section phiên bản cũ → nâng cấp trong bộ nhớ, hoặc tính
              lại + thay thế (DAP-CHR-008)
           d. trả về
       → nếu chưa có →
           a. compute từ mọi reader trong registry (như tháng hiện tại)
           b. persist thành ChronicleSnapshot + 1 ChronicleSnapshotSection
              / module, kèm schemaVersion (1 transaction)
           c. trả kết quả vừa compute
```

Các bước ghi ở 4 (tạo snapshot, tính bù section, thay thế section
phiên bản cũ) là **write duy nhất** trong toàn bộ Chronicle — xảy ra ở
query handler (đọc), không phải command handler, vì về bản chất nó
là "cache warm-up", không phải mutation do người dùng khởi xướng
(KD-CHR-001 vẫn đúng: không có create/update/delete từ phía người
dùng).

**Race khi 2 request cùng tính bù 1 section**: `@@unique([snapshotId,
module])` — request thứ 2 nhận `P2002`, đọc lại section vừa được ghi
(cùng pattern với tạo snapshot bên dưới).

**Race condition khi 2 request đồng thời cùng tạo snapshot lần đầu**
(vd 2 tab cùng mở Chronicle tháng vừa đóng): dùng
`@@unique([ownerId, periodType, periodKey])` — request thứ 2 insert
trùng sẽ nhận `P2002`, xử lý như "đã tồn tại, đọc lại" (cùng pattern
`HabitCheckIn`/`P2002` đã dùng — idempotent-by-verification, không
throw).

---

## 5. Reader Contracts (ngữ nghĩa đã chốt)

```text
Thuật ngữ chung cho Habit/Routine (định nghĩa đầy đủ ở
../forge/temporal-history/02-domain-analysis.md §4):
  Ngày trong kỳ — mọi ngày lịch D với period.firstDate ≤ D <
    period.endDate; với kỳ hiện tại chỉ tính tới HÔM NAY (bao gồm)
    theo owner.timeZone.
  dueOn(habit, D) — Habit BUILD sống vào D VÀ tần suất có hiệu lực
    vào D đến hạn ở thứ của D.
  "Ngày due" của 1 Habit — ngày trong kỳ có dueOn = true.
  "Ngày hoàn thành" — ngày due có HabitCheckIn với date = D.
    Check-in trên ngày không due không được đếm.
  Mọi so sánh dùng period.firstDate/endDate (date-only), vì
    HabitCheckIn.date và mọi mốc lịch sử Forge đều là ngày lịch.

Habit (BUILD) — buildCompletionRate:
  (tổng số ngày hoàn thành của mọi Habit BUILD) / (tổng số ngày due
    của mọi Habit BUILD) — gộp chung, không phải trung bình tỷ lệ
    từng Habit (Habit đến hạn nhiều ngày hơn có trọng số lớn hơn).
  Kỳ hiện tại: chỉ tính tới hôm nay — tránh tỷ lệ thấp giả tạo ở
    đầu tháng.
  Habit tham gia = mọi Habit BUILD có ≥ 1 ngày due trong kỳ, kể cả
    Habit nay đã archive (DAP-CHR-004).
  0 nếu không có ngày due nào.

Habit (BUILD) — bestStreak:
  Với từng Habit: chuỗi dài nhất các ngày due LIÊN TIẾP (bỏ qua ngày
    không due, không bỏ qua ngày due bị lỡ) đều là ngày hoàn thành,
    chỉ xét trong kỳ. Lấy Habit có chuỗi dài nhất; hòa thì Habit có
    createdOn sớm hơn, rồi id. `null` nếu không Habit nào có chuỗi > 0.

Habit (BUILD) — mostConsistentHabit (SC-CHR-005):
  Tính completion rate riêng cho từng Habit BUILD tham gia (cùng công
    thức/mẫu số như buildCompletionRate ở trên, nhưng theo từng Habit
    thay vì gộp cả owner). Chỉ xét Habit có **ít nhất 7 ngày
    due đã qua** trong tháng đó — loại trừ Habit vừa tạo cuối tháng
    (vd tạo ngày 28/30, mới có 2-3 ngày due, 1 check-in đã thành 100%
    và thắng giả tạo trước Habit đã bền bỉ cả tháng), và loại trừ hẳn
    trường hợp 0 ngày due (0/0, không xác định — vd Habit WEEKLY chưa
    tới ngày due nào trong tháng). Trong số Habit đủ điều kiện, lấy
    Habit có tỷ lệ cao nhất; hòa thì lấy Habit được tạo sớm nhất
    (tie-break xác định được). `null` nếu owner không có Habit BUILD
    nào đủ điều kiện (kể cả khi có Habit BUILD nhưng tất cả đều dưới
    ngưỡng 7 ngày due).

Habit (QUIT) — hiển thị:
  Habit tham gia = Habit QUIT sống ≥ 1 ngày trong kỳ VÀ quitStartedAt
    ≤ ngày mốc của nó.
  Ngày mốc = ngày sống cuối cùng của Habit trong kỳ (kỳ đã đóng: tối
    đa ngày cuối tháng; kỳ hiện tại: tối đa hôm nay).
  "daysSinceLastRelapse" tính TẠI NGÀY MỐC theo đúng công thức
    BR-HAB2-004 (relapse gần nhất có occurredAt ≥ quitStartedAt và
    ngày lịch ≤ ngày mốc; không có thì tính từ quitStartedAt) — không
    tính tại thời điểm tạo snapshot, để kết quả không phụ thuộc lúc
    xem.
  Không đếm số lần relapse trong tháng ở V1.

Routine — completionRate:
  Routine không có bản ghi "buổi" riêng — buổi được suy ra từ check-in
    của các Habit thành viên:
  Buổi của Routine R vào ngày D tồn tại khi:
    R sống vào D VÀ có ≥ 1 Habit H với memberOn(R, H, D) và dueOn(H, D).
  Buổi đó HOÀN THÀNH khi mọi Habit H như trên đều có check-in ngày D
    (tất cả hoặc không — 1 buổi là 1 đơn vị, không tính điểm từng phần).
  completionRate = (tổng buổi hoàn thành của mọi Routine) / (tổng số
    buổi của mọi Routine) trong kỳ; kỳ hiện tại chỉ tính tới hôm nay.
  0 nếu không có buổi nào.

Project — "active trong tháng" (SC-CHR-006):
  Có ở trạng thái ACTIVE vào bất kỳ ngày nào trong tháng — dùng
    ProjectLifecycleTransition (đã tồn tại) để xác định, KHÔNG chỉ
    dựa vào lifecycleState hiện tại (một Project active cả tháng rồi
    Stop ngay cuối tháng vẫn phải tính là "active trong tháng đó").
  "Completed"/"Stopped" trong tháng: có ProjectLifecycleTransition
    với toState tương ứng và occurredAt nằm trong tháng.

Journal — entryCount:
  JournalEntry không có field `sealedAt` — chỉ có `createdAt`,
    `updatedAt`, `state` (DRAFT/SEALED/TRASHED), `trashedAt`. Đếm
    JournalEntry có `createdAt` nằm trong tháng, `state = SEALED`
    (không tính DRAFT — chưa phải một entry đã hoàn thành) VÀ khác
    TRASHED (nhất quán với cách list Journal bình thường loại trừ
    trashed — KD-CHR-009 chấp nhận số có thể trôi nếu user trash entry
    cũ trước lần xem đầu tiên của tháng đó).

Mood — dominantMood/distribution:
  Đếm Mood theo `label`, gắn với JournalEntry có `createdAt` trong
    tháng và `state = SEALED` (Mood có `createdAt` riêng, nhưng không
    có ý nghĩa "ngày cảm thấy thế nào" độc lập với Journal entry nó
    gắn vào — 1 Mood luôn thuộc về đúng 1 JournalEntry qua
    `journalEntryId` unique — nên tháng của Mood đi theo tháng của
    JournalEntry, cùng field lọc với Journal ở trên, không dùng
    `Mood.createdAt` riêng).
  dominantMood = label có count cao nhất; hòa thì lấy label xuất
    hiện sớm nhất trong tháng (tie-break xác định được, không random).

Memory — memoryCount:
  Đếm Memory có createdAt nằm trong tháng VÀ state khác TRASHED
    (cùng lý do với Journal).

Lower bound navigation:
  Không có chặn cứng ở tầng backend cho tháng trước khi tạo account —
    đúng tinh thần UN-CHR-004/KD-CHR-004 ("không block navigation,
    không throw error"). Một tháng trước `User.createdAt` tự nhiên
    không có data ở bất kỳ module nào, nên 6 reader tự trả về zeros
    như mọi tháng trống khác, không cần logic đặc biệt để "chặn" nó.
    `User.createdAt` chỉ hữu ích như metadata để client tự quyết định
    có disable nút "tháng trước" hay không — không phải một invariant
    domain, và không nằm trong V1 API contract (03-api-contract.md).
```

---

## 6. Domain Invariant Summary

| Invariant                                                                  | Enforced By                                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Mỗi owner tối đa 1 snapshot / kỳ                                           | `@@unique([ownerId, periodType, periodKey])` (DAP-CHR-005)           |
| Mỗi module tối đa 1 section / snapshot                                     | `@@unique([snapshotId, module])` (DAP-CHR-001)                       |
| Tháng hiện tại không có snapshot row                                       | Query handler kiểm tra trước khi đọc/ghi (DAP-CHR-003)               |
| Section đã ghi không bị sửa/xóa — trừ thay thế khi nâng phiên bản loại (b) | Chỉ có insert section thiếu + replace theo DAP-CHR-008 (DAP-CHR-007) |
| Mỗi module trong `CHRONICLE_MODULES` có đúng 1 reader                      | Kiểm tra lúc khởi động (DAP-CHR-006)                                 |
| Section mang `schemaVersion` ≤ phiên bản reader hiện tại                   | Kiểm tra khi đọc (DAP-CHR-008)                                       |
| Không navigate quá tháng hiện tại                                          | KD-CHR-007 (upper bound)                                             |
| Tháng trước khi tạo account trả về zeros, không lỗi                        | Mọi reader tự trả zeros — backend không chặn (§5)                    |
| Số liệu Habit/Routine không phụ thuộc lúc xem lần đầu                      | Reader đọc lịch sử Forge, không đọc state hiện tại (DAP-CHR-004)     |
| Race tạo snapshot đồng thời không tạo 2 bản ghi trùng                      | `P2002` + đọc lại (idempotent, giống `HabitCheckIn`)                 |

---

## 7. Out of Scope for Domain Analysis

```text
- Cơ chế invalidate/tính lại snapshot đã tạo theo yêu cầu (Open
  Analysis 01-ba-overview.md §9) — V1 chấp nhận snapshot sai (do bug)
  là sai vĩnh viễn, không có công cụ sửa tay. Ngoại lệ duy nhất là
  tính lại có chủ đích khi nâng schemaVersion loại (b) — DAP-CHR-008.
  Một bug trong reader có thể được sửa bằng cách nâng schemaVersion
  và khai báo loại (b), nhưng đó là quyết định của người viết reader,
  không phải công cụ cho người dùng/admin.
- Buffer thời gian quanh ranh giới tháng (request đến đúng lúc dữ
  liệu module nguồn chưa ghi xong) — chấp nhận rủi ro cực nhỏ này ở
  V1, không thiết kế cơ chế trì hoãn/retry.
```

---

## 8. Next Step

```text
03. API Contract (Chronicle)
```
