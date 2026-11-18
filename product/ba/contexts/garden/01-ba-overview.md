# Garden — Phân tích nghiệp vụ tổng thể

> **Status:** Draft. P1 (Habit) đã chốt nghiệp vụ 2026-11-13; còn câu hỏi cho P2+ ở §12.
> **Domain:** Garden (Khu vườn)
> **Purpose:** Hữu hình hóa đời sống của người dùng trong Magnum Opus thành một khu vườn lớn lên theo đúng cách họ đã sống.
> **Phụ thuộc:** Habit V4 (Thùng rác và xóa vĩnh viễn) phải xong trước P1.

---

## 1. Tầm nhìn

> "Tâm trí con người có thể được ví như một khu vườn, nơi có thể được chăm bón thông minh hoặc bị bỏ mặc hoang vu. Cho dù được chăm chút hay bỏ phế, nó vẫn sẽ sinh sôi nảy nở."
> James Allen, _As a Man Thinketh_ (1903)

Mọi hoạt động trong Magnum Opus, ở các module hiện tại và tương lai, đều góp vào **một khu vườn duy nhất của người dùng**. Khu vườn không chấm điểm. Nó là tấm gương: mở ra để thấy "mình đã sống thế nào", không phải "mình đạt bao nhiêu".

Magnum Opus có hai nhịp: **làm** (Forge, Crucible) và **nhìn lại** (Reflection, Chronicle). Khu vườn ghép cả hai. Cây lớn nhờ làm, và cả vườn sáng lên nhờ nhìn lại.

### 1.1 Tầm nhìn xa

Garden đi qua bốn tầng. Phạm vi P1 chỉ là tầng 1, nhưng thiết kế phải không chặn đường tới tầng 4.

| Tầng                             | Garden là                                                                                                                    | Cần gì                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Tấm gương                     | phản chiếu mọi module thành một khu vườn                                                                                     | sổ hoạt động, cây, cỏ                                        |
| 2. Ngôi nhà                      | màn hình đầu tiên thay cho dashboard; chạm vào cây là vào module gốc                                                         | điều hướng từ vườn                                           |
| 3. Cỗ máy thời gian              | tua vườn về bất kỳ ngày nào; mỗi năm một vòng gỗ                                                                             | dáng cây ổn định qua năm tháng (`sim_version`), Garden tự đủ |
| 4. Hình dạng của vòng chuyển hóa | nhìn lại (ánh sáng) → một nhận ra (hạt) → sống thật (cây) → nhìn lại kết quả (mùa thu); rễ nối cây về khoảnh khắc sinh ra nó | rễ do người dùng nối                                         |

**North star:** khu vườn là hình dạng hữu hình của vòng chuyển hóa mà `product/vision.md` hứa: ghi nhận, kết nối, nhận ra mẫu hình, chọn một thay đổi, quay lại quan sát.

## 2. Nguyên tắc sản phẩm

| Mã         | Nguyên tắc                            | Hệ quả                                                                                                                                                                                        |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD-GDN-001 | Chỉ lớn, không héo                    | Không có gì chết hay nhỏ đi. Nghỉ thì đứng yên.                                                                                                                                               |
| KD-GDN-002 | Không có con số                       | Không có điểm, %, "còn N tuần". Con số vẫn ở module gốc.                                                                                                                                      |
| KD-GDN-003 | Dấu vết không phải hình phạt          | Tái phạm là sẹo đã liền; quay lại sau khi nghỉ là mắt gỗ; cây vẫn lớn.                                                                                                                        |
| KD-GDN-004 | Nghỉ có chủ đích khác bỏ quên         | Lưu trữ hay tạm dừng thì cây ngủ, đất sạch. Cỏ chỉ mọc khi một thứ đang hoạt động bị bỏ quên trong im lặng.                                                                                   |
| KD-GDN-005 | Không thêm việc                       | Vườn không có nút tưới hay việc phải làm. Mọi hành động diễn ra ở module gốc.                                                                                                                 |
| KD-GDN-006 | Không sửa quá khứ                     | Cái đã mọc thì không bị viết lại. Hai ngoại lệ có chủ đích: người dùng **xóa vĩnh viễn** dữ liệu nguồn (quyền dữ liệu đứng trên lịch sử), và sửa ngày bắt đầu bỏ của Habit QUIT (BR-GDN-007). |
| KD-GDN-007 | Mùa nào cũng đúng                     | Mùa đông của đời sống là nghỉ, không phải sa sút. Không mùa nào được trình bày là xấu.                                                                                                        |
| KD-GDN-008 | Ý nghĩa tách khỏi phông nền           | Giờ và thời tiết thật chỉ là không khí, không bao giờ mang ý nghĩa và không làm cây kém đi.                                                                                                   |
| KD-GDN-009 | Mở rộng không cần sửa lõi             | Module mới góp vào vườn bằng cách phát sự kiện và thêm một nguồn (§9). Lõi Garden không biết module cụ thể.                                                                                   |
| KD-GDN-010 | Không bao giờ gọi người dùng quay lại | Không thông báo, không nhắc "cây đang chờ". Vườn chỉ hiện ra khi người dùng tự mở.                                                                                                            |
| KD-GDN-011 | Chỉ chăm sóc và nhìn lại mới vào vườn | Một module có chỗ trong vườn khi việc của nó là chăm một thứ lâu dài hoặc nhìn lại chính mình. Việc đo đếm (vd tài chính) không vào vườn, vì ép vào sẽ thành chấm điểm.                       |
| KD-GDN-012 | Garden tự đủ, ở mức tối thiểu         | Để tính lại cây, Garden chỉ đọc sổ của chính nó. Nguồn chép vào sổ đúng những gì cần để tính (ngày, lịch, giống cây), không bao giờ chép nội dung riêng tư.                                   |

