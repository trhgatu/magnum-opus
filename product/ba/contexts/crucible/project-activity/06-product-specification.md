# Crucible — Project Activity Evidence — Product Specification

> **Status:** Product Baseline Candidate
>
> **Domain:** Crucible / Projects / Activity Evidence
>
> **Purpose:** Baseline sản phẩm hợp nhất cho Phase 1 (GitHub): ngôn ngữ chung, nơi capability xuất hiện trong sản phẩm, trạng thái hiển thị, câu chữ và các bất biến — dựa trên `01` → `05`.

---

## 1. Related Documentation

| File                                           | Vai trò                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `01-ba-overview.md`                            | Problem, needs, scope, decisions           |
| `02-evidence-behavior-analysis.md`             | Hành vi: attribution, divergence, snapshot |
| `03-integration-architecture.md`               | Kiến trúc, DB, kết quả spike GitHub API    |
| `04-functional-requirements-business-rules.md` | FR-PAC, BR-PAC                             |
| `05-use-cases-acceptance-criteria.md`          | UC-PAC, Acceptance Criteria                |
| `../project/05-product-specification.md`       | Baseline sản phẩm của Projects (không đổi) |

---

# 2. Specification Authority

Tài liệu này là baseline sản phẩm của Activity Evidence Phase 1. Khi một tài liệu phân tích trước đó mâu thuẫn với tài liệu này về **những gì người dùng thấy và làm**, tài liệu này là nguồn sự thật.

Tài liệu này **không** thay đổi bất kỳ điều gì trong `../project/05-product-specification.md`: mọi lifecycle, Cycle, outcome, ngày dự kiến và ghi chú khép lại giữ nguyên.

Tài liệu này không xác định endpoint, DTO, schema hay component cụ thể. Endpoint thuộc `07`; DB thuộc `03` §7.

---

# 3. Product Definition

**Activity Evidence** là phần cho người dùng thấy, cạnh lời tuyên bố về một vòng theo đuổi, những gì họ thực sự đã làm trong vòng đó — lấy tự động từ GitHub, chỉ đọc.

| Activity Evidence **là**            | Activity Evidence **không phải**        |
| ----------------------------------- | --------------------------------------- |
| Bằng chứng để nhìn lại              | Đồng hồ đo năng suất, điểm số, xếp hạng |
| Một tấm gương đặt cạnh lời tuyên bố | Người tự quyết trạng thái Project       |
| Tùy chọn, chỉ cho Project có nguồn  | Phần bắt buộc của mọi Project           |
| Tóm tắt theo ngày                   | Danh sách commit hay nhật ký công việc  |

---

# 4. Ubiquitous Language

Thuật ngữ trong tài liệu BA và nhãn tương ứng người dùng thấy:

| Khái niệm (BA)      | Nhãn trong sản phẩm        | Ghi chú                                        |
| ------------------- | -------------------------- | ---------------------------------------------- |
| Connection          | **Kết nối GitHub**         | Ở trang Cài đặt                                |
| Project Source      | **Nguồn hoạt động**        | Một repository gắn với Project                 |
| Cycle Activity      | **Hoạt động của vòng này** | Trong card Cycle đang mở                       |
| Activity Snapshot   | **Hoạt động của vòng**     | Trong từng Cycle đã đóng                       |
| Active day          | **ngày có hoạt động**      |                                                |
| Day strip           | **dải ngày**               | Mỗi ô một ngày                                 |
| No data             | **chưa có dữ liệu**        | Không bao giờ được thay bằng "không hoạt động" |
| Divergence D2       | Lời nhắc                   | Có nút **Tiếp tục**                            |
| Divergence D1/D3/D4 | Dòng thông tin             | Không có nút                                   |

Không dùng trong sản phẩm: "năng suất", "điểm", "streak", "mục tiêu commit", "hiệu suất".

---

# 5. Where Activity Evidence Appears

