# Chronicle — API Contract

> **Status:** Candidate / Draft
>
> **Domain:** Chronicle
>
> **Purpose:** Xác định API contract cho Chronicle V1 — một endpoint
> đọc duy nhất, không có mutation nào (KD-CHR-001).

---

## 1. Related Documentation

`01-ba-overview.md`, `02-domain-analysis.md` (Chronicle).

---

## 2. ChronicleResponse

```typescript
interface ChronicleResponse {
  year: number;
  month: number; // 1-12
  computedAt: string; // ISO 8601 datetime — lúc số liệu được tính
  // (tháng hiện tại: lúc request này chạy;
  // tháng đã đóng: lúc snapshot được tạo lần đầu)
  habit: ChronicleHabitSection;
  routine: ChronicleRoutineSection;
  project: ChronicleProjectSection;
  journal: ChronicleJournalSection;
  mood: ChronicleMoodSection;
  memory: ChronicleMemorySection;
}

interface ChronicleHabitSection {
  buildCompletionRate: number; // 0.0–1.0 — trung bình completion rate
  // của mọi Habit BUILD active tại thời điểm tính, 0 nếu không có
  // Habit BUILD nào
  bestStreak: { habitTitle: string; days: number } | null; // Habit có
  // streak liên tục dài nhất trong tháng; null nếu không có streak
  // nào > 0
  mostConsistentHabit: { habitTitle: string; completionRate: number } | null;
  // Habit BUILD có completion rate riêng cao nhất trong tháng, trong
  // số Habit có ít nhất 7 ngày due đã qua (tránh Habit mới tạo cuối
  // tháng thắng giả tạo) — khác bestStreak (đo streak liên tục, không
  // phải tỉ lệ tổng thể); null nếu không có Habit BUILD nào đủ điều
  // kiện (xem 02-domain-analysis.md §5, SC-CHR-005)
  quitHabits: Array<{
    habitTitle: string;
    daysSinceLastRelapse: number;
  }>; // rỗng nếu owner không có Habit QUIT-type nào active
}

interface ChronicleRoutineSection {
  completionRate: number; // 0.0–1.0
}

interface ChronicleProjectSection {
  activeCount: number;
  completedCount: number;
  stoppedCount: number;
}

interface ChronicleJournalSection {
  entryCount: number;
}

interface ChronicleMoodSection {
  dominantMood: string | null; // null nếu tháng không có Mood nào
  distribution: Record<string, number>; // label → count, rỗng nếu
  // không có Mood nào
}

interface ChronicleMemorySection {
  memoryCount: number;
}
```

**Không có field nào tiết lộ đây là live-compute hay đọc từ snapshot**
— người dùng không cần biết cơ chế bên trong (KD-CHR-002 là chi tiết
triển khai). `computedAt` đủ để UI hiện "cập nhật lúc..." nếu cần, mà
không rò rỉ khái niệm "snapshot".

---

## 3. Endpoint

### 3.1. Get Monthly Chronicle — `GET /chronicle/:year/:month`

```text
200 OK → ChronicleResponse
```

| Status | Reason                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------- |
| 400    | `year`/`month` không đúng định dạng số nguyên, hoặc `month` ngoài khoảng 1–12 (`CHRONICLE_INVALID_MONTH`) |
| 400    | Tháng nằm trong tương lai so với hôm nay theo `owner.timeZone` (`CHRONICLE_MONTH_IN_FUTURE`, KD-CHR-007)  |
| 401    | Unauthorized                                                                                              |

**Không có 404, và không có lỗi cho tháng trước khi tạo account** —
đúng UN-CHR-004/KD-CHR-004: mọi tháng từ trong quá khứ (không giới
hạn) tới tháng hiện tại đều trả `200`, kể cả tháng trước khi owner tạo
account — vì tự nhiên không có data ở module nào tại thời điểm đó,
response về zeros/null/mảng rỗng như mọi tháng trống khác, không cần
enforce riêng (xem `02-domain-analysis.md` §5 "Lower bound
navigation"). Chỉ tháng **tương lai** mới bị chặn, vì nó không thể
tính được (không phải "trống", mà là "chưa tồn tại").

**Behavior:** owner-scoped (KD-CHR-010) — `ownerId` lấy từ access
token, không nhận trong path/query. Tháng hiện tại luôn compute
real-time; tháng đã đóng đọc/ghi snapshot lazy theo đúng luồng ở
`02-domain-analysis.md` §4 — client không cần biết phân biệt này,
response shape giống hệt nhau.

---

## 4. Error Format

Nhất quán `DomainExceptionFilter` đã dùng toàn hệ thống (xem
`../forge/habit/v1/07-api-contract.md` §1.6 hoặc tương đương):

```json
{
  "statusCode": 400,
  "code": "CHRONICLE_MONTH_IN_FUTURE",
  "translationKey": "exceptions.chronicle.month_in_future",
  "message": "Cannot view Chronicle for a future month.",
  "args": { "year": 2027, "month": 3 },
  "error": "ChronicleMonthInFutureException",
  "timestamp": "2026-09-12T00:00:00.000Z"
}
```

---

## 5. Endpoint Summary

| Method | Path                      | Action                          |
| ------ | ------------------------- | ------------------------------- |
| `GET`  | `/chronicle/:year/:month` | Xem Chronicle của 1 tháng (mới) |

---

## 6. Out of Scope for V1 API

```text
- Không có endpoint list nhiều tháng cùng lúc (mỗi request đúng 1
  tháng — DO-CHR-002, Out of Scope §7: không cross-month comparison).
- Không có endpoint invalidate/tính lại snapshot
  (02-domain-analysis.md §7).
- Không có endpoint export (PDF/file) — Out of Scope §7 của
  01-ba-overview.md.
```

---

## 7. Next Step

```text
04. Implementation
```
