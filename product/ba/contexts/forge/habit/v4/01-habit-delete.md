# Habit V4 — Thùng rác và xóa vĩnh viễn

> Trạng thái: **đã chốt hướng, chờ triển khai**. Bản đầu 2026-11-13.
> Phụ thuộc: Habit V1–V3, temporal-history (lịch theo phiên bản, lưu trữ/khôi phục).
> Thay đổi: sửa `KD-HAB-002` (V1). Habit V4 phải xong trước Garden P1.

## 1. Vì sao

`KD-HAB-002 — No Permanent Delete` nằm trong mục ngoài phạm vi của V1, cạnh nhắc nhở và gamification. Đó là cắt phạm vi, không phải nguyên tắc sản phẩm. Hệ quả hiện tại:

- Tạo nhầm hoặc tạo thử một Habit thì nó tồn tại mãi.
- `KD-HAB2-009` (cho sửa `quitStartedAt`) phải viện lý do "không có delete" để mở lối thoát cho lỗi nhập.
- Lệch với lời hứa sản phẩm: "Người dùng có thể sửa, xuất và xóa dữ liệu của mình" (`product/journey.md`). Journal và Memory đã có Thùng rác và xóa vĩnh viễn (`product/v1.md`).

## 2. Hai cách "bỏ" một Habit

| Người dùng muốn                                      | Hành động                           | Dữ liệu                    |
| ---------------------------------------------------- | ----------------------------------- | -------------------------- |
| "Không theo đuổi nữa, nhưng đó là một phần đời mình" | **Lưu trữ** (đã có)                 | giữ nguyên, khôi phục được |
| "Tạo nhầm, tạo thử, hoặc không muốn nó tồn tại"      | **Thùng rác → xóa vĩnh viễn** (mới) | xóa hết, không khôi phục   |

Lưu trữ vẫn là lối mặc định và nhẹ nhàng. Xóa là hành động có chủ đích, đi qua hai bước.

## 3. Phạm vi

- Chuyển Habit vào Thùng rác, khôi phục từ Thùng rác, xóa vĩnh viễn trong Thùng rác.
- Danh sách Thùng rác của Habit.
- Ngoài phạm vi: xóa hàng loạt, tự dọn Thùng rác sau N ngày, Thùng rác cho Routine.

## 4. Trạng thái

Theo đúng mẫu của Journal và Memory: **một trường `state` quyết định**, `stateBeforeTrash` nhớ chỗ để quay về, `trashedAt` chỉ ghi thời điểm. `state` thay cho `isActive`.

```
            lưu trữ / khôi phục (đã có)
   ACTIVE ◄──────────────────────────► ARCHIVED
      │                                   │
      └──── vào Thùng rác ───┬─── vào Thùng rác
                             ▼
                          TRASHED   stateBeforeTrash = ACTIVE | ARCHIVED
                             │
              ┌──────────────┴──────────────┐
     khôi phục từ Thùng rác           xóa vĩnh viễn
     state = stateBeforeTrash         (mất hẳn)
```

| Hành động              | `state`            | `stateBeforeTrash`  | `trashedAt` |
| ---------------------- | ------------------ | ------------------- | ----------- |
| Vào Thùng rác          | `TRASHED`          | trạng thái trước đó | thời điểm   |
| Khôi phục từ Thùng rác | `stateBeforeTrash` | `null`              | `null`      |

## 5. Quy tắc