## 3. Ngôn ngữ chung

| Thuật ngữ            | Nghĩa                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chủ thể**          | Một thứ được nuôi trong vườn (một Habit, một Project). Có định danh ổn định `(subject_kind, subject_id)`.                                              |
| **Hạt trong túi**    | Một ý định đã có nhưng chưa cam kết (Project `NOT_STARTED`).                                                                                           |
| **Gieo**             | Lúc một chủ thể bắt đầu được nuôi (tạo Habit, Start Project).                                                                                          |
| **Cây**              | Một chủ thể được nuôi lâu dài. Dáng cây là lịch sử theo kỳ của nó được phát lại.                                                                       |
| **Giống cây**        | Cách một cây mọc thành hình: cây thân gỗ, bụi gai, dây leo. Không phụ thuộc module (§9.3).                                                             |
| **Nhịp**             | Quy tắc "một kỳ thế nào là có chăm" của từng loại chủ thể (§9.2).                                                                                      |
| **Nguồn**            | Một context nội bộ góp vào vườn (Forge, Crucible, Reflection…). Không gọi là provider: provider trong dự án dành cho bên thứ ba (GitHub, WakaTime).    |
| **Luống**            | Một nhóm cây đứng chung vì người dùng gom chúng lại (Routine).                                                                                         |
| **Dấu vết**          | Ký hiệu trên cây kể một sự kiện: mắt gỗ (quay lại sau nghỉ), sẹo (tái phạm), hoa (cycle xong), trái (Project hoàn thành), vòng năm (một năm khép lại). |
| **Cỏ**               | Phần hoang dã quanh một cây đang hoạt động mà bị bỏ quên. Cây không chết; quay lại chăm thì cỏ gọn dần.                                                |
| **Khoảnh khắc**      | Một việc xảy ra một lần, không mọc (một sự kiện đời sống). Nằm trên lối đá.                                                                            |
| **Đèn lồng**         | Một ký ức, đặt dọc lối đá đúng ngày nó xảy ra. Đọc lại thì đèn sáng lên.                                                                               |
| **Lối đá**           | Trục thời gian của vườn.                                                                                                                               |
| **Ánh sáng**         | Mức người dùng dừng lại nhìn lại chính mình gần đây.                                                                                                   |
| **Bầu trời**         | Trạng thái gần đây của người dùng (giai đoạn sau: thêm cảm xúc từ Mood).                                                                               |
| **Mùa của đời sống** | Giai đoạn sống suy ra từ nhịp của mọi hoạt động trong vài tháng: Xuân gieo, Hạ chăm, Thu gặt và nhìn lại, Đông nghỉ.                                   |
| **Phông nền**        | Giờ trong ngày và thời tiết thật. Chỉ là không khí.                                                                                                    |
| **Rễ**               | Liên kết giữa hai chủ thể do người dùng tự nối (P5). Hệ thống không tự đoán.                                                                           |
| **Sổ hoạt động**     | Nơi Garden ghi lại những gì đã xảy ra, chỉ thêm, không sửa.                                                                                            |

## 4. Mô hình

