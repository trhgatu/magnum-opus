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

| Mã         | Nguyên tắc                            | Hệ quả                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| KD-GDN-001 | Chỉ lớn, không héo                    | Không có gì chết hay nhỏ đi. Nghỉ thì đứng yên.                                                                                                                                                                                            |
| KD-GDN-002 | Không có con số                       | Không có điểm, %, "còn N tuần". Con số vẫn ở module gốc.                                                                                                                                                                                   |
| KD-GDN-003 | Dấu vết không phải hình phạt          | Tái phạm là sẹo đã liền; quay lại sau khi nghỉ là mắt gỗ; cây vẫn lớn.                                                                                                                                                                     |
| KD-GDN-004 | Nghỉ có chủ đích khác bỏ quên         | Lưu trữ hay tạm dừng thì cây ngủ, đất sạch. Cỏ chỉ mọc khi một thứ đang hoạt động bị bỏ quên trong im lặng.                                                                                                                                |
| KD-GDN-005 | Không thêm việc                       | Vườn không có nút tưới hay việc phải làm. Mọi hành động diễn ra ở module gốc.                                                                                                                                                              |
| KD-GDN-006 | Không sửa quá khứ                     | Cái đã mọc thì không bị viết lại. Ba ngoại lệ có chủ đích: người dùng **xóa vĩnh viễn** dữ liệu nguồn (quyền dữ liệu đứng trên lịch sử), sửa ngày bắt đầu bỏ của Habit QUIT (BR-GDN-007), và đèn lồng dời theo ngày ký ức (BR-GDN-LN-004). |
| KD-GDN-007 | Mùa nào cũng đúng                     | Mùa đông của đời sống là nghỉ, không phải sa sút. Không mùa nào được trình bày là xấu.                                                                                                                                                     |
| KD-GDN-008 | Ý nghĩa tách khỏi phông nền           | Giờ và thời tiết thật chỉ là không khí, không bao giờ mang ý nghĩa và không làm cây kém đi.                                                                                                                                                |
| KD-GDN-009 | Mở rộng không cần sửa lõi             | Module mới góp vào vườn bằng cách phát sự kiện và thêm một nguồn (§9, Engineering Handbook). Lõi Garden không biết module cụ thể.                                                                                                          |
| KD-GDN-010 | Không bao giờ gọi người dùng quay lại | Không thông báo, không nhắc "cây đang chờ". Vườn chỉ hiện ra khi người dùng tự mở.                                                                                                                                                         |
| KD-GDN-011 | Chỉ chăm sóc và nhìn lại mới vào vườn | Một module có chỗ trong vườn khi việc của nó là chăm một thứ lâu dài hoặc nhìn lại chính mình. Việc đo đếm (vd tài chính) không vào vườn, vì ép vào sẽ thành chấm điểm.                                                                    |
| KD-GDN-012 | Garden tự đủ, ở mức tối thiểu         | Để tính lại cây, Garden chỉ đọc sổ của chính nó. Nguồn chép vào sổ đúng những gì cần để tính (ngày, lịch, giống cây), không bao giờ chép nội dung riêng tư.                                                                                |

## 3. Ngôn ngữ chung