```text
/settings
  └── Kết nối GitHub                         (§6)

/projects/:id/edit
  └── Nguồn hoạt động                        (§7)

/projects/:id
  ├── Hero (trạng thái, Cycle)
  │     └── Dòng thông tin D3 / D4           (§9)   khi không có Cycle mở
  ├── Card Cycle đang mở
  │     ├── Outcome, lịch sử outcome          (có sẵn)
  │     ├── Ngày dự kiến                      (có sẵn)
  │     └── Hoạt động của vòng này            (§8) + lời nhắc D2 / dòng D1 (§9)
  └── Các chu kỳ đã đóng
        └── Hoạt động của vòng (snapshot)     (§10)
```

**Vì sao quản lý nguồn nằm ở trang Chỉnh sửa:** BR-PAC-034 không cho trang chi tiết của Project không có nguồn hiển thị khung trống hay lời mời kết nối. Trang Chỉnh sửa là nơi người dùng chủ động thay đổi thông tin Project, nên mục "Nguồn hoạt động" ở đó không làm Project trông như đang thiếu gì. Trang chi tiết chỉ hiển thị hoạt động khi đã có nguồn.

---

# 6. Settings — Kết nối GitHub

Một card mới trong `/settings`, đặt sau card múi giờ.

## 6.1. States

| Trạng thái              | Hiển thị                                                                                             | Hành động                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------- |
| Chưa kết nối            | Mô tả ngắn + hướng dẫn tạo token (§6.2) + ô dán token                                                | **Kết nối**                      |
| Đang hoạt động          | "Đã kết nối: **trhgatu**" · "Token hết hạn 14/10/2027"                                               | **Thay token**, **Ngắt kết nối** |
| Sắp hết hạn (≤ 14 ngày) | Như trên + nhắc: "Token hết hạn sau 9 ngày. Tạo token mới và thay trước ngày đó để không gián đoạn." | **Thay token**, **Ngắt kết nối** |
| Đã hết hạn / bị thu hồi | "Kết nối không còn dùng được: token đã hết hạn." / "...: GitHub đã thu hồi token."                   | **Thay token**, **Ngắt kết nối** |

Không có trạng thái nào hiển thị token, kể cả một phần.

## 6.2. Token Guidance

Khi chưa kết nối hoặc khi thay token, card hiển thị hướng dẫn:

```text
1. Trên GitHub: Settings → Developer settings → Fine-grained tokens → Generate new token.
2. Repository access: chọn các repository muốn dùng (có thể gồm repository private).
3. Permissions: Contents — Read-only; Pull requests — Read-only.
4. Expiration: tùy bạn; Magnum Opus sẽ nhắc trước khi token hết hạn.

Commit chỉ được tính cho bạn khi email của commit đã được xác minh trên tài khoản GitHub.
```

## 6.3. Actions

| Hành động                      | Hành vi                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| Kết nối                        | Kiểm tra token → thành công: chuyển sang "Đang hoạt động", toast "Đã kết nối GitHub". Lỗi: §6.4 |
| Thay token, cùng tài khoản     | Như Kết nối; toast "Đã cập nhật token GitHub"                                                   |
| Thay token, **khác** tài khoản | Hộp xác nhận (§6.5) trước khi thay                                                              |
| Ngắt kết nối                   | Hộp xác nhận (§6.5); thành công: toast "Đã ngắt kết nối GitHub"                                 |

## 6.4. Errors

| Tình huống                 | Câu chữ                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| Token bị GitHub từ chối    | "GitHub không chấp nhận token này. Kiểm tra lại token rồi thử lại."     |
| Token thiếu quyền          | "Token thiếu quyền đọc. Cần Contents và Pull requests ở mức Read-only." |
| Không liên lạc được GitHub | "Chưa kết nối được tới GitHub. Thử lại sau ít phút."                    |

Lỗi không xóa nội dung ô token người dùng vừa dán.

## 6.5. Confirmations

**Thay bằng tài khoản khác**

> **Đổi sang tài khoản GitHub khác?**
> Token này thuộc tài khoản **other-account**, khác với **trhgatu** đang kết nối. Các nguồn hoạt động đã gắn bằng **trhgatu** sẽ ngừng được cập nhật. Hoạt động đã có và các tóm tắt của vòng đã đóng vẫn được giữ nguyên.
> [Hủy] [Đổi tài khoản]