### 4.1 Ba tầng

```
Tầng 3  KHÍ HẬU      mùa của đời sống (vài tháng) · ánh sáng, bầu trời (vài tuần)
                     ← đọc TOÀN BỘ sổ, không quan tâm module nào
Tầng 2  KHU VƯỜN     hạt, cây, luống, cỏ, dấu vết, đèn lồng
                     ← đọc sổ theo từng chủ thể
Tầng 1  SỔ HOẠT ĐỘNG mọi nguồn ghi vào đây (chỉ thêm)
────────────────────────────────────────────────────────────────
Phông nền            giờ, thời tiết thật  ← không qua sổ, không mang ý nghĩa
```

### 4.2 Ba loại đóng góp

| Loại            | Ví dụ                               | Mọc theo nhịp?         |
| --------------- | ----------------------------------- | ---------------------- |
| **Cây**         | Habit, Project                      | có                     |
| **Ánh sáng**    | Journal, Memory, "Ngày này năm xưa" | không, góp vào khí hậu |
| **Khoảnh khắc** | sự kiện đời sống (tương lai)        | không, nằm trên lối đá |

### 4.3 Sáu vai của một sự kiện

Mỗi nguồn gán cho từng sự kiện của mình đúng một vai. Garden chỉ hiểu sáu vai này:

| Vai             | Habit               | Project                     | Journal           | Memory         |
| --------------- | ------------------- | --------------------------- | ----------------- | -------------- |
| **Gieo**        | tạo Habit           | Start (tạo = hạt trong túi) |                   |                |
| **Chăm**        | check-in            | Q-GDN-6                     |                   |                |
| **Dấu**         | tái phạm → sẹo      | cycle đóng → hoa            |                   |                |
| **Nghỉ / tiếp** | lưu trữ / khôi phục | pause / resume              |                   |                |
| **Kết thúc**    | không có            | complete → trái, stop       |                   |                |
| **Ánh sáng**    |                     |                             | niêm phong → nắng | tạo → đèn lồng |

Habit không bao giờ "kết thúc": lưu trữ chỉ là tạm ngưng, đảo ngược được (`BR-HAB2-009`). Cây Habit lưu trữ là cây ngủ đông.

## 5. Các context góp vào vườn như thế nào

Không góp: `iam`, `audit`, `menu`, `notifications`, `storage`, `analytics`. Đó là hạ tầng, không phải đời sống. `activity` và `integrations` góp gián tiếp qua Crucible; Garden không bao giờ nói chuyện với bên thứ ba.

### 5.1 Forge — cây, bụi, luống

| Nguồn                      | Trong vườn                                         | Sự kiện nguồn                                               | Có sẵn?      |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| Tạo Habit                  | gieo (BUILD thành cây thân gỗ, QUIT thành bụi gai) | `HabitCreated`                                              | **Cần thêm** |
| Check-in                   | chăm                                               | `HabitCheckedIn`                                            | **Cần thêm** |
| Hủy check-in trong ngày    | rút lần chăm                                       | `HabitCheckInUndone`                                        | **Cần thêm** |
| Tái phạm (QUIT)            | sẹo                                                | `HabitRelapsed`                                             | **Cần thêm** |
| Sửa ngày bắt đầu bỏ (QUIT) | gieo lại từ ngày mới (BR-GDN-007)                  | `HabitQuitStartChanged`                                     | **Cần thêm** |
| Đổi lịch (BUILD)           | đổi nhịp từ ngày hiệu lực                          | `HabitScheduleVersionStarted`                               | Có           |
| Lưu trữ / khôi phục        | ngủ đông / mọc tiếp                                | `HabitLifecycleTransitioned`                                | Có           |
| Vào / ra Thùng rác         | cây ẩn / hiện lại                                  | `HabitTrashed`, `HabitRestoredFromTrash`                    | **Habit V4** |
| Xóa vĩnh viễn              | cây và mọi dòng sổ mất hẳn                         | `HabitPermanentlyDeleted`                                   | **Habit V4** |
| Routine và thành viên      | luống                                              | `RoutineHabitAdded/Removed`, `RoutineLifecycleTransitioned` | Có           |

### 5.2 Crucible — dây leo (P3)

