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
KD-CHR-009 (chỉ tháng hiện tại còn drift), KD-CHR-011 (ranh giới tháng
theo owner's time zone).

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

### DAP-CHR-004 — Chronicle Reader Composes Two Kinds of Source Data

Mỗi module-reader của Chronicle (vd `HabitChronicleReader`) chỉ đọc
2 loại nguồn có sẵn, không tạo thêm bảng trung gian nào ở phía module
gốc:

```text
1. Append-only, đã ổn định vĩnh viễn:
   HabitCheckIn, HabitRelapse, ProjectCycle (đã đóng)
2. Trạng thái hiện tại của aggregate, đọc đúng lúc tạo snapshot:
   Habit.isActive, Routine.isActive, Project.lifecycleState
```

Không cần lifecycle-transition-log dùng chung cho Habit/Routine
(hướng tiếp cận đã cân nhắc và loại bỏ — xem `01-ba-overview.md`
KD-CHR-009) vì snapshot chỉ cần đúng trạng thái **tại thời điểm tạo
snapshot**, không cần tái tạo trạng thái tại một ngày bất kỳ trong
quá khứ.

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

**Lý do tổng quát hóa ngay từ V1**: cùng lý do với DAP-CHR-001 (tránh
migration khi mở rộng) — nếu sau này cần Chronicle theo tuần/quý/năm,
`ChronicleSnapshot` không cần đổi cấu trúc, chỉ thêm giá trị
`periodType` mới + endpoint mới map sang cùng bảng. `@@unique` đổi
từ `(ownerId, year, month)` thành `(ownerId, periodType, periodKey)`.

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
└── data: Json            (shape theo `module`, xem dưới)
```

Unique theo `(snapshotId, module)` — mỗi module chỉ có 1 section /
snapshot.

`data` của mỗi `module` theo shape TypeScript sau (định nghĩa và
validate ở tầng application, không phải Prisma model):

```typescript
interface HabitSectionData {
  buildCompletionRate: number; // 0.0–1.0, chỉ tính Habit BUILD active
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
       → compute trực tiếp từ 6 reader, KHÔNG đọc/ghi snapshot
       → trả kết quả, không persist
  4. if !isCurrentMonth:
       → tìm ChronicleSnapshot theo (ownerId, MONTH, periodKey)
       → nếu có → đọc snapshot + sections, trả về (không compute lại)
       → nếu chưa có →
           a. compute từ 6 reader (như tháng hiện tại)
           b. persist thành ChronicleSnapshot + 6 ChronicleSnapshotSection
              (1 transaction)
           c. trả kết quả vừa compute
```

Bước 4.b là **write duy nhất** trong toàn bộ Chronicle — xảy ra ở
query handler (đọc), không phải command handler, vì về bản chất nó
là "cache warm-up", không phải mutation do người dùng khởi xướng
(KD-CHR-001 vẫn đúng: không có create/update/delete từ phía người
dùng).

**Race condition khi 2 request đồng thời cùng tạo snapshot lần đầu**
(vd 2 tab cùng mở Chronicle tháng vừa đóng): dùng
`@@unique([ownerId, periodType, periodKey])` — request thứ 2 insert
trùng sẽ nhận `P2002`, xử lý như "đã tồn tại, đọc lại" (cùng pattern
`HabitCheckIn`/`P2002` đã dùng — idempotent-by-verification, không
throw).

---

## 5. Reader Contracts (ngữ nghĩa đã chốt)

```text
Habit (BUILD) — completion rate:
  Tháng hiện tại: (số ngày đã check-in) / (số ngày due tính đến hôm
    nay trong tháng, theo owner.timeZone) — KHÔNG lấy mẫu số cả
    tháng, tránh completion rate luôn thấp giả tạo ở đầu tháng.
  Tháng đã đóng: mẫu số = số ngày due của cả tháng (tự nhiên đúng vì
    tháng đã trôi qua hết).
  Chỉ tính Habit có isActive=true tại thời điểm tạo snapshot
    (DAP-CHR-004).

Habit (BUILD) — mostConsistentHabit (SC-CHR-005):
  Tính completion rate riêng cho từng Habit BUILD active (cùng công
    thức/mẫu số như buildCompletionRate ở trên, nhưng theo từng Habit
    thay vì trung bình cả owner). Chỉ xét Habit có **ít nhất 7 ngày
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
  Chỉ "daysSinceLastRelapse" tại cuối tháng (hoặc tại thời điểm tạo
    snapshot cho tháng vừa đóng) — dùng chung công thức với
    HabitProgressReader đã có (BR-HAB2-004), không cần logic tính mới.
  Không đếm số lần relapse trong tháng ở V1.

Routine — completion rate:
  (số buổi đã hoàn thành) / (số buổi có thể hoàn thành trong tháng,
    tính đến hôm nay nếu là tháng hiện tại) — cùng nguyên tắc mẫu số
    "đến hôm nay" như Habit.

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

| Invariant                                             | Enforced By                                                |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| Mỗi owner tối đa 1 snapshot / kỳ                      | `@@unique([ownerId, periodType, periodKey])` (DAP-CHR-005) |
| Mỗi module tối đa 1 section / snapshot                | `@@unique([snapshotId, module])` (DAP-CHR-001)             |
| Tháng hiện tại không có snapshot row                  | Query handler kiểm tra trước khi đọc/ghi (DAP-CHR-003)     |
| Snapshot bất biến sau khi tạo                         | Không có update/delete path nào trong application layer    |
| Không navigate quá tháng hiện tại                     | KD-CHR-007 (upper bound)                                   |
| Không navigate trước tháng tạo account                | User.createdAt (lower bound, §5)                           |
| Race tạo snapshot đồng thời không tạo 2 bản ghi trùng | `P2002` + đọc lại (idempotent, giống `HabitCheckIn`)       |

---

## 7. Out of Scope for Domain Analysis

```text
- Cơ chế invalidate/tính lại snapshot đã tạo (Open Analysis
  01-ba-overview.md §9) — V1 chấp nhận snapshot sai (do bug) là sai
  vĩnh viễn, không có công cụ sửa. Nếu cần, đây là một phase riêng
  sau V1 (vd endpoint admin xóa snapshot để buộc tính lại).
- Buffer thời gian quanh ranh giới tháng (request đến đúng lúc dữ
  liệu module nguồn chưa ghi xong) — chấp nhận rủi ro cực nhỏ này ở
  V1, không thiết kế cơ chế trì hoãn/retry.
```

---

## 8. Next Step

```text
03. API Contract (Chronicle)
```