| Thuật ngữ            | Nghĩa                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chủ thể**          | Một thứ được nuôi trong vườn (một Habit, một Project). Có định danh ổn định `(subject_kind, subject_id)`.                                              |
| **Hạt trong túi**    | Một ý định đã có nhưng chưa cam kết (Project `NOT_STARTED`).                                                                                           |
| **Gieo**             | Lúc một chủ thể bắt đầu được nuôi (tạo Habit, Start Project).                                                                                          |
| **Cây**              | Một chủ thể được nuôi lâu dài. Dáng cây là lịch sử theo kỳ của nó được phát lại.                                                                       |
| **Giống cây**        | Cách một cây mọc thành hình: cây thân gỗ, bụi gai, dây leo. Không phụ thuộc module (§9).                                                               |
| **Nhịp**             | Quy tắc "một kỳ thế nào là có chăm" của từng loại chủ thể (§9).                                                                                        |
| **Nguồn**            | Một context nội bộ góp vào vườn (Forge, Crucible, Reflection…). Không gọi là provider: provider trong dự án dành cho bên thứ ba (GitHub, WakaTime).    |
| **Luống**            | Một nhóm cây đứng chung vì người dùng gom chúng lại (Routine).                                                                                         |
| **Dấu vết**          | Ký hiệu trên cây kể một sự kiện: mắt gỗ (quay lại sau nghỉ), sẹo (tái phạm), hoa (cycle xong), trái (Project hoàn thành), vòng năm (một năm khép lại). |
| **Cỏ**               | Phần hoang dã quanh một cây đang hoạt động mà bị bỏ quên. Cây không chết; quay lại chăm thì cỏ gọn dần.                                                |
| **Khoảnh khắc**      | Một việc xảy ra một lần, không mọc (một sự kiện đời sống). Nằm trên lối đá.                                                                            |
| **Đèn lồng**         | Một ký ức, đặt dọc lối đá đúng ngày nó xảy ra. Đọc lại thì đèn sáng lên.                                                                               |
| **Lối đá**           | Trục thời gian của vườn.                                                                                                                               |
| **Ánh sáng**         | Sự sáng tỏ: mức người dùng dừng lại nhìn lại chính mình gần đây. Không làm cây lớn hay nhỏ đi; chỉ đổi việc vườn hiện ra rõ hay mờ (§7.4).             |
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

| Loại            | Ví dụ                                           | Mọc theo nhịp?         |
| --------------- | ----------------------------------------------- | ---------------------- |
| **Cây**         | Habit, Project                                  | có                     |
| **Ánh sáng**    | Journal, "Ngày này năm xưa", tổng kết Chronicle | không, góp vào khí hậu |
| **Khoảnh khắc** | sự kiện đời sống (tương lai)                    | không, nằm trên lối đá |

### 4.3 Sáu vai của một sự kiện

Mỗi nguồn gán cho từng sự kiện của mình đúng một vai. Garden chỉ hiểu sáu vai này:

| Vai             | Habit               | Project                     | Journal                                           | Memory                                                            |
| --------------- | ------------------- | --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| **Gieo**        | tạo Habit           | Start (tạo = hạt trong túi) |                                                   |                                                                   |
| **Chăm**        | check-in            | Q-GDN-6                     |                                                   |                                                                   |
| **Dấu**         | tái phạm → sẹo      | cycle đóng → hoa            |                                                   |                                                                   |
| **Nghỉ / tiếp** | lưu trữ / khôi phục | pause / resume              |                                                   |                                                                   |
| **Kết thúc**    | không có            | complete → trái, stop       |                                                   |                                                                   |
| **Ánh sáng**    |                     |                             | niêm phong; mở lại trang cũ từ "Ngày này năm xưa" | mở lại từ "Ngày này năm xưa" (tạo là đèn lồng, không là ánh sáng) |

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
| Đổi tên Habit              | cây đổi tên (Q-GDN-10)                             | `HabitRenamed`                                              | **Cần thêm** |
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

| Nguồn                            | Trong vườn                                        | Sự kiện nguồn                     | Có sẵn?      |
| -------------------------------- | ------------------------------------------------- | --------------------------------- | ------------ |
| Niêm phong trang nhật ký         | ánh sáng                                          | `JournalEntrySealed`              | Có           |
| Tạo ký ức                        | đèn lồng tại `occurredOn` (§7.5)                  | `MemoryCreated`                   | Có           |
| Sửa ngày ký ức                   | đèn dời chỗ                                       | `MemoryRedated`                   | Có           |
| Mở một mục từ "Ngày này năm xưa" | ánh sáng; mục là ký ức thì đèn đó sáng lên (§7.5) | `OnThisDayItemOpened`             | Có           |
| Mood của trang                   | bầu trời (P4)                                     | đi kèm trang nhật ký              | Có dữ liệu   |
| Ký ức vào / ra Thùng rác         | đèn lồng ẩn / hiện lại                            | `MemoryTrashed`, `MemoryRestored` | Có           |
| Xóa vĩnh viễn ký ức              | đèn lồng bị gỡ (§6.3)                             | `MemoryPermanentlyDeleted`        | Có           |
| Trang nhật ký vào Thùng rác      | ánh sáng đã có giữ nguyên                         |                                   |              |
| Xóa vĩnh viễn trang nhật ký      | dòng `REFLECTED` của nó bị xóa (§6.3)             |                                   | Kiểm tra lại |
| Timeline                         | chính là lối đá; Garden không làm lại             |                                   |              |

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
  name                     tên hiện tại, đổi theo module gốc qua sự kiện đổi tên (Q-GDN-10)
  name_at_planting         tên lúc gieo, không bao giờ đổi; dùng cho câu chuyện của cây
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