| Nguồn                       | Trong vườn                    | Sự kiện nguồn                  | Có sẵn?       |
| --------------------------- | ----------------------------- | ------------------------------ | ------------- |
| Tạo Project (`NOT_STARTED`) | hạt trong túi                 | `ProjectCreated`               | Kiểm tra lại  |
| `START`                     | gieo, dựng giàn               | `ProjectLifecycleTransitioned` | Có            |
| Một kỳ có làm               | chăm dây leo                  | Q-GDN-6                        | **Cần quyết** |
| Cycle đóng `COMPLETED`      | hoa trên giàn                 | `ProjectCycleClosed`           | Có            |
| `PAUSE` / `RESUME`          | ngủ (không mọc cỏ) / mọc tiếp | `ProjectLifecycleTransitioned` | Có            |
| `STOP`                      | ngừng leo, vẫn đứng           | `ProjectLifecycleTransitioned` | Có            |
| `COMPLETE`                  | kết trái                      | `ProjectLifecycleTransitioned` | Có            |
| `REOPEN`                    | mọc tiếp từ chỗ cũ            | `ProjectLifecycleTransitioned` | Có            |

### 5.3 Reflection — ánh sáng và đèn lồng (P2)

| Nguồn                          | Trong vườn                             | Sự kiện nguồn         | Có sẵn?      |
| ------------------------------ | -------------------------------------- | --------------------- | ------------ |
| Niêm phong trang nhật ký       | ánh sáng                               | `JournalEntrySealed`  | Có           |
| Tạo ký ức                      | đèn lồng tại `occurredOn`              | `MemoryCreated`       | Có           |
| Mở ký ức từ "Ngày này năm xưa" | ánh sáng, đèn đó sáng lên              | `OnThisDayItemOpened` | **Cần thêm** |
| Mood của trang                 | bầu trời (P4)                          | đi kèm trang nhật ký  | Có dữ liệu   |
| Vào Thùng rác                  | đèn lồng ẩn; ánh sáng đã có giữ nguyên |                       | Kiểm tra lại |
| Xóa vĩnh viễn                  | dòng sổ của nó bị xóa (§6.3)           |                       | Kiểm tra lại |
| Timeline                       | chính là lối đá; Garden không làm lại  |                       |              |

### 5.4 Chronicle — mốc mùa (P4)

| Nguồn                      | Trong vườn                 | Sự kiện nguồn             | Có sẵn?      |
| -------------------------- | -------------------------- | ------------------------- | ------------ |
| Chốt một tháng / quý       | mốc đánh dấu chặng của mùa | `ChronicleSnapshotFrozen` | Kiểm tra lại |
| Chốt một năm               | mỗi cây thêm một vòng năm  | như trên                  | Kiểm tra lại |
| Người dùng mở đọc tổng kết | ánh sáng                   | `ChronicleViewed`         | **Cần thêm** |

Chronicle **không quyết định** mùa. Mùa tính từ toàn bộ sổ (§7.3); Chronicle chỉ đánh dấu ranh giới thời gian.

## 6. Sổ hoạt động

### 6.1 Bộ sự kiện chung

| Loại                 | Ý nghĩa                                                        |
| -------------------- | -------------------------------------------------------------- |
| `TENDED`             | một lần chăm                                                   |
| `UNTENDED`           | rút lại lần chăm trong cùng ngày                               |
| `MARKED`             | để lại dấu vết: `SCAR`, `BLOSSOM`, `FRUIT`                     |
| `RESTED` / `RESUMED` | nghỉ có chủ đích / tiếp tục                                    |
| `CONCLUDED`          | ngừng nuôi vĩnh viễn (chỉ module có kết thúc thật, vd Project) |
| `RHYTHM_SET`         | nhịp có hiệu lực từ ngày này (vd lịch Habit)                   |
| `REFLECTED`          | một lần nhìn lại                                               |

Gieo không phải một dòng sổ mà là một hàng trong `garden_subjects`: thứ đã có định danh thì là một hàng, không phải một sự kiện. Mắt gỗ (`KNOT`) không có dòng sổ: Garden tự suy ra từ một quãng nghỉ rồi chăm lại.

### 6.2 Dữ liệu

