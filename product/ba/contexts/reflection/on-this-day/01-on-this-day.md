# On This Day — BA và API Contract

> **Status:** V1
> **Domain:** Reflection / On This Day
> **Purpose:** Nhắc lại những gì người dùng đã ghi lại đúng ngày này ở các năm trước, trên trang Hôm nay.

---

## 1. Related Documentation

- Journal: `../journal/01-ba-overview.md` (UN-JRN-002 Revisit & Reflect).
- Memory: trường `occurredOn` và `occurredOnPrecision`.

## 2. Nhu cầu

Người dùng ghi ký ức và nhật ký để đọc lại sau này, nhưng ít khi tự mở lại. Trang Hôm nay chủ động đưa ra những gì rơi vào **đúng ngày và tháng hôm nay** ở những năm trước, để chúng được đọc lại đúng lúc có ý nghĩa nhất.

Ngoài phạm vi V1: "tháng này năm xưa" (ký ức chỉ nhớ tháng), check-in thói quen, hoạt động Project, thông báo đẩy.

## 3. Quy tắc

### BR-OTD-001 — Hôm nay

"Hôm nay" là ngày lịch theo múi giờ của tài khoản, không theo đồng hồ server hay trình duyệt.

### BR-OTD-002 — Nguồn và ngày của từng nguồn

| Nguồn         | Ngày dùng để so                         | Điều kiện                                     |
| ------------- | --------------------------------------- | --------------------------------------------- |
| Ký ức         | `occurredOn` (ngày thuần)               | `state = ACTIVE`, `occurredOnPrecision = DAY` |
| Trang nhật ký | `createdAt`, đổi sang múi giờ tài khoản | `state ≠ TRASHED` (gồm nháp và đã niêm phong) |

Không dùng bảng Timeline: nó không lưu độ chính xác của ngày ký ức (ký ức chỉ nhớ tháng sẽ rơi vào ngày 1), và ghi trang nhật ký theo lúc niêm phong chứ không theo lúc viết.

### BR-OTD-003 — Năm xưa

Chỉ lấy mục có cùng tháng và ngày, **năm nhỏ hơn năm nay**. Mục của năm nay (đã có thẻ Reflection lo) và ký ức ghi ngày tương lai không hiện. `yearsAgo = năm nay − năm của mục`.

### BR-OTD-004 — 29 tháng 2

Năm không nhuận, ngày 28/2 hiện cả mục của 28/2 lẫn 29/2, để mục ngày 29/2 không vắng mặt ba năm liền. Năm nhuận, mỗi ngày chỉ hiện mục của chính nó.

### BR-OTD-005 — Không lặp một chuyện

Ký ức có `sourceJournalEntryId` là bản chắt lọc của trang nhật ký đó. Nếu cả hai cùng có mặt, chỉ giữ ký ức.

### BR-OTD-006 — Thứ tự và giới hạn

Gần nhất trước (1 năm trước, rồi 2 năm…); cùng năm thì ký ức trước trang nhật ký. Mỗi nguồn tối đa 10 mục. Trang Hôm nay hiện 3 mục đầu, còn lại gói thành "+N khác".

### BR-OTD-007 — Không chặn trang Hôm nay

Không có mục nào thì không hiện gì. Lỗi khi tải thì phần này im lặng, phần còn lại của trang vẫn dùng được.

## 4. API Contract

```
GET /reflection/on-this-day
Authorization: Bearer <token>
```

```typescript
type OnThisDayKind = 'MEMORY' | 'JOURNAL';

interface OnThisDayItemResponse {
  kind: OnThisDayKind;
  id: string;
  title: string | null; // trang nhật ký có thể không có tiêu đề
  excerpt: string | null; // trang nhật ký: ≤ 80 ký tự đầu, khoảng trắng gộp lại; ký ức: null
  day: string; // YYYY-MM-DD của mục
  yearsAgo: number;
}

interface OnThisDayResponse {
  date: string; // hôm nay theo múi giờ tài khoản, YYYY-MM-DD
  items: OnThisDayItemResponse[]; // theo BR-OTD-006
}
```

| Status | Khi nào                                                 |
| ------ | ------------------------------------------------------- |
| 200    | Luôn luôn khi đã đăng nhập; không có gì thì `items: []` |
| 401    | Chưa đăng nhập                                          |

Chỉ trả dữ liệu của chính người gọi.

## 5. Ghi chú kỹ thuật

- Lọc theo tháng và ngày bằng SQL thô (`to_char(..., 'MM-DD') = ANY(...)`): Prisma không lọc được "cùng tháng và ngày, năm bất kỳ". Giá trị đi qua tham số của `$queryRaw`, không ghép chuỗi.
- `journal_entries.created_at` là `TIMESTAMP` lưu giờ UTC không kèm múi giờ: phải `AT TIME ZONE 'UTC'` trước rồi mới `AT TIME ZONE <múi giờ tài khoản>`.
- Không thêm index: điều kiện theo ngày không dùng được index, nhưng chỉ quét dữ liệu của một người dùng (đã có index theo `owner_id`).