garden_lanterns            — mỗi ký ức một đèn (§7.5)
  id, owner_id
  memory_id                UNIQUE: định danh ký ức bên Memory
  occurred_on       date?  ngày ký ức; null khi không rõ ngày
  precision         enum   DAY | MONTH | YEAR | UNKNOWN
  hidden_at                khác null khi ký ức đang ở Thùng rác

garden_links (P5)          — rễ, do người dùng tạo
```

Tên hiển thị là `name`, đổi theo module gốc qua sự kiện đổi tên (Q-GDN-10); Garden vẫn không đọc module gốc (KD-GDN-012). `name_at_planting` giữ tên lúc gieo cho câu chuyện của cây (BR-GDN-009).

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

Cỏ mọc quanh một chủ thể **đang hoạt động** khi cuối chuỗi có từ **3 tuần `RESTED` liên tiếp** trở lên. Từ tuần `RESTED` liên tiếp thứ 3, mỗi tuần cỏ cao thêm một bậc, tối đa 5 bậc. Chăm lại thì mỗi tuần `CARED` cỏ gọn đi một bậc, không mất ngay. `SKIPPED` cắt chuỗi đếm, không làm cỏ mọc và không làm cỏ gọn. Ngưỡng 3 và trần 5 bậc chỉnh lại sau khi xem dữ liệu thật (chốt 2026-11-21).

### 7.3 Khí hậu (P2, P4)

| Yếu tố           | Cửa sổ                  | Từ đâu                                                                                                                |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Ánh sáng         | khoảng 4 tuần, đổi chậm | độ gần của các lần `REFLECTED` (§7.4)                                                                                 |
| Bầu trời         | 2–4 tuần                | ánh sáng, mức bỏ quên, sau này thêm Mood                                                                              |
| Mùa của đời sống | khoảng 12 tuần          | tỉ lệ gieo (Xuân), `TENDED` đều (Hạ), `BLOSSOM`/`FRUIT`/`CONCLUDED`/`REFLECTED` (Thu), độ thưa của mọi sự kiện (Đông) |

Công thức cụ thể chốt sau khi có dữ liệu thật (Q-GDN-8).

### 7.4 Ánh sáng là sự sáng tỏ (chốt 2026-11-23)

Ba tầng trả lời ba câu hỏi khác nhau: **cây** là thứ người dùng chăm ("mình chăm thứ này thế nào"); **khí hậu** là trạng thái chung của đời sống gần đây; **phông nền** (giờ, thời tiết thật) chỉ là không khí của thế giới bên ngoài, không mang ý nghĩa (KD-GDN-008). Ánh sáng thuộc khí hậu, nên nó không phải phần thưởng cho một việc cụ thể.

Theo ẩn dụ của James Allen (vườn là tâm trí), ánh sáng là **sự sáng tỏ**: người hay dừng lại nhìn chính mình thì thấy vườn của mình rõ ràng.

- **BR-GDN-LT-001 — Không đổi cây:** ánh sáng không làm cây lớn, nhỏ hay kém đi. Ít nhìn lại thì vườn vẫn y nguyên, chỉ hiện ra kém rõ, như có lớp sương sớm.
- **BR-GDN-LT-002 — Sương là mô tả, không là trách:** lúc sáng tỏ thấp nhất, vườn vẫn đẹp và đủ màu; sương nhẹ, yên tĩnh, không u ám (KD-GDN-007). Người chưa từng nhìn lại ở mức đó.
- **BR-GDN-LT-003 — Nguồn:** chỉ những lần người dùng thật sự dừng lại nhìn chính mình: niêm phong trang nhật ký; đọc tổng kết tháng của Chronicle; mở một ký ức hay một trang nhật ký cũ từ "Ngày này năm xưa" (chốt 2026-11-25: cả hai đều là nhìn lại). Không lấy việc làm (đó là cây), Mood (đó là bầu trời), tạo ký ức (đó là đèn lồng) hay lượt xem trang. Mỗi hành động chỉ một vai (§4.3).
- **BR-GDN-LT-004 — Độ gần, không đếm:** sáng tỏ nhất ngay sau một lần nhìn lại, nhạt dần trong khoảng 4 tuần. Không đếm số lần hay số tuần, không có tuần chốt hay chuỗi để lỡ. Thời gian nhạt chỉnh lại sau khi có dữ liệu thật.
- **BR-GDN-LT-005 — Của cả vườn:** ánh sáng chung cho mọi cây, không gắn với cây nào. Sổ ghi một loại `REFLECTED` cho mọi nguồn, phân biệt bằng `source_ref`.

### 7.5 Đèn lồng là ký ức (chốt 2026-11-23)

Ký ức là một khoảnh khắc đã xảy ra: không lớn, không cần chăm, không phai. Nên nó không là cây, cũng không là ánh sáng, mà là một vật đứng yên tại đúng một điểm trên lối đá.

- **BR-GDN-LN-001 — Một ký ức, một đèn:** tạo ký ức thì có một đèn lồng. Đèn không phải là cây: không có giống cây, chuỗi kỳ, cỏ hay dáng mọc. Garden giữ đèn bằng sự kiện của Memory, không đọc bảng của Memory (KD-GDN-012).
- **BR-GDN-LN-002 — Lối theo thứ tự:** lối đá xếp theo thứ tự ngày, không theo tỉ lệ thời gian. Đèn chen vào giữa các cây theo ngày của ký ức. Ký ức có trước khi dùng app nằm trước cây đầu tiên: đời người có trước khu vườn.
- **BR-GDN-LN-003 — Ngày mờ:** ký ức chỉ biết tháng hoặc năm thì đèn xếp theo giữa kỳ đó và có quầng sáng rộng hơn để báo ngày ước chừng. Ký ức không rõ ngày thì gom thành một chùm ở đầu lối, trước cả ký ức cũ nhất; điền ngày thì đèn về đúng chỗ.
- **BR-GDN-LN-004 — Đèn dời theo ngày:** sửa ngày ký ức thì đèn dời theo. Đây là ngoại lệ với "plot chốt lúc gieo": cây có chỗ vì đã gieo ở đó, đèn có chỗ vì ngày của ký ức.
- **BR-GDN-LN-005 — Vòng đời:** ký ức vào Thùng rác thì đèn ẩn, khôi phục thì hiện lại (BR-GDN-SB-007); xóa vĩnh viễn thì đèn bị gỡ (BR-GDN-SB-006).
- **BR-GDN-LN-006 — Không là ánh sáng:** tạo ký ức không thắp sáng vườn (BR-GDN-LT-003). Chỉ mở lại ký ức từ "Ngày này năm xưa" mới là ánh sáng, và đèn đó sáng lên.
- **BR-GDN-LN-007 — Đèn được thắp:** đèn sáng lên khi ký ức của nó được mở lại từ "Ngày này năm xưa", rồi nhạt dần như ánh sáng của vườn (BR-GDN-LT-004). Đèn sáng hơn chỉ ở màu giấy, không phát sáng. Mở lại nhiều lần trong một ngày vẫn là một lần nhìn lại.
- **BR-GDN-LN-008 — Chỉ khi thật sự mở:** chỉ tính khi người dùng chọn mục đó trong "Ngày này năm xưa" và mục đó đúng là của ngày này năm xưa hôm nay; mở ký ức từ nơi khác, hay trình duyệt tải trước trang, không tính.

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

Sửa `quitStartedAt` thì cây phát lại từ ngày mới. Các dòng sổ trước ngày đó vẫn nằm nguyên, chỉ bị bỏ qua khi diễn giải. Đây là một ngoại lệ có chủ đích với "không sửa quá khứ" (KD-GDN-006), và khớp với BR-HAB2-004.

### BR-GDN-008 — Routine

Các cây thuộc cùng Routine đứng chung một luống. Habit thuộc nhiều Routine thì đứng ở luống của Routine được gán sớm nhất. Habit không thuộc Routine nào thì đứng riêng dọc lối đá. Luống chốt ở **lần đầu** Habit vào một Routine (Habit thường được thêm vào Routine sau khi tạo); trước đó cây đứng dọc lối đá. Rời Routine hay vào Routine khác sau đó không dời cây (chốt 2026-11-22).

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

Kiến trúc kỹ thuật (nguồn, nhịp, giống cây, bố cục code, luật phụ thuộc, luồng ghi/đọc) nằm ở [Engineering Handbook: Garden](../../../../docs/modules/garden.md).

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

## 11. Quyết định đã chốt (2026-11-13; Q-GDN-10 ngày 2026-11-21; Q-GDN-11, Q-GDN-12 ngày 2026-11-23)

| Mã       | Câu hỏi                                        | Chốt                                                                                                                                |
| -------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Q-GDN-1  | Check-in ngày không đến lịch có tính là chăm?  | Có (BR-GDN-003)                                                                                                                     |
| Q-GDN-2  | Nhiều lần tái phạm trong một tuần thì mấy sẹo? | Một (BR-GDN-004)                                                                                                                    |
| Q-GDN-3  | Habit tạo thử có thành cây?                    | Có; người dùng xóa ở Forge (Habit V4), Garden không có nút ẩn                                                                       |
| Q-GDN-4  | Sửa `quitStartedAt` thì cây gieo lại?          | Có (BR-GDN-007)                                                                                                                     |
| Q-GDN-5  | Ngưỡng mọc cỏ?                                 | 3 tuần RESTED liên tiếp; tối đa 5 bậc; mỗi tuần CARED gọn 1 bậc (trần và độ gọn chốt 2026-11-21). Chỉnh sau khi có dữ liệu thật     |
| —        | Garden đọc DB module khác hay tự đủ?           | Tự đủ ở mức tối thiểu (KD-GDN-012)                                                                                                  |
| —        | Dữ liệu nguồn bị xóa vĩnh viễn?                | Xóa theo (BR-GDN-SB-006)                                                                                                            |
| Q-GDN-12 | Ký ức hiện ra trong vườn thế nào?              | Đèn lồng (2026-11-23): giữ bằng sự kiện của Memory; lối theo thứ tự; tháng/năm xếp giữa kỳ, không rõ ngày thì chùm ở đầu lối (§7.5) |
| Q-GDN-11 | Ánh sáng nghĩa là gì, lấy từ đâu, đo thế nào?  | Sự sáng tỏ (2026-11-23): từ những lần thật sự nhìn lại, đo theo độ gần, nhạt dần khoảng 4 tuần (§7.4)                               |
| Q-GDN-10 | Đổi tên Habit thì cây đổi tên theo?            | Có (2026-11-21): Forge phát `HabitRenamed`, Garden giữ cả `name` hiện tại và `name_at_planting`                                     |

## 12. Câu hỏi mở

| Mã      | Câu hỏi                                                                                                                                                      | Chốt ở                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| Q-GDN-6 | Dây leo Project "có chăm" khi nào: có activity (commit, coding time), đang trong cycle, hay kết hợp? Nghiêng về kết hợp.                                     | P3                    |
| Q-GDN-7 | Vườn đông dần qua nhiều năm thì hiển thị thế nào?                                                                                                            | P5                    |
| Q-GDN-8 | Công thức mùa của đời sống                                                                                                                                   | P4, trên dữ liệu thật |
| Q-GDN-9 | Gió, mưa động có trái nguyên tắc "chuyển động chỉ giải thích thay đổi trạng thái" của `product/vision.md` không? Bỏ, hay ghi Garden là ngoại lệ có chủ đích. | P5                    |