```
garden_subjects            — mỗi chủ thể đã gieo
  id, owner_id
  subject_kind      enum   HABIT | PROJECT | …
  subject_id               định danh bên module gốc; UNIQUE (subject_kind, subject_id)
  variant           enum   BUILD | QUIT | VINE | …   (giống cây)
  name_at_planting         tên lúc gieo, chỉ dùng khi module gốc không còn
  sim_version       int    phiên bản thuật toán mọc lúc gieo; cây giữ dáng mãi
  plot                     vị trí trong vườn, chốt lúc gieo, không bao giờ dời
  planted_on        date
  hidden_at                khác null khi nguồn đang ở Thùng rác

garden_entries             — sổ
  id, owner_id
  subject_id        → garden_subjects, null với REFLECTED
  kind              enum   §6.1
  mark              enum?  chỉ khi kind = MARKED
  occurred_on       date   theo múi giờ tài khoản lúc sự kiện xảy ra
  detail            jsonb? chỉ cho RHYTHM_SET (vd các ngày có lịch); không chứa nội dung riêng tư
  source_ref               định danh nguồn của dòng (vd journal id), để dọn khi xóa vĩnh viễn
  source_event_id          UNIQUE: nhận trùng sự kiện thì bỏ qua
  recorded_at

garden_links (P5)          — rễ, do người dùng tạo
```

`kind`, `subject_kind`, `variant`, `mark` là Prisma enum, giống `ActivityEvent.kind`. Thêm loại mới là thêm giá trị enum kèm một migration nhỏ.

Tên hiển thị đọc từ module gốc khi chủ thể còn; `name_at_planting` chỉ là dự phòng.

### 6.3 Quy tắc của sổ

- **BR-GDN-SB-001:** Chỉ thêm. Không sửa dòng. Chỉ xóa dòng theo BR-GDN-SB-006.
- **BR-GDN-SB-002:** Ngày ghi theo múi giờ tài khoản **tại lúc sự kiện xảy ra**. Đổi múi giờ sau đó không dời dòng cũ.
- **BR-GDN-SB-003:** `UNTENDED` chỉ triệt tiêu một `TENDED` cùng chủ thể, cùng ngày.
- **BR-GDN-SB-004:** Sự kiện đi qua outbox giống Reflection Timeline. Mỗi sự kiện ghi đúng một lần nhờ `source_event_id`.
- **BR-GDN-SB-005:** Mỗi nguồn có một lần nạp lịch sử có sẵn khi ra mắt. Dòng nạp dùng `source_event_id` dạng `backfill:<nguồn>:<id>`, chạy lại không trùng.
- **BR-GDN-SB-006:** Nguồn bị **xóa vĩnh viễn** thì chủ thể và mọi dòng sổ của nó (hoặc các dòng có `source_ref` trỏ tới nó) bị xóa. Đây là ngoại lệ duy nhất với "chỉ thêm".
- **BR-GDN-SB-007:** Nguồn vào **Thùng rác** thì chủ thể bị ẩn (`hidden_at`), không xóa. Khôi phục thì hiện lại, cây không đổi.

## 7. Diễn giải

Mọi diễn giải là **domain policy thuần**: hàm không I/O, đầu vào là dữ liệu từ sổ, đầu ra là quyết định, đúng kiểu `isDueOn` / `isAliveOn` đang có. Mỗi quy tắc BR-GDN có đúng một hàm, và ví dụ §8.8 là test của hàm đó.

### 7.1 Chuỗi kỳ của một chủ thể

P1 dùng kỳ là tuần, bắt đầu thứ Hai, theo múi giờ tài khoản. Từ tuần gieo tới tuần hiện tại:

| Trạng thái | Khi nào                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `CARED`    | Có ít nhất một `TENDED` còn hiệu lực.                                                                 |
| `PENDING`  | Tuần hiện tại, chưa có chăm.                                                                          |
| `RESTED`   | Tuần đã hết, có kỳ vọng chăm nhưng không có. Nhịp của từng loại chủ thể tự định nghĩa "kỳ vọng" (§8). |
| `SKIPPED`  | Không có kỳ vọng: đang nghỉ có chủ đích, chưa gieo, hoặc lịch không có ngày nào.                      |

Dáng cây là chuỗi này được phát lại: `CARED` thì mọc, `RESTED` và `SKIPPED` thì đứng yên, chăm lại sau `RESTED` thì để mắt gỗ.

### 7.2 Cỏ

Cỏ mọc quanh một chủ thể **đang hoạt động** khi cuối chuỗi có từ **3 tuần `RESTED` liên tiếp** trở lên. Cỏ cao dần theo số tuần, có giới hạn trên. Chăm lại thì cỏ gọn dần trong vài tuần, không mất ngay. `SKIPPED` cắt chuỗi đếm và không bao giờ làm mọc cỏ. Ngưỡng 3 chỉnh lại sau khi xem dữ liệu thật.

### 7.3 Khí hậu (P2, P4)

