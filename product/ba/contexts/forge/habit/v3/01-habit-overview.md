# Habit V3 — Tổng quan Thói quen (chuỗi ngày và dải 7 ngày)

> Trạng thái: **đang triển khai** (Cycle 4, đợt làm lại giao diện). Bản đầu 2026-11-02.
> Phụ thuộc: Habit V2 (BUILD/QUIT, tái phạm), temporal-history (lịch theo phiên bản, lưu trữ/khôi phục).

## 1. Vì sao

Trang danh sách Thói quen theo bộ thiết kế Magnum Opus là nơi làm việc hằng ngày, không chỉ là mục lục: mỗi dòng cho biết hôm nay đã ghi dấu chưa, 7 ngày gần nhất ra sao và chuỗi ngày hiện tại. API danh sách cũ (`GET /habits`) chỉ trả định nghĩa Habit; gọi thêm từng Habit thì 20 Habit thành khoảng 40 request. Chuỗi ngày cũng chưa được tính ở đâu (Chronicle chỉ có chuỗi dài nhất trong một tháng).

## 2. Phạm vi

- Một endpoint tổng hợp trả **mọi Habit đang rèn** của người dùng, không phân trang, kèm trạng thái hôm nay, dải 7 ngày và chuỗi.
- Trang danh sách: hai tab **Xây dựng** và **Từ bỏ** dùng endpoint này. Xây dựng nhóm theo việc hôm nay; nhóm "Còn chờ hôm nay" luôn mở, "Đã ghi dấu hôm nay" và "Không có lịch hôm nay" gập sẵn. Từ bỏ là danh sách phẳng theo tên. **Đã lưu trữ** là một link riêng, giữ danh sách cũ có phân trang.
- Trang chi tiết: một endpoint cho từng Habit (kể cả đã lưu trữ), cùng dữ liệu với một dòng ở danh sách, kèm lưới dấu vết 13 tuần.
- Ngoài phạm vi: chuỗi ở trang Hôm nay (dùng lại cùng quy tắc ở bước sau), thông báo, mục tiêu chuỗi.

## 3. Quy tắc

| Mã          | Quy tắc                                                                                                                                                                                                                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-HAB3-001 | "Hôm nay" là ngày lịch theo múi giờ tài khoản.                                                                                                                                                                                                                                                                                                                    |
| BR-HAB3-002 | **Chuỗi hiện tại (BUILD)** = số buổi có lịch liên tiếp đã ghi dấu, đếm lùi từ hôm nay. Ngày không có lịch không làm đứt chuỗi. Hôm nay có lịch mà chưa ghi dấu **không** làm đứt chuỗi, vì ngày chưa hết; ghi dấu rồi thì hôm nay được cộng. Buổi có lịch trong quá khứ mà bỏ lỡ làm đứt chuỗi.                                                                   |
| BR-HAB3-003 | "Có lịch vào ngày D" theo đúng phiên bản lịch có hiệu lực ngày D và chỉ khi Habit đang sống ngày D (đã tạo, không đang lưu trữ) — cùng quy tắc với Chronicle (temporal-history 02 §4.1–4.4: Habit sống ngày D, phiên bản lịch của ngày D, đến hạn ngày D; dùng chung một hàm). Ngày trước lúc tạo và ngày đang lưu trữ không được tính, cũng không làm đứt chuỗi. |
| BR-HAB3-004 | **Chuỗi dài nhất (BUILD)** tính theo cùng quy tắc trên toàn bộ lịch sử từ ngày tạo.                                                                                                                                                                                                                                                                               |
| BR-HAB3-005 | **QUIT:** "chuỗi" là số ngày không tái phạm, tính từ lần tái phạm gần nhất (theo ngày lịch của tài khoản) hoặc từ ngày bắt đầu bỏ; QUIT không có chuỗi dài nhất.                                                                                                                                                                                                  |
| BR-HAB3-006 | Ghi dấu vào ngày không có lịch vẫn hiện là đã làm trong dải 7 ngày nhưng không cộng vào chuỗi.                                                                                                                                                                                                                                                                    |
| BR-HAB3-007 | **Buổi tiếp theo (BUILD):** ngày có lịch đầu tiên sau hôm nay trong 7 ngày tới; không có thì để trống.                                                                                                                                                                                                                                                            |

## 4. Dải 7 ngày

Bảy ngày, cũ nhất trước, ngày cuối là hôm nay. Mỗi ngày một dấu:

| Dấu         | BUILD                         | QUIT                                              |
| ----------- | ----------------------------- | ------------------------------------------------- |
| `DONE`      | Đã ghi dấu                    | Không tái phạm                                    |
| `MISSED`    | Có lịch mà bỏ lỡ              | Tái phạm                                          |
| `REST`      | Đang rèn nhưng không có lịch  | —                                                 |
| `PENDING`   | Hôm nay có lịch, chưa ghi dấu | Hôm nay, chưa tái phạm                            |
| `UNTRACKED` | Chưa tạo hoặc đang lưu trữ    | Trước ngày bắt đầu bỏ, chưa tạo hoặc đang lưu trữ |

Giao diện hiển thị theo bộ thiết kế: `DONE` ô tô than hồng, `MISSED` chỉ có viền, `REST` một chấm nhỏ, `PENDING` viền đậm, `UNTRACKED` để trống. Bỏ lỡ là khoảng trống, không phải lỗi.