**Ngắt kết nối**

> **Ngắt kết nối GitHub?**
> Magnum Opus sẽ xóa token và ngừng cập nhật mọi nguồn hoạt động. Hoạt động đã có và các tóm tắt của vòng đã đóng vẫn được giữ nguyên.
> [Hủy] [Ngắt kết nối]

---

# 7. Project Edit — Nguồn hoạt động

Một mục mới ở cuối trang `/projects/:id/edit`, tách khỏi form tên/mô tả (không đi qua nút Lưu của form).

## 7.1. States

| Trạng thái                  | Hiển thị                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Chưa kết nối GitHub         | "Gắn repository GitHub để thấy hoạt động thật của từng vòng. Cần kết nối GitHub trước." + liên kết tới Cài đặt |
| Đã kết nối, chưa có nguồn   | Mô tả ngắn + **Gắn repository**                                                                                |
| Có nguồn                    | Danh sách nguồn (§7.2) + **Gắn repository**                                                                    |
| Kết nối không còn dùng được | Danh sách nguồn với trạng thái tương ứng + liên kết "Cập nhật token ở Cài đặt"; không gắn thêm được            |

## 7.2. Source Row

```text
trhgatu/magnum-opus                         [Đang cập nhật]   Cập nhật lúc 14:32   [Gỡ]
trhgatu/old-repo                            [Lỗi]             Không đọc được repository — kiểm tra quyền của token.   [Gỡ]
```

| Trạng thái nguồn | Nhãn           | Dòng phụ                                                  |
| ---------------- | -------------- | --------------------------------------------------------- |
| `ACTIVE`         | Đang cập nhật  | "Cập nhật lúc HH:mm" (hoặc ngày, nếu không phải hôm nay)  |
| `ERROR`          | Lỗi            | Lý do + cách khắc phục (§12)                              |
| `DISCONNECTED`   | Ngừng cập nhật | "Đã gắn bằng tài khoản khác hoặc đã ngắt kết nối GitHub." |

## 7.3. Link Repository

1. **Gắn repository** mở một ô chọn có tìm kiếm (cùng kiểu với ô chọn múi giờ / habit của hệ thống).
2. Danh sách gồm repository mà token đọc được, sắp theo lần cập nhật gần nhất trên GitHub.
3. Repository đang là nguồn của Project khác có nhãn phụ "Đang dùng cho: Tên Project".
4. Repository đã là nguồn của chính Project này không xuất hiện.
5. Chọn → gắn ngay; toast "Đã gắn trhgatu/magnum-opus".
6. Nếu repository đang dùng cho Project khác, ô chọn hiển thị trước một dòng cảnh báo: "Hoạt động của repository này sẽ xuất hiện ở cả hai Project."

## 7.4. Unlink Repository

> **Gỡ trhgatu/magnum-opus khỏi Project?**
> Hoạt động của repository này sẽ không còn tính cho vòng đang mở. Tóm tắt của các vòng đã đóng không thay đổi. Bạn có thể gắn lại bất cứ lúc nào.
> [Hủy] [Gỡ]

---

# 8. Project Detail — Hoạt động của vòng này

Xuất hiện trong card Cycle đang mở, **sau** outcome và ngày dự kiến, chỉ khi Project có ít nhất một nguồn (BR-PAC-034, BR-PAC-035).

## 8.1. Layout