| Yếu tố           | Cửa sổ                    | Từ đâu                                                                                                                |
| ---------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ánh sáng         | 4 tuần gần nhất, đổi chậm | số `REFLECTED`                                                                                                        |
| Bầu trời         | 2–4 tuần                  | ánh sáng, mức bỏ quên, sau này thêm Mood                                                                              |
| Mùa của đời sống | khoảng 12 tuần            | tỉ lệ gieo (Xuân), `TENDED` đều (Hạ), `BLOSSOM`/`FRUIT`/`CONCLUDED`/`REFLECTED` (Thu), độ thưa của mọi sự kiện (Đông) |

Công thức cụ thể chốt sau khi có dữ liệu thật (Q-GDN-8).

## 8. P1: Habit

### BR-GDN-001 — Gieo

Habit BUILD gieo ngày `createdOn`. Habit QUIT gieo ngày `quitStartedAt`. Habit tạo thử hay tạo nhầm thì người dùng xóa ở Forge (Habit V4); Garden không có nút "ẩn khỏi vườn".

### BR-GDN-002 — Kỳ vọng của BUILD

Một tuần BUILD "có kỳ vọng" khi có ít nhất một ngày đến lịch theo `RHYTHM_SET` còn hiệu lực ngày đó và Habit đang sống (cùng quy tắc `isDueOn` / `isAliveOn`). Tuần đã hết, có kỳ vọng mà không có `TENDED` thì là `RESTED`.

### BR-GDN-003 — Check-in ngoài lịch

Check-in vào ngày không đến lịch vẫn là `TENDED`, và tuần đó là `CARED`.

### BR-GDN-004 — QUIT

Mỗi tuần thói quen còn sống là `CARED`; mỗi ngày giữ được đã là chăm. Tuần có tái phạm vẫn `CARED` và mang thêm **một** `SCAR`, dù tái phạm bao nhiêu lần trong tuần. Sổ vẫn ghi đủ từng lần; chỉ lúc diễn giải mới gộp. Tái phạm trước `quitStartedAt` bị bỏ qua, theo BR-HAB2-004.

### BR-GDN-005 — Lưu trữ

Tuần đang lưu trữ là `SKIPPED`. Cây ngủ đông, không mọc cỏ. Khôi phục thì mọc tiếp từ chỗ cũ. Habit không có `CONCLUDED`.

### BR-GDN-006 — Thùng rác và xóa vĩnh viễn

Habit vào Thùng rác thì cây ẩn (BR-GDN-SB-007); ngày trong Thùng rác là `SKIPPED` (BR-HAB4-004). Xóa vĩnh viễn thì cây mất hẳn (BR-GDN-SB-006).

### BR-GDN-007 — Sửa ngày bắt đầu bỏ

Sửa `quitStartedAt` thì cây phát lại từ ngày mới. Các dòng sổ trước ngày đó vẫn nằm nguyên, chỉ bị bỏ qua khi diễn giải. Đây là ngoại lệ duy nhất với "không sửa quá khứ" ngoài xóa vĩnh viễn, và khớp với BR-HAB2-004.

### BR-GDN-008 — Routine

Các cây thuộc cùng Routine đứng chung một luống. Habit thuộc nhiều Routine thì đứng ở luống của Routine được gán sớm nhất. Habit không thuộc Routine nào thì đứng riêng dọc lối đá. Vị trí chốt lúc gieo (`plot`); đổi Routine sau đó không dời cây.

### BR-GDN-009 — Câu chuyện của cây

Bấm vào cây thì hiện vài dòng kể bằng chữ, không có điểm số, kèm link về Habit. Đây cũng là bản thay thế cho trình đọc màn hình.

### 8.8 Ví dụ kiểm chứng (hôm nay thứ Ba 10/11/2026)