## 5. API

`GET /habits/overview` (cần đăng nhập) → `HabitOverviewResponse` (`@repo/contracts`):

```ts
{
  date: string; // hôm nay, YYYY-MM-DD theo múi giờ tài khoản
  timeZone: string;
  habits: Array<{
    id: string;
    title: string;
    description: string | null;
    type: 'BUILD' | 'QUIT';
    frequencyType: 'DAILY' | 'WEEKLY' | null; // QUIT: null
    frequencyDays: number[]; // 1 = Thứ Hai … 7 = Chủ nhật
    quitStartedAt: string | null; // YYYY-MM-DD, chỉ QUIT
    routines: Array<{ id: string; title: string }>; // Nếp sinh hoạt đang rèn có Habit này
    dueToday: boolean;
    checkedInToday: boolean;
    checkedInAt: string | null; // lúc ghi dấu hôm nay, ISO-8601 UTC (vd 2026-11-01T23:30:00.000Z)
    currentStreak: number; // BR-HAB3-002 / 005
    longestStreak: number | null; // BR-HAB3-004, QUIT: null
    lastSevenDays: Array<{
      date: string; // YYYY-MM-DD
      mark: 'DONE' | 'MISSED' | 'REST' | 'PENDING' | 'UNTRACKED'; // §4
    }>;
    nextDueOn: string | null; // BR-HAB3-007
  }>;
}
```

Chỉ Habit đang rèn, sắp theo tên. Habit đã lưu trữ không có trong kết quả.

`GET /habits/:id/overview` (cần đăng nhập) → `HabitOverviewItemEnvelope`: `{ date, timeZone, habit, trace }`, trong đó `habit` cùng kiểu với một phần tử ở trên và `trace` là 91 ngày (13 tuần) tới hôm nay, cũ nhất trước, mỗi ngày một dấu theo §4 — 7 ngày cuối trùng `lastSevenDays`. Dùng cho trang chi tiết, nên trả cả Habit đã lưu trữ: những ngày đang lưu trữ là `UNTRACKED`, chuỗi giữ nguyên quy tắc §3. Habit không tồn tại hoặc của người khác → 404 (`HABIT_NOT_FOUND`).

## 6. Tiêu chí chấp nhận

- **Given** Habit hằng ngày đã ghi dấu 4 ngày liền tới hôm qua và hôm nay chưa ghi dấu, **then** chuỗi = 4 và ô hôm nay là `PENDING`.
- **Given** đã ghi dấu thêm hôm nay, **then** chuỗi = 5.
- **Given** Habit T2 · T4 · T6 ghi dấu đủ ba buổi gần nhất, **then** các ngày T3, T5, T7, CN là `REST` và chuỗi = 3.
- **Given** đổi lịch từ hằng ngày sang chỉ Thứ Hai, **then** các ngày không có lịch theo phiên bản mới không làm đứt chuỗi.
- **Given** Habit lưu trữ hai ngày rồi khôi phục, **then** hai ngày đó là `UNTRACKED` và không làm đứt chuỗi.
- **Given** Habit QUIT bắt đầu bỏ 5 ngày trước và chưa tái phạm, **then** chuỗi = 5; **given** tái phạm hôm kia, **then** chuỗi = 2 và ô hôm kia là `MISSED`.
- **Given** người dùng khác gọi endpoint, **then** không thấy Habit của người này.
- **Given** mở trang chi tiết một Habit đang rèn, **then** chuỗi, dải 7 ngày và buổi tiếp theo khớp đúng dòng của nó ở danh sách.
- **Given** Habit đã lưu trữ hôm nay, **then** trang chi tiết vẫn có tổng quan và ô hôm nay là `UNTRACKED`.
- **Given** người khác mở `GET /habits/:id/overview` của Habit này, **then** 404.

## 7. Quyết định

| Mã           | Quyết định                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEC-HAB3-001 | Hai tab Xây dựng và Từ bỏ dùng chung một endpoint, không phân trang: một người hiếm khi có quá vài chục Habit đang rèn. Xây dựng nhóm theo việc hôm nay nên không đi cùng phân trang hay sắp xếp theo tên; Từ bỏ ngắn, sắp theo tên.                                                                                                            |
| DEC-HAB3-002 | Tính chuỗi ở server, một chỗ, dùng chung quy tắc lịch với Chronicle (`@shared/domain/habit-schedule`), để trang danh sách, chi tiết và Hôm nay không bao giờ ra số khác nhau.                                                                                                                                                                   |
| DEC-HAB3-003 | Tải toàn bộ lịch sử check-in của các Habit đang rèn để tính chuỗi dài nhất; với quy mô một người dùng, số dòng nhỏ. Xem lại nếu lịch sử lớn tới mức chậm.                                                                                                                                                                                       |
| DEC-HAB3-004 | Chia tab theo loại (Xây dựng / Từ bỏ) và gập các nhóm không cần thao tác hôm nay (đã ghi dấu, không có lịch): hai loại dùng khác nhau (ghi dấu hằng ngày so với theo dõi số ngày giữ được), và mở trang ra chủ yếu để làm việc còn chờ, nên trang chỉ dài bằng số việc đó. Tìm kiếm áp cho cả hai loại và chỉ sang tab kia khi có kết quả ở đó. |
