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

### DAP-CHR-001 — One Snapshot Table Per Source Module, Not One Wide Table

Mỗi module nguồn (Habit, Routine, Project, Journal, Mood, Memory) có
bảng snapshot con riêng, nối vào 1 bảng cha `ChronicleSnapshot` qua
`snapshotId`. Không dùng 1 bảng rộng chứa mọi field của mọi module,
và không dùng JSON blob. Lý do: nhất quán với cách toàn bộ hệ thống
đã tổ chức dữ liệu — mỗi context sở hữu bảng của riêng mình
(`HabitRelapse`, `HabitCheckIn`, `ProjectCycle` không nằm chung 1
bảng), giữ type-safety qua Prisma, và cho phép thêm module mới (Task,
Goal — KD-CHR-005) bằng cách tạo bảng mới, không sửa bảng đang tồn
tại.

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

---

## 3. Domain Concepts

### 3.1. ChronicleSnapshot (Entity mới, cha)

```text
ChronicleSnapshot
├── ChronicleSnapshotId
├── ownerId
├── year
├── month
├── createdAt          (thời điểm snapshot được tạo, không phải
│                        thời điểm tháng kết thúc)
└── (quan hệ 1-1 tùy chọn tới 6 bảng con — §3.2)
```

Unique theo `(ownerId, year, month)` — mỗi owner chỉ có tối đa 1
snapshot cho mỗi tháng.

**Không có `updatedAt`** — snapshot bất biến sau khi tạo (KD-CHR-009).
Không có `expectedRevision`/optimistic concurrency vì không ai được
sửa nó qua API.

### 3.2. Bảng con theo module (Entity mới, mỗi module một bảng)

```text
ChronicleHabitSnapshot
├── snapshotId
├── buildCompletionRate         (0.0–1.0, chỉ tính Habit BUILD active
│                                tại thời điểm tạo snapshot)
├── bestStreakHabitTitle
├── bestStreakDays
├── mostConsistentHabitTitle
├── mostConsistentCompletionRate
└── quitHabits: ChronicleQuitHabitSnapshot[]  (1 dòng / Habit QUIT)

ChronicleQuitHabitSnapshot
├── snapshotId
├── habitTitle
└── daysSinceLastRelapse    (tại cuối tháng, hoặc tại thời điểm tạo
                             snapshot nếu tháng đó là tháng vừa đóng)

ChronicleRoutineSnapshot
├── snapshotId
└── completionRate          (0.0–1.0)

ChronicleProjectSnapshot
├── snapshotId
├── activeCount
├── completedCount
└── stoppedCount

ChronicleJournalSnapshot
├── snapshotId
└── entryCount

ChronicleMoodSnapshot
├── snapshotId
├── dominantMood: MoodLabel?
└── distribution: ChronicleMoodDistributionEntry[]  (1 dòng / label
                                                      có count > 0)

ChronicleMoodDistributionEntry
├── snapshotId
├── label: MoodLabel     (tái dùng enum MoodLabel đã có ở Mood domain)
└── count

ChronicleMemorySnapshot
├── snapshotId
└── memoryCount
```

**Vì sao QUIT Habit là bảng con riêng (`ChronicleQuitHabitSnapshot`),
không phải field trên `ChronicleHabitSnapshot`:** số lượng Habit
QUIT-type của một owner không cố định (0, 1, hay nhiều) — không thể
biểu diễn bằng field cố định. Đây là bảng 1-N thật sự, không phải
JSON, vì mỗi dòng có type rõ ràng (`habitTitle`, `daysSinceLastRelapse`)
và số lượng dòng nhỏ (bằng số Habit QUIT của owner tại thời điểm đó).

**Vì sao `distribution` là bảng con (`ChronicleMoodDistributionEntry`),
không phải JSON:** `MoodLabel` là enum Prisma cố định 10 giá trị
(`JOYFUL`, `CALM`, `HOPEFUL`, `ENERGETIC`, `NEUTRAL`, `TIRED`,
`ANXIOUS`, `SAD`, `ANGRY`, `OVERWHELMED`) — không free-form như suy
đoán ban đầu. Vì đã có enum sẵn để tái dùng, một bảng con 1-N (1 dòng
mỗi label có count > 0) vẫn giữ được type-safety đầy đủ qua Prisma,
nhất quán với DAP-CHR-001, không cần ngoại lệ JSON nào cả — đúng cùng
pattern với `ChronicleQuitHabitSnapshot` (1-N, số dòng biến thiên theo
dữ liệu thực tế của owner trong tháng đó, tối đa 10 dòng vì chỉ có 10
label).

---

## 4. Snapshot Lifecycle

```text
GetMonthlyChronicleQuery(ownerId, year, month):
  1. isCurrentMonth = (year, month) == hôm nay theo owner.timeZone
     (KD-CHR-011)
  2. if isCurrentMonth:
       → compute trực tiếp từ 6 reader, KHÔNG đọc/ghi snapshot
       → trả kết quả, không persist
  3. if !isCurrentMonth:
       → tìm ChronicleSnapshot theo (ownerId, year, month)
       → nếu có → đọc snapshot, trả về (không compute lại)
       → nếu chưa có →
           a. compute từ 6 reader (như tháng hiện tại)
           b. persist thành ChronicleSnapshot + 6 bảng con (transaction)
           c. trả kết quả vừa compute
```

Bước 3.b là **write duy nhất** trong toàn bộ Chronicle — xảy ra ở
query handler (đọc), không phải command handler, vì về bản chất nó
là "cache warm-up", không phải mutation do người dùng khởi xướng
(KD-CHR-001 vẫn đúng: không có create/update/delete từ phía người
dùng).

**Race condition khi 2 request đồng thời cùng tạo snapshot lần đầu**
(vd 2 tab cùng mở Chronicle tháng vừa đóng): dùng
`@@unique([ownerId, year, month])` — request thứ 2 insert trùng sẽ
nhận `P2002`, xử lý như "đã tồn tại, đọc lại" (cùng pattern
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

| Invariant                                             | Enforced By                                             |
| ----------------------------------------------------- | ------------------------------------------------------- |
| Mỗi owner tối đa 1 snapshot / tháng                   | `@@unique([ownerId, year, month])`                      |
| Tháng hiện tại không có snapshot row                  | Query handler kiểm tra trước khi đọc/ghi (DAP-CHR-003)  |
| Snapshot bất biến sau khi tạo                         | Không có update/delete path nào trong application layer |
| Không navigate quá tháng hiện tại                     | KD-CHR-007 (upper bound)                                |
| Không navigate trước tháng tạo account                | User.createdAt (lower bound, §5)                        |
| Race tạo snapshot đồng thời không tạo 2 bản ghi trùng | `P2002` + đọc lại (idempotent, giống `HabitCheckIn`)    |

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