```text
┌ Intended Outcome — Cycle 3 ──────────────────────────────────────────┐
│ Ship Project V1.1                                    [Sửa]           │
│ Lịch sử outcome (2 lần đặt) ▸                                        │
│ ─────────────────────────────────────────────────────────────────── │
│ Dự kiến kết thúc 31/10/2026                 [Đổi ngày] [Bỏ ngày]     │
│ ─────────────────────────────────────────────────────────────────── │
│ HOẠT ĐỘNG CỦA VÒNG NÀY                                              │
│ ⚠ Có hoạt động trong 2 ngày dù đang tạm dừng.        [Tiếp tục]      │   ← chỉ khi D2
│ ■■□■■■▨▩▩■■■□■                                                      │
│ 8 ngày có hoạt động (2 ngày lúc tạm dừng) · 23 commit · 4 PR mở · 3 PR merge │
│ Hoạt động gần nhất: hôm nay, 14:20 · Cập nhật lúc 14:32              │
│ Đã 7 ngày chưa có hoạt động.                                        │   ← chỉ khi D1
│ trhgatu/old-repo: token đã hết hạn — cập nhật ở Cài đặt.            │   ← chỉ khi nguồn lỗi
└──────────────────────────────────────────────────────────────────────┘
```

## 8.2. Day Strip

- Một ô cho mỗi ngày từ ngày Cycle mở tới hôm nay, theo múi giờ tài khoản; ngày hôm nay ở cuối.
- Cycle dài hơn 70 ngày: dải xuống dòng theo tuần (7 ô một hàng), hàng mới nhất ở dưới cùng.

| Trạng thái ngày | Thể hiện                  | Mô tả cho trình đọc màn hình       |
| --------------- | ------------------------- | ---------------------------------- |
| `ACTIVE`        | Ô tô đậm (màu chính)      | "12/10: có hoạt động"              |
| `PAUSED_ACTIVE` | Ô tô đậm có sọc (màu phụ) | "08/10: có hoạt động lúc tạm dừng" |
| `PAUSED_IDLE`   | Ô nhạt có sọc             | "07/10: tạm dừng"                  |
| `IDLE`          | Ô viền, không tô          | "09/10: không có hoạt động"        |
| Chưa có dữ liệu | Ô viền đứt nét            | "06/10: chưa có dữ liệu"           |

- Có chú thích nhỏ dưới dải, chỉ liệt kê các trạng thái đang xuất hiện trong dải.
- Màu không phải cách duy nhất để phân biệt trạng thái (sọc, viền đứt, mô tả).

## 8.3. Summary Line

| Tình huống                         | Câu chữ                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| Có hoạt động                       | "8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge" |
| Có hoạt động lúc tạm dừng          | "8 ngày có hoạt động (2 ngày lúc tạm dừng) · ..."        |
| Dữ liệu đầy đủ, không có hoạt động | "Chưa có hoạt động trong vòng này."                      |
| Toàn bộ vòng chưa có dữ liệu       | "Chưa có dữ liệu hoạt động cho vòng này."                |
| Một phần vòng chưa có dữ liệu      | Câu bình thường + "(một số ngày chưa có dữ liệu)"        |

Metric bằng 0 (vd 0 PR) vẫn được hiển thị khi có hoạt động khác, không bị ẩn. Không có so sánh với vòng trước.

## 8.4. Freshness

- "Hoạt động gần nhất: hôm nay, 14:20" / "hôm qua, 21:05" / "12/10, 09:30".
- "Cập nhật lúc HH:mm": thời điểm sớm nhất trong các lần cập nhật của các nguồn.
- Trong lúc đang chép lại, phần hoạt động vẫn hiển thị dữ liệu hiện có; không chặn trang.

---

# 9. Divergence Presentation

| ID  | Khi                                                                               | Vị trí                             | Hình thức                       | Câu chữ                                                                      |
| --- | --------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| D2  | `PAUSED`, hoạt động ≥ 2 ngày từ lúc tạm dừng                                      | Đầu phần "Hoạt động của vòng này"  | Lời nhắc (không phải lỗi) + nút | "Có hoạt động trong N ngày dù đang tạm dừng." [**Tiếp tục**]                 |
| D1  | `ACTIVE`, 7 ngày không hoạt động                                                  | Cuối phần "Hoạt động của vòng này" | Dòng chữ nhỏ                    | "Đã N ngày chưa có hoạt động."                                               |
| D3  | `STOPPED`/`COMPLETED` sau ít nhất một Cycle, có hoạt động sau lúc Cycle cuối khép | Dưới hero                          | Dòng chữ nhỏ                    | "N commit kể từ khi hoàn thành (gần nhất 14/10)." / "... kể từ khi dừng ..." |
| D4  | `NOT_STARTED`, có hoạt động sau khi gắn nguồn                                     | Dưới hero                          | Dòng chữ nhỏ                    | "Đã có hoạt động dù Project chưa bắt đầu."                                   |