1. BUILD hằng ngày, gieo 05/10, tuần nào cũng có check-in, tuần này chưa: 5 `CARED`, rồi `PENDING`.
2. BUILD lịch thứ 2/4/6, tuần 19/10 không check-in: tuần đó `RESTED`; tuần sau check-in lại thì có mắt gỗ.
3. BUILD lịch thứ 2/4/6, tuần 26/10 chỉ check-in Chủ nhật: tuần đó `CARED`.
4. Lưu trữ từ thứ Năm 22/10, khôi phục 02/11: tuần 19/10 chỉ xét thứ 2–4; tuần 26/10 là `SKIPPED`; không mọc cỏ.
5. QUIT gieo 05/10, hai lần tái phạm thứ Bảy 24/10: tuần 19/10 là `CARED` với một `SCAR`.
6. Tái phạm 23:50 Chủ nhật 25/10 giờ Việt Nam (16:50 UTC): sẹo rơi vào tuần 19/10.
7. Check-in 30/10 rồi hủy cùng ngày, tuần đó không còn check-in nào khác: tuần 26/10 là `RESTED`.
8. Ba tuần `RESTED` liên tiếp gần nhất khi đang hoạt động: bắt đầu mọc cỏ.
9. QUIT gieo 01/10, sửa `quitStartedAt` thành 15/10: cây phát lại từ tuần 12/10; tái phạm ngày 08/10 không thành sẹo.

## 9. Kiến trúc

### 9.1 Ba trục độc lập

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

### 9.2 Ổ cắm

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

### 9.3 Bố cục

Garden là một bounded context, cùng bố cục bốn tầng như các context khác:

```
apps/server/src/contexts/garden/
├─ garden.module.ts
├─ domain/                              policy thuần: rhythm/, weeds, marks, climate
├─ application/
│  ├─ ports/                            garden-ledger-writer.port.ts, garden-ledger-reader.port.ts
│  ├─ commands/                         backfill-garden
│  └─ queries/                          get-garden (sau này ?at= để tua)
├─ infrastructure/
│  ├─ outbox/                           ← chỗ duy nhất biết contract của Forge
│  │  └─ plant-created-habit.handler.ts, record-habit-check-in.handler.ts, …
│  ├─ writers/prisma-garden-ledger.writer.ts
│  └─ readers/prisma-garden-ledger.reader.ts
└─ presentation/                        GET /garden

packages/garden-sim/                    thuần TS: rng, space colonization, pipe model
  species/   tree, thorn-bush, vine, fallback
  versions/  v1, v2…                    không bao giờ sửa phiên bản cũ
packages/contracts/                     GardenView, enum dùng chung
apps/client/features/garden/            renderer three.js (lazy), registry giống cây
```

### 9.4 Luật phụ thuộc (thêm vào `architecture/dependency-rules.spec.ts`)

| Luật                                                                                              | Lý do                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Garden chỉ chạm context khác qua `contexts/<module>/contracts`, và chỉ từ `infrastructure/outbox` | Garden application và domain không biết Forge. Luật outbox adapter đã có sẵn lo phần này |
| Không context nào import `garden`                                                                 | Module nguồn không biết vườn tồn tại                                                     |
| `garden/domain` không import Prisma hay Nest                                                      | Nhịp, cỏ, khí hậu là hàm thuần                                                           |
| `packages/garden-sim` không phụ thuộc gói nào                                                     | Chạy được ở server, client, test                                                         |

### 9.5 Luồng

**Ghi** (người dùng check-in):

```
CheckInHabitHandler lưu check-in + forge.habit.checked-in.v1 vào outbox (một transaction), trả kết quả ngay
→ publisher → OutboxRegistry → RecordHabitCheckInHandler (Garden)
→ dịch payload thành một TENDED
→ ghi garden_entries (trùng source_event_id thì bỏ qua) → xóa cache garden:{owner}
```

Garden lỗi thì outbox thử lại; check-in không bị ảnh hưởng.

**Đọc** (người dùng mở vườn):

```
GET /garden → đọc garden_subjects (không ẩn) + garden_entries của owner
→ nhịp → chuỗi kỳ; policy → cỏ, dấu; (P2+) khí hậu
→ GardenView { subjects: [{ id, seed, variant, simVersion, plot, name, periods, marks, weeds }] }
→ client: garden-sim(simVersion) dựng hình học → three.js vẽ
```

Server chỉ gửi chuỗi kỳ; việc mọc cây chạy ở trình duyệt.

### 9.6 Thêm một module mới

| Việc                                                       | Ở đâu                                   | Đụng lõi?     |
| ---------------------------------------------------------- | --------------------------------------- | ------------- |
| Module phát sự kiện                                        | context của module                      | không         |
| Viết nguồn: handler dịch contract + nạp lịch sử            | `garden/infrastructure/outbox/`         | không         |
| Viết nhịp, nếu là loại cây                                 | `garden/domain/rhythm/`                 | không         |
| Đăng ký handler vào `providers`, nhịp vào `GARDEN_RHYTHMS` | `garden.module.ts`                      | vài dòng      |
| Giá trị enum mới, nếu cần                                  | Prisma + contracts                      | một migration |
| Giống cây mới, nếu cần; thiếu thì dùng `fallback`          | `garden-sim/species/` + registry client | không         |
| Chạy nạp lịch sử một lần                                   | lệnh                                    | không         |

