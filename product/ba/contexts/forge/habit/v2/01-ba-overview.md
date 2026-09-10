# Habit V2 — BA Overview (Quit-Type Habit)

> **Status:** Implemented (Backend PR #96, Frontend PR #97)
>
> **Domain:** Forge / Habit
>
> **Purpose:** Xác định Context, Problem Statement, User Need, Product Objective, V2 Scope và Out of Scope cho phần mở rộng "thói quen xấu" (quit-type) của Habit.

---

## 0. Ghi chú về nguồn gốc tài liệu

Khác với `01-ba-overview.md` của V1 (viết ngược từ code đã có), tài liệu này ban đầu là **phân tích xuôi** — thiết kế trước khi implement, giống quy trình đã dùng cho Crucible/Project. Nội dung dưới đây là kết quả của một buổi phân tích trực tiếp với người phụ trách sản phẩm (2026-09-08), đi qua nhiều lần chỉnh sửa sau khi các đề xuất ban đầu bị phát hiện là chưa đúng bản chất vấn đề. Thiết kế này sau đó đã được triển khai đầy đủ và merge vào `main` — backend (PR #96), frontend (PR #97) — nên tài liệu hiện đóng vai trò baseline cho những gì đã chạy trên production, không còn thuần túy là đề xuất.

---

## 1. Related Documentation

`../v1/01-ba-overview.md` đến `../v1/08-database-schema.md` — baseline Habit V1 (chỉ hỗ trợ thói quen "xây dựng điều tốt"). Tài liệu V2 này mở rộng, không thay thế.

---

## 2. Context

Habit V1 chỉ hỗ trợ tốt các thói quen mang tính **xây dựng** (build) — những việc người dùng muốn lặp lại đều đặn theo lịch (đọc sách, dậy sớm). Cơ chế check-in (tick khi đã làm, theo tần suất DAILY/WEEKLY) phù hợp tự nhiên với loại này.

Người dùng cũng muốn theo dõi các thói quen mang tính **từ bỏ** (quit) — những hành vi xấu họ đang cố loại bỏ (hút thuốc, thức khuya). Về mặt đặt tên, Habit V1 đã "dùng tạm được" nếu diễn đạt theo hướng tích cực ("Không hút thuốc"), nhưng hệ thống không biết bản chất Habit đó là gì — không có cách phân biệt "đang xây" và "đang bỏ".

---

## 3. Problem Statement

```text
Habit V1 không phân biệt được một Habit thuộc loại "xây dựng điều tốt"
hay "từ bỏ điều xấu" — cả hai được lưu trữ và xử lý hoàn toàn giống nhau.

Quan trọng hơn: mô hình check-in theo lịch (DAILY/WEEKLY, tick mỗi ngày
đến hạn) vốn được thiết kế cho thói quen xây dựng, không phù hợp về bản
chất với thói quen từ bỏ:

- Thói quen xây dựng: không đến hạn hôm nay là chuyện nhẹ nhàng, không
  đáng lo (bỏ lỡ 1 ngày đọc sách).
- Thói quen từ bỏ: hành vi xấu không có "ngày được miễn" — nó luôn có
  nguy cơ xảy ra. Nếu bắt buộc tick xác nhận mỗi ngày để duy trì tiến độ,
  một ngày không tick trở nên MƠ HỒ giữa hai khả năng hoàn toàn khác
  nhau: người dùng quên mở app, hay người dùng thực sự đã tái phạm.
  Sự mơ hồ này có rủi ro thật — báo sai "bạn đã tái phạm" khi người dùng
  chỉ quên tick có thể gây tổn hại tâm lý không đáng có.
```

---

## 4. User Needs

```text
UN-HAB-006 — Distinguish Habit Purpose
Người dùng cần một Habit được phân loại rõ là đang "xây dựng điều tốt"
hay "từ bỏ điều xấu", làm nền tảng để hệ thống xử lý đúng bản chất từng
loại (và phục vụ insight ở phase sau, ngoài phạm vi V2 này).

UN-HAB-007 — Track a Quit Effort Without Daily Friction
Người dùng cần theo dõi một thói quen đang từ bỏ mà không bị bắt buộc
xác nhận thành công mỗi ngày — việc từ bỏ một hành vi xấu là trạng thái
mặc định liên tục, không phải một việc cần "hoàn thành" theo lịch.

UN-HAB-008 — Know How Long Since Last Relapse
Người dùng cần biết, tại bất kỳ thời điểm nào, đã bao lâu kể từ lần tái
phạm gần nhất (hoặc từ lúc bắt đầu từ bỏ nếu chưa từng tái phạm).

UN-HAB-009 — Honestly Log a Relapse
Người dùng cần một cách rõ ràng, không mơ hồ, để ghi nhận khi họ thực sự
tái phạm — tách bạch với việc "không làm gì" (im lặng).
```

---

## 5. Product Objective

Cho phép người dùng theo dõi thói quen đang từ bỏ (quit-type) bằng một mô hình tương tác phù hợp với bản chất của nó — liên tục, dựa trên sự kiện tái phạm — thay vì ép nó vào mô hình check-in theo lịch vốn chỉ phù hợp với thói quen xây dựng.

---

## 6. Desired Outcomes

```text
Người dùng tạo một thói quen "từ bỏ" chỉ cần khai báo tên và ngày bắt đầu
— không cần nghĩ ra tần suất, vì không có khái niệm đó cho loại này.

Người dùng không cần mở app hằng ngày để "xác nhận vẫn ổn" — hệ thống tự
biết mặc định là đang thành công cho tới khi có tái phạm được ghi nhận.

Người dùng luôn biết chính xác "đã bao lâu chưa tái phạm" mà không lo bị
báo sai vì lỡ quên mở app một hôm.
```

---

## 7. V2 Scope

```text
SC-HAB2-001 — Classify Habit as BUILD or QUIT at creation
SC-HAB2-002 — QUIT-type Habit: declare a single "quit started at" date,
              no frequency
SC-HAB2-003 — QUIT-type Habit: log a relapse (thay cho check-in hằng ngày)
SC-HAB2-004 — View "days since last relapse" (hoặc từ ngày bắt đầu nếu
              chưa từng tái phạm)
SC-HAB2-005 — Filter/list Habit theo loại (BUILD / QUIT)
SC-HAB2-006 — BUILD-type Habit: không đổi gì so với V1
SC-HAB2-007 — QUIT-type Habit sống trong danh sách Habit chung
              (`/habits`, lọc theo loại) — không cần trang mới, không mở
              rộng Today
```

---

## 8. Out of Scope

```text
- Insight/analytics tổng hợp (streak cho BUILD, % tuân thủ, so sánh giữa
  các Habit...) — lùi lại phase sau, KHÔNG thuộc V2 này. Xem ghi chú quan
  trọng: hệ thống hiện tại (V1) chưa có bất kỳ chỉ số phái sinh nào (kể cả
  streak cho BUILD-type) — chỉ có raw check-in log + đếm số ngày trong
  1 khoảng hiển thị dạng heatmap.
- Đổi loại (BUILD ⇄ QUIT) sau khi đã tạo Habit — đã quyết định KHÔNG hỗ
  trợ, `type` bất biến sau khi tạo (`KD-HAB2-008`).
- Lý do/ghi chú kèm theo mỗi lần tái phạm.
- Phân biệt "quên tick" với "thật sự tái phạm" — cố tình không làm, vì
  không thể xác minh và không giải quyết được vấn đề gốc (xem Problem
  Statement).
- Nhắc nhở/notification khi gần tới mốc thời gian nào đó.
- Nhiều mức độ tái phạm (nhẹ/nặng) — chỉ có 1 loại sự kiện duy nhất.
- Insight/dashboard tổng hợp QUIT-type trong Today — QUIT-type không xuất
  hiện trong Today (query hiện tại dựa hoàn toàn vào frequency, QUIT-type
  không có frequency), cũng không tham gia Routine (xem Known Decisions).
```

---

## 9. Known Decisions

```text
KD-HAB2-001 — QUIT-Type Has No Frequency
Thói quen từ bỏ không có khái niệm "đến hạn" — nó luôn có hiệu lực liên
tục kể từ ngày bắt đầu. Do đó QUIT-type không dùng HabitFrequency.

KD-HAB2-002 — Silence Is the Default Success State for QUIT-Type
Không hành động (không log relapse) được hiểu là vẫn đang thành công.
Đây là lựa chọn có chủ đích thay vì thêm 1 state "không chắc" — vì hệ
thống không thể xác minh "quên" hay "tái phạm thật", nên không cố phân
biệt, mà loại bỏ hẳn nhu cầu phải hành động hằng ngày.

KD-HAB2-003 — Existing Habits Default to BUILD
Habit đã tồn tại trước V2 được gán mặc định loại BUILD khi migrate — vì
V1 chỉ từng hỗ trợ loại đó, không có dữ liệu nào để suy luận khác.

KD-HAB2-004 — BUILD-Type Is Untouched
Mọi hành vi của BUILD-type Habit (check-in, frequency, archive/restore)
giữ nguyên 100% như V1 — V2 chỉ bổ sung, không sửa đổi phần đã có.

KD-HAB2-005 — QUIT-Type Cannot Join a Routine
Routine đại diện cho một trình tự hành động thực hiện trong 1 buổi.
QUIT-type Habit không phải hành động rời rạc có điểm bắt đầu/kết thúc
trong 1 buổi — nó là trạng thái liên tục. Do đó QUIT-type Habit không
được thêm vào Routine.

KD-HAB2-006 — QUIT-Type Does Not Appear in Today
`Today` xác định "đến hạn hôm nay" hoàn toàn dựa vào `frequencyType`/
`frequencyDays`. QUIT-type không có frequency (KD-HAB2-001) nên không
khớp điều kiện nào của Today — đây là hệ quả tự nhiên, không phải giới
hạn cần vá. QUIT-type Habit chỉ hiển thị trong danh sách Habit chung
(`/habits`), lọc theo loại.

KD-HAB2-007 — Relapse Logging Is Append-Only, Not Idempotent
Khác `HabitCheckIn.checkIn()` (idempotent theo ngày, `createIfAbsent`),
mỗi lần bấm "Tôi đã tái phạm" tạo 1 bản ghi mới, không giới hạn số lần
trong 1 ngày. Lý do: ghi nhiều bản ghi đơn giản hơn về logic (không cần
kiểm tra "đã có bản ghi hôm nay chưa" trước khi ghi), và giữ lại dữ liệu
chân thực cho insight sau này (dù V2 chỉ hiển thị bản ghi gần nhất).
"Ngày không tái phạm" không đổi dù tái phạm 1 hay nhiều lần cùng
ngày — vẫn tính từ bản ghi gần nhất.

KD-HAB2-008 — Type Is Immutable After Creation
Xác nhận sau khi phân tích cả 2 chiều đổi loại:
- BUILD → QUIT: check-in history cũ và frequency cũ không biết xử lý ra
  sao (giữ lại vô nghĩa hay xóa mất lịch sử?); Habit đang trong Routine
  phải bị gỡ ra ngay lập tức (KD-HAB2-005) — không rõ nên tự động gỡ hay
  chặn đổi loại cho tới khi tự gỡ.
- QUIT → BUILD: relapse history cũ không biết xử lý ra sao; Habit chưa
  có frequency nên phải bắt buộc khai báo ngay lúc đổi loại.
Không có câu trả lời nào cho các câu hỏi trên là rõ ràng/cần thiết —
`type` bất biến kể từ lúc tạo, không có API đổi loại.

KD-HAB2-009 — Quit Start Date Can Be Edited While Active
Cho phép sửa `quitStartedAt` khi Habit đang `ACTIVE` (cùng điều kiện với
sửa `frequency` của BUILD-type). Lý do: Habit không có permanent delete
(`KD-HAB-002`) — nếu không cho sửa, một lần nhập sai ngày lúc tạo (ví dụ
nhầm năm) sẽ là lỗi vĩnh viễn không có lối thoát. Công thức `BR-HAB2-004`
(chỉ tính relapse `>= quitStartedAt`) đã xử lý đúng cả 2 hướng sửa (lùi
về trước lẫn tiến về sau) mà không cần rule bổ sung nào khác.

KD-HAB2-010 — QUIT-Type Reuses Archive/Restore As-Is
Archive/Restore hiện tại chỉ mang 1 ý nghĩa duy nhất cho mọi loại Habit:
tạm ngưng/khôi phục theo dõi hằng ngày, không xóa dữ liệu, đảo ngược
được — **không phải** "đã hoàn thành/thành công". QUIT-type dùng nguyên
cơ chế này, không cần ý nghĩa riêng (xem `BR-HAB2-009`).
```

---

## 10. Open Analysis

```text
(Không còn câu hỏi mở — toàn bộ đã chốt thành Known Decision ở §9.)
```

---

## 11. Next Step

```text
02. Lifecycle & Behavior Analysis (Habit V2)
```