- Project `STOPPED` chưa từng bắt đầu không hiển thị divergence nào.
- D3 tính từ lúc Cycle cuối khép, kể cả khi nguồn được gắn sau đó.
- D3 đếm mọi loại hoạt động; câu chữ nêu commit khi chỉ có commit, hoặc "N hoạt động" khi có cả PR.
- Lời nhắc D2 dùng giọng trung tính: không "cảnh báo", không màu lỗi.
- Nút **Tiếp tục** của D2 chính là hành động Resume của Project: cùng trạng thái đang xử lý, cùng thông báo thành công "Đã tiếp tục "Tên Project"", cùng xử lý khi Project đã thay đổi ở phiên khác.
- Không có nút đóng/bỏ qua trên bất kỳ dòng nào.

---

# 10. Closed Cycle — Hoạt động của vòng

Trong mỗi Cycle đã đóng **có snapshot**, sau ghi chú khép lại:

```text
Cycle 1 · 01/10/2026 → 12/10/2026 · Hoàn thành
  Ship Project V1.1
  Dự kiến kết thúc 10/10/2026
  Ghi chú khép lại: Lên production, trễ 2 ngày
  ── Hoạt động của vòng ──
  ■■■■□▨▩▩□■■■
  8 ngày có hoạt động (2 ngày lúc tạm dừng) · 23 commit · 4 PR mở · 3 PR merge
  Nguồn: trhgatu/magnum-opus · dữ liệu tới 12/10/2026 17:00
```

- Dải ngày, số liệu và tên nguồn **đúng như lúc chụp**; múi giờ của dải là múi giờ lúc chụp.
- Nếu một nguồn trong snapshot chưa đầy đủ tới lúc khép, dòng nguồn nêu rõ: "trhgatu/old-repo — dữ liệu tới 11/10/2026 09:00".
- Cycle không có snapshot: không có mục "Hoạt động của vòng", không có khung trống.

---

# 11. Formatting

| Loại              | Định dạng                                                         |
| ----------------- | ----------------------------------------------------------------- |
| Ngày              | `dd/mm/yyyy`, theo múi giờ tài khoản (snapshot: múi giờ lúc chụp) |
| Giờ               | `HH:mm`, 24 giờ                                                   |
| Hôm nay / hôm qua | Dùng chữ cho hai ngày gần nhất, còn lại dùng ngày                 |
| Số                | Số nguyên, không rút gọn ("1.024 commit", không "1k")             |
| Tên nguồn         | `owner/repository` như trên GitHub                                |

---

# 12. Source Error Copy

| Nguyên nhân                      | Câu chữ (gắn với tên nguồn)                                             |
| -------------------------------- | ----------------------------------------------------------------------- |
| Token hết hạn                    | "token đã hết hạn — cập nhật ở Cài đặt."                                |
| Token bị thu hồi                 | "GitHub đã thu hồi token — cập nhật ở Cài đặt."                         |
| Mất quyền / repository không còn | "không đọc được repository — kiểm tra quyền của token hoặc repository." |
| Đổi tài khoản / ngắt kết nối     | "ngừng cập nhật — đã gắn bằng tài khoản GitHub khác."                   |
| Giới hạn request                 | "GitHub tạm giới hạn truy cập — sẽ tự cập nhật lại sau."                |
| GitHub lỗi / mạng                | "chưa cập nhật được — sẽ thử lại khi bạn mở lại trang."                 |

Lỗi nguồn không bao giờ dùng hộp thoại hay chặn trang; không bao giờ thay thế phần hoạt động đã có.

---

# 13. Accessibility