Trước khi thêm, module phải qua KD-GDN-011: việc của nó là chăm sóc hoặc nhìn lại, không phải đo đếm.

## 10. Lộ trình

| Giai đoạn | Nội dung                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**    | Habit V4 (Thùng rác, xóa vĩnh viễn); Forge phát `HabitCreated`, `HabitCheckedIn`, `HabitCheckInUndone`, `HabitRelapsed`, `HabitQuitStartChanged`                                                        |
| **P1**    | `garden_subjects`, `garden_entries`; ledger, handler nguồn Habit + nạp lịch sử; nhịp Habit, cỏ, dấu; `GET /garden`; `garden-sim` v1 (cây, bụi gai, fallback); trang `/garden` 3D cơ bản; luật phụ thuộc |

P0 và phần ghi sổ của P1 đi chung, theo từng lát. Mỗi lát gồm event Forge cộng handler Garden của nó:

| Lát | Forge phát                                                                             | Garden ghi                                                  |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| G1a | `HabitCreated`                                                                         | gieo (`garden_subjects`); `HabitPermanentlyDeleted` nhổ cây |
| G1b | `HabitCheckedIn`, `HabitCheckInUndone`                                                 | `TENDED`, `UNTENDED` (`garden_entries`)                     |
| G1c | `HabitRelapsed`, `HabitQuitStartChanged`                                               | `MARKED SCAR`; gieo lại                                     |
| G1d | lifecycle (lưu trữ, Thùng rác), lịch                                                   | `RESTED`/`RESUMED`, `hidden_at`, `RHYTHM_SET`               |
| G1e |                                                                                        | nạp lịch sử cho Habit có sẵn                                |
| P2  | Reflection: ánh sáng, đèn lồng, "Ngày này năm xưa" thắp đèn; khí hậu: ánh sáng         |
| P3  | Crucible: hạt trong túi, dây leo, hoa, trái                                            |
| P4  | Chronicle: vòng năm, tua thời gian (`?at=`); khí hậu: mùa của đời sống, bầu trời, Mood |
| P5  | Rễ do người dùng nối; hình ảnh: phông nền giờ thật, thời tiết thật (người dùng tự bật) |

## 11. Quyết định đã chốt (2026-11-13)

| Mã      | Câu hỏi                                        | Chốt                                                          |
| ------- | ---------------------------------------------- | ------------------------------------------------------------- |
| Q-GDN-1 | Check-in ngày không đến lịch có tính là chăm?  | Có (BR-GDN-003)                                               |
| Q-GDN-2 | Nhiều lần tái phạm trong một tuần thì mấy sẹo? | Một (BR-GDN-004)                                              |
| Q-GDN-3 | Habit tạo thử có thành cây?                    | Có; người dùng xóa ở Forge (Habit V4), Garden không có nút ẩn |
| Q-GDN-4 | Sửa `quitStartedAt` thì cây gieo lại?          | Có (BR-GDN-007)                                               |
| Q-GDN-5 | Ngưỡng mọc cỏ?                                 | 3 tuần, chỉnh sau khi có dữ liệu thật                         |
| —       | Garden đọc DB module khác hay tự đủ?           | Tự đủ ở mức tối thiểu (KD-GDN-012)                            |
| —       | Dữ liệu nguồn bị xóa vĩnh viễn?                | Xóa theo (BR-GDN-SB-006)                                      |

## 12. Câu hỏi mở

| Mã      | Câu hỏi                                                                                                                                                      | Chốt ở                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Q-GDN-6 | Dây leo Project "có chăm" khi nào: có activity (commit, coding time), đang trong cycle, hay kết hợp? Nghiêng về kết hợp.                                     | P3                    |
| Q-GDN-7 | Vườn đông dần qua nhiều năm thì hiển thị thế nào?                                                                                                            | P5                    |
| Q-GDN-8 | Công thức mùa của đời sống                                                                                                                                   | P4, trên dữ liệu thật |
| Q-GDN-9 | Gió, mưa động có trái nguyên tắc "chuyển động chỉ giải thích thay đổi trạng thái" của `product/vision.md` không? Bỏ, hay ghi Garden là ngoại lệ có chủ đích. | P5                    |
