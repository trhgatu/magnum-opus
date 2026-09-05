# Business Analysis docs

Thư mục này là layer business analysis thuần — trả lời **vấn đề, nhu cầu người dùng, outcome mong muốn, phạm vi, business rule và use case** cho từng domain. Nó không mô tả kiến trúc code hay cách triển khai; những phần đó thuộc [Engineering Handbook](../../docs/README.md). Nó cũng không lặp lại state machine/API contract kỹ thuật đã có ở [`product/features/`](../features/README.md) — hai layer tham chiếu chéo nhau: một BA doc ở đây nên link tới feature doc tương ứng cho phần "how đã build", và ngược lại.

## Cấu trúc

```text
product/ba/domains/<domain>/
├── overview.md          Problem statement, user needs, desired outcomes, scope in/out, known decisions
├── requirements.md      Functional requirements suy ra từ as-is analysis, trace về user need
├── business-rules.md    Quy tắc nghiệp vụ phải luôn đúng, đánh số để trace được
├── state-model.md       Lifecycle/state transition của domain object, kèm điều kiện chuyển trạng thái
├── use-cases.md         Use case theo actor, precondition, main flow, alternate/exception flow
└── traceability.md      Ma trận nối user need → requirement → business rule → use case → test
```

Không phải domain nào cũng cần đủ 6 file ngay từ đầu — tạo file mới khi giai đoạn phân tích tương ứng thực sự bắt đầu, không tạo sẵn file rỗng chờ điền.

## Phương pháp: reverse-analysis baseline

Phần lớn capability của Magnum Opus được implement trước khi có BA doc chính thức. Vì vậy các tài liệu ở đây là **reverse-analysis baseline**, không phải requirement viết trước rồi mới build. Nguyên tắc xuyên suốt:

```text
Existing code ≠ Requirement

Existing behavior
        ↓
Identify intent
        ↓
Trace to user need
        ↓
Validate
        ↓
Accepted baseline
```

Không tạo requirement chỉ để hợp thức hóa một implementation đã tồn tại. Một capability không trace được về problem, user need hoặc objective hợp lệ sẽ bị đánh dấu để review thay vì tự động đưa vào baseline.

Mỗi domain đi qua các giai đoạn theo thứ tự:

1. **`overview.md`** — context, problem statement, user needs, desired outcomes, scope in/out, known decisions. Không giả định business rule hay behavior chi tiết.
2. **As-Is System Analysis & Gap Analysis** — soi implementation thật để rút ra actual behavior, state transition, business rule candidate, rồi trace ngược về user need/scope; phần không trace được thì đánh dấu gap/open question. Kết quả giai đoạn này chưa có file riêng — nó là quá trình dẫn tới các file ở bước 3.
3. **Derived artifacts** (`requirements.md`, `business-rules.md`, `state-model.md`, `use-cases.md`, `traceability.md`) — dựng từ kết quả giai đoạn 2, không suy từ code một cách máy móc.

## Trạng thái theo domain

| Domain                                                            | overview | requirements | business-rules | state-model | use-cases | traceability |
| ----------------------------------------------------------------- | -------- | ------------ | -------------- | ----------- | --------- | ------------ |
| [Journal](contexts/reflection/journal/01-ba-overview.md)          | Xong     | Chưa         | Chưa           | Chưa        | Chưa      | Chưa         |
| Mood                                                              | Chưa     | Chưa         | Chưa           | Chưa        | Chưa      | Chưa         |
| Memory                                                            | Chưa     | Chưa         | Chưa           | Chưa        | Chưa      | Chưa         |
| Habit & Routine (Forge)                                           | Chưa     | Chưa         | Chưa           | Chưa        | Chưa      | Chưa         |
| [Project (Crucible)](contexts/crucible/project/01-ba-overview.md) | Xong     | Xong         | Xong           | Xong        | Xong      | Chưa         |

Cập nhật bảng này mỗi khi một file mới được thêm cho một domain.

`Project (Crucible)` đi theo pipeline mở rộng hơn 6 file gốc ở trên (`product/ba/contexts/crucible/project/01`–`08`: BA Overview → Lifecycle & Behavior Analysis → Functional Requirements & Business Rules → Use Cases & Acceptance Criteria → Product Specification → Domain Analysis → API Contract → Database Schema). Cấu trúc `product/ba/contexts/<context>/<module>/` này mới hơn `domains/<domain>/` mô tả ở mục "Cấu trúc" bên trên; mục đó chưa được cập nhật theo pipeline mới.
