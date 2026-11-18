# 12 — Garden

Tài liệu kỹ thuật của bounded context Garden. Phần nghiệp vụ (vấn đề, quy tắc, lộ trình) ở [BA Garden](../../product/ba/contexts/garden/01-ba-overview.md).

## 1. Ba trục độc lập

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

## 2. Ổ cắm

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

## 3. Bố cục

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

## 4. Luật phụ thuộc (thêm vào `architecture/dependency-rules.spec.ts`)

| Luật                                                                                              | Lý do                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Garden chỉ chạm context khác qua `contexts/<module>/contracts`, và chỉ từ `infrastructure/outbox` | Garden application và domain không biết Forge. Luật outbox adapter đã có sẵn lo phần này |
| Không context nào import `garden`                                                                 | Module nguồn không biết vườn tồn tại                                                     |
| `garden/domain` không import Prisma hay Nest                                                      | Nhịp, cỏ, khí hậu là hàm thuần                                                           |
| `packages/garden-sim` không phụ thuộc gói nào                                                     | Chạy được ở server, client, test                                                         |

## 5. Luồng

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

## 6. Thêm một module mới

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

## 7. Dữ liệu

`kind`, `subject_kind`, `variant`, `mark` là Prisma enum, giống `ActivityEvent.kind`. Thêm loại mới là thêm giá trị enum kèm một migration nhỏ.