| Mã          | Quy tắc                                                                                                                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-HAB4-001 | Habit `ACTIVE` hoặc `ARCHIVED` đều chuyển được vào Thùng rác.                                                                                                                                                                                         |
| BR-HAB4-002 | Habit trong Thùng rác không hiện ở danh sách, tổng quan, trang Hôm nay, danh sách đã lưu trữ hay trong Routine. Không check-in, ghi tái phạm, sửa, lưu trữ hay khôi phục (lưu trữ) được. Chỉ có hai hành động: khôi phục từ Thùng rác, xóa vĩnh viễn. |
| BR-HAB4-003 | Khôi phục từ Thùng rác đưa Habit về đúng trạng thái trước đó (`ACTIVE` hoặc `ARCHIVED`), giữ nguyên lịch sử, vị trí và thứ tự trong Routine.                                                                                                          |
| BR-HAB4-004 | Ngày nằm trong Thùng rác được tính như ngày **không sống** (giống ngày lưu trữ, temporal-history 02 §4.1): không có lịch, không làm đứt chuỗi, không phải bỏ lỡ (Q-HAB4-1).                                                                           |
| BR-HAB4-005 | Xóa vĩnh viễn chỉ hợp lệ với Habit đang trong Thùng rác, và luôn qua một bước xác nhận riêng nói rõ điều gì sẽ mất: số lần ghi dấu, số lần tái phạm, các Routine đang chứa nó.                                                                        |
| BR-HAB4-006 | Xóa vĩnh viễn xóa Habit cùng toàn bộ check-in, tái phạm, phiên bản lịch, lịch sử lưu trữ, liên kết và lịch sử thành viên Routine. Các bảng này đã `onDelete: Cascade` theo Habit.                                                                     |
| BR-HAB4-007 | Dữ liệu đã chép sang context khác (Chronicle, Garden) phải được dọn theo khi xóa vĩnh viễn. Quyền xóa dữ liệu đứng trên lịch sử bất biến (Q-HAB4-2).                                                                                                  |
| BR-HAB4-008 | Mỗi hành động phát một domain event qua outbox, chỉ mang định danh, không mang nội dung: `HabitTrashed`, `HabitRestoredFromTrash`, `HabitDeleted`.                                                                                                    |

## 6. API

Habit đã dùng `PATCH /habits/:id/restore` cho "khôi phục từ lưu trữ", nên khôi phục từ Thùng rác cần tên khác:

| Endpoint                                | Việc                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `PATCH /habits/:id/trash`               | vào Thùng rác                                                                     |
| `PATCH /habits/:id/untrash`             | khôi phục từ Thùng rác                                                            |
| `DELETE /habits/:id?expectedRevision=N` | xóa vĩnh viễn; Habit không ở Thùng rác thì 409 `HABIT_PERMANENT_DELETE_FORBIDDEN` |
| `GET /habits?status=TRASHED`            | danh sách Thùng rác, dùng lại danh sách có phân trang như Đã lưu trữ              |

`GET /habits/:id` vẫn trả Habit trong Thùng rác (để có revision khi khôi phục, xóa); `GET /habits/:id/overview` thì trả 404, nên trang chi tiết không mở được. Giao diện đặt nút Khôi phục và Xóa vĩnh viễn ngay trên từng dòng của Thùng rác.

## 7. Dữ liệu

Giống `JournalEntry` / `Memory`:

```prisma
enum HabitState {
  ACTIVE
  ARCHIVED
  TRASHED
}

model Habit {
  // bỏ isActive
  state            HabitState  @default(ACTIVE)
  stateBeforeTrash HabitState? @map("state_before_trash")
  trashedAt        DateTime?   @map("trashed_at")

  @@index([ownerId, state])   // thay @@index([ownerId, isActive])
}
```

- **Migration chuyển dữ liệu:** `state = CASE WHEN is_active THEN 'ACTIVE' ELSE 'ARCHIVED' END`, rồi bỏ cột `is_active`. Viết tay trong migration SQL, có cách quay lại.
- **BR-HAB4-004 không cần action mới.** Lịch sử lifecycle ghi lúc Habit đổi giữa "sống" và "không sống", nên dùng lại `ARCHIVED` / `RESTORED`, và chỉ ghi khi trạng thái sống thật sự đổi: Habit `ACTIVE` vào Thùng rác ghi `ARCHIVED`; Habit `ARCHIVED` vào Thùng rác không ghi gì (vốn không sống); khôi phục về `ACTIVE` ghi `RESTORED`, về `ARCHIVED` không ghi gì. Nhờ vậy `isAliveOn`, Chronicle, chuỗi ngày, Routine hiểu ngày trong Thùng rác như ngày lưu trữ mà không phải sửa.
- Không cần cột mới cho xóa vĩnh viễn.
- Routine **giữ nguyên** `isActive`; Routine chưa có Thùng rác (ngoài phạm vi).

