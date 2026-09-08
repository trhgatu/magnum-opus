# Habit V2 — Lifecycle & Behavior Analysis (Quit-Type Habit)

> **Status:** Candidate / Draft
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định lifecycle và behavior của QUIT-type Habit, đối chiếu với BUILD-type đã baseline ở `../v1/02-lifecycle-behavior-analysis.md`.

---

## 1. Related Documentation

`01-ba-overview.md` (V2) — Problem Statement, User Need, Scope.
`../v1/02-lifecycle-behavior-analysis.md` (V1) — lifecycle BUILD-type.

---

## 2. Hai mô hình tương tác song song

```text
BUILD-type (V1, không đổi)          QUIT-type (V2, mới)
───────────────────────────         ──────────────────────────
frequency: DAILY | WEEKLY(days)     frequency: không có
"đến hạn" theo lịch                 luôn có hiệu lực liên tục
check-in: xác nhận TÍCH CỰC         relapse: ghi nhận TIÊU CỰC
im lặng = chưa làm                  im lặng = vẫn đang thành công
cần hành động để có thêm 1 check-in  cần hành động để "ngày không tái
(cộng vào heatmap, không có streak)  phạm" VỀ 0
tham gia Today (theo due-date)      không tham gia Today
tham gia Routine                    không tham gia Routine
```

Cả 2 vẫn dùng chung 1 lifecycle nền: `ACTIVE ⇄ ARCHIVED` (§3).

---

## 3. Lifecycle nền dùng chung (không đổi so với V1)

```text
ACTIVE
   │
   ├── Archive ──→ ARCHIVED
   │
ARCHIVED
   │
   └── Restore ──→ ACTIVE
```

Giữ nguyên `BR-HAB-003`/`004` (chỉ ACTIVE mới Archive được, chỉ ARCHIVED mới Restore được) cho cả 2 loại — xem `KD-HAB2-005` (V1 §9... _tham chiếu 01-ba-overview.md_) về việc tái sử dụng cơ chế này cho QUIT-type thay vì phát minh state mới.

Với QUIT-type, ý nghĩa `ARCHIVED` là: **tạm ngưng theo dõi nỗ lực từ bỏ này** (không xóa lịch sử relapse đã có) — người dùng có thể Restore lại bất kỳ lúc nào, "ngày bắt đầu"/lịch sử relapse cũ vẫn nguyên vẹn.

---

## 4. Behavior riêng của QUIT-type

### 4.1. Tạo (Create)

```text
Input: title, description?, quitStartedAt (mặc định = hôm nay)
Effect: isActive = true, revision = 1, không có frequency
```

### 4.2. Ghi nhận tái phạm (Log Relapse)

```text
Precondition: Habit đang ACTIVE, type = QUIT
Effect: tạo 1 bản ghi relapse mới (occurredAt = thời điểm hiện tại)
        — không giới hạn số lần/ngày (KD-HAB2-007)
Không đổi: isActive, quitStartedAt, revision của Habit (relapse là 1
           aggregate/bản ghi riêng, không phải field trên Habit)
```

### 4.3. Xem tiến độ (View Progress)

```text
"Ngày không tái phạm" =
  nếu có relapse với occurredAt >= quitStartedAt hiện tại:
    hôm nay − relapse gần nhất thỏa điều kiện đó
  ngược lại (kể cả khi có relapse cũ hơn quitStartedAt):
    hôm nay − quitStartedAt
```

Relapse có `occurredAt` cũ hơn `quitStartedAt` hiện tại (ví dụ do người
dùng sửa lùi `quitStartedAt` về sau — xem §4.4) không được tính vào công
thức này — coi như thuộc lần cố gắng cai trước đó, tránh ra kết quả âm.

### 4.4. Cập nhật (Update)

```text
Precondition: Habit đang ACTIVE (giống BR-HAB-005)
Có thể sửa: title, description, quitStartedAt (KD-HAB2-009)
Không thể sửa: type (bất biến sau khi tạo, KD-HAB2-008)
```

---

## 5. Không có transition nào giữa BUILD và QUIT

Khác với lifecycle state (`ACTIVE`/`ARCHIVED` chuyển đổi được qua lại), `type` **không phải** một lifecycle state — nó được xác lập lúc tạo và (theo đề xuất) không đổi được sau đó. Không có hành động "chuyển loại" trong V2.

---

## 6. Next Step

```text
03. Functional Requirements & Business Rules (Habit V2)
```