- Mỗi ô của dải ngày có mô tả văn bản (§8.2); dải có nhãn "Dải ngày của vòng này".
- Lời nhắc D2 được thông báo một lần khi xuất hiện, không lặp lại khi trang cập nhật.
- Các nhãn trạng thái nguồn không chỉ dựa vào màu.
- Mọi hộp xác nhận dùng cùng thành phần hộp thoại của hệ thống, có tiêu điểm bàn phím.

---

# 14. Product Invariants

| ID          | Invariant                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| INV-PAC-P01 | Không bề mặt nào của Activity Evidence thay đổi lifecycle trừ nút Tiếp tục của D2, vốn là Resume. |
| INV-PAC-P02 | Trang chi tiết của Project không có nguồn không hiển thị bất kỳ phần nào của Activity Evidence.   |
| INV-PAC-P03 | Lời tuyên bố luôn được hiển thị trước hoạt động.                                                  |
| INV-PAC-P04 | "Chưa có dữ liệu" và "không có hoạt động" luôn có câu chữ và thể hiện khác nhau.                  |
| INV-PAC-P05 | Snapshot hiển thị đúng như lúc chụp, kể cả tên nguồn và múi giờ.                                  |
| INV-PAC-P06 | Token không xuất hiện ở bất kỳ đâu trong sản phẩm.                                                |
| INV-PAC-P07 | Lỗi của một nguồn chỉ hiển thị cạnh nguồn đó; trang luôn tải được.                                |
| INV-PAC-P08 | Không có số liệu nào được so sánh giữa các vòng hay giữa các Project.                             |

---

# 15. Explicitly Deferred

| Capability                                  | Lý do / điều kiện        |
| ------------------------------------------- | ------------------------ |
| WakaTime (giờ code)                         | Phase 2, OQ-PAC-001      |
| Habit làm nguồn; Journal/Memory gắn Project | Phase 2, OQ-PAC-009      |
| Hoạt động trong Chronicle                   | OQ-PAC-004               |
| Tính bù snapshot cho Cycle đã đóng          | OQ-PAC-006               |
| Báo commit không xác định tác giả           | OQ-PAC-007               |
| Nhiều tài khoản GitHub                      | Ngoài Phase 1            |
| Webhook, chép định kỳ                       | Ngoài Phase 1            |
| Danh sách commit / liên kết tới từng commit | Ngoài phạm vi (`01` §10) |

---

# 16. Presentation Decisions Still Open

| Chủ đề                               | Mặc định của baseline       | Có thể chỉnh khi dùng thật  |
| ------------------------------------ | --------------------------- | --------------------------- |
| Ngưỡng nhắc token sắp hết hạn        | 14 ngày                     | ✅                          |
| Ngưỡng D1 / D2                       | 7 ngày / 2 ngày             | ✅ (OQ-PAC-002)             |
| Độ dài dải ngày trước khi xuống dòng | 70 ngày                     | ✅                          |
| Màu và mẫu sọc cụ thể                | Theo token màu của hệ thống | Quyết định ở implementation |

---

# 17. Acceptance Baseline

Acceptance Criteria của `05` là baseline nghiệm thu. Tài liệu này bổ sung các tiêu chí hiển thị:

```gherkin
Given Project có nguồn và Cycle đang mở có một khoảng chưa có dữ liệu
When người dùng xem dải ngày
Then các ngày đó có thể hiện và mô tả "chưa có dữ liệu"
And khác với ngày "không có hoạt động"
```

```gherkin
Given Project chưa có nguồn
When người dùng mở trang chi tiết Project
Then không có phần nào nhắc tới hoạt động, GitHub hay nguồn
And người dùng vẫn gắn được nguồn từ trang Chỉnh sửa
```

```gherkin
Given Project PAUSED với lời nhắc D2
When người dùng chọn Tiếp tục
Then người dùng thấy cùng thông báo thành công như khi bấm Tiếp tục ở thanh hành động
```

---

# 18. Next Step

`07-api-contract.md` — endpoint, request/response, mã lỗi cho các bề mặt ở §6 → §10.