### 7.1 Chỗ phải đổi từ `isActive` sang `state`

Khoảng 70 chỗ đọc `isActive` trong code server của Forge (không tính test), cộng contracts và client:

| Nơi                           | Ví dụ                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Habit                         | aggregate, mapper, repository, reader, overview reader, presenter, `get-habits` (lọc đang rèn / đã lưu trữ) |
| Habit check-in, Habit relapse | `owned-habit-reader` (chỉ cho ghi khi Habit đang `ACTIVE`)                                                  |
| Routine                       | `routine-habit-reader`, `add-routine-habit` (chỉ thêm Habit `ACTIVE`)                                       |
| Today                         | `prisma-today.reader`                                                                                       |
| Analytics                     | `prisma-dashboard-stats.reader`                                                                             |
| Contracts                     | `packages/contracts/src/habit/habit.ts`: thay `isActive` bằng `state` trong response                        |
| Client                        | `features/habit` (editor, lifecycle controls, streak panel), `features/routine` (habit manager)             |
| Seed                          | `packages/database/prisma/seed.ts`                                                                          |

Mọi chỗ đang hiểu `isActive = true` là "đang rèn" đổi thành `state = ACTIVE`; `isActive = false` đổi thành `state = ARCHIVED`. `TRASHED` không lọt vào chỗ nào trong hai nhóm này, nên BR-HAB4-002 tự đúng ở mọi query đã lọc theo trạng thái.

## 8. Ảnh hưởng tới context khác

| Context   | Ảnh hưởng                                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routine   | Habit trong Thùng rác bị ẩn khỏi Routine nhưng vẫn giữ chỗ (BR-HAB4-003). Xóa vĩnh viễn thì liên kết mất theo cascade. Routine chỉ còn Habit trong Thùng rác thì hiển thị như Routine rỗng. |
| Chronicle | Phần Habit của snapshot đã đóng băng lưu `habitTitle` (chuỗi dài nhất, đều đặn nhất, ngày không tái phạm) mà không lưu `habitId`, nên hiện không tìm được để dọn (Q-HAB4-2).                |
| Garden    | Thùng rác: cây tạm ẩn. Khôi phục: cây hiện lại. Xóa vĩnh viễn: cây và mọi dòng sổ của nó bị xóa (Garden BA §6.3).                                                                           |

## 9. Triển khai theo đợt

| Đợt | Nội dung                                                                                                                                                     | Trạng thái |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | `isActive` → `state` (`ACTIVE`/`ARCHIVED`/`TRASHED`), chưa có hành vi Thùng rác                                                                              | xong       |
| 2   | Vào / ra Thùng rác, xóa vĩnh viễn, danh sách Thùng rác, giao diện                                                                                            | xong       |
| 3   | Event `HabitTrashed` / `HabitRestoredFromTrash` / `HabitDeleted` (BR-HAB4-008) và dọn Chronicle (BR-HAB4-007, Q-HAB4-2), làm cùng các event Habit cho Garden | chưa       |

Hộp xác nhận xóa vĩnh viễn (BR-HAB4-005) hiện nói rõ những gì sẽ mất bằng lời (ghi dấu, tái phạm, lịch, chỗ trong nếp sinh hoạt), chưa kèm số lượng.

## 10. Câu hỏi mở

| Mã       | Câu hỏi                                                             | Đề xuất                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-HAB4-1 | Ngày trong Thùng rác tính là không sống (như lưu trữ) hay vẫn sống? | Không sống. Nếu không, khôi phục sau một tuần sẽ hiện cả tuần là bỏ lỡ, như phạt người dùng vì đã cân nhắc xóa.                                                                           |
| Q-HAB4-2 | Snapshot Chronicle đã đóng băng có tên Habit bị xóa thì sao?        | Từ nay section Habit lưu thêm `habitId`. Khi xóa vĩnh viễn, thay tên bằng null và giao diện hiện "một thói quen đã xóa". Snapshot cũ chưa có `habitId`: dọn một lần theo `ownerId` + tên. |
