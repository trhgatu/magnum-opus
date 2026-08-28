# Design language

Tài liệu này là design contract của Magnum Opus. Nó giúp con người và coding agent tiếp tục giao diện theo cùng một ngôn ngữ, thay vì thiết kế lại sản phẩm theo cảm hứng của từng task.

Khi một mockup, yêu cầu ngắn hạn hoặc implementation cũ mâu thuẫn với tài liệu này, cần nêu rõ mâu thuẫn trước khi chọn hướng xử lý. Không âm thầm mở rộng design language.

## 1. Ý niệm trung tâm

Magnum Opus là một không gian riêng để làm việc với nguyên liệu của đời sống: suy nghĩ, ký ức, cảm xúc, thói quen và lựa chọn.

Sản phẩm gợi liên tưởng đến giả kim thuật nhưng không biến thành một giao diện fantasy. Chất giả kim xuất hiện qua cảm giác chuyển hóa, vật liệu, ánh sáng và ngôn ngữ; không xuất hiện bằng cách phủ biểu tượng huyền bí lên mọi nơi.

Ba phẩm chất phải đồng thời tồn tại:

1. **Tĩnh:** nội dung có đủ khoảng thở và không bị navigation, số liệu hoặc hiệu ứng tranh giành sự chú ý.
2. **Có trọng lượng:** những gì được viết, lưu giữ hoặc thực hành phải giống một vật có giá trị, không giống dữ liệu tạm trong một dashboard.
3. **Có chủ đích:** mỗi màn hình có một hành động chính rõ ràng và không thúc ép người dùng tương tác nhiều hơn mức cần thiết.

## 2. Những điều giao diện không được trở thành

- Không phải dashboard SaaS với hàng loạt metric card.
- Không phải game giả kim với rune, bình thuốc và hiệu ứng phát sáng ở khắp nơi.
- Không phải mạng xã hội hoặc công cụ tạo áp lực bằng streak.
- Không dùng gradient, blur, animation hoặc icon chỉ để lấp khoảng trống.
- Không tạo thêm client-side state khi HTML, CSS hoặc Server Component đã giải quyết được vấn đề.
- Không tăng performance budget chỉ vì một thay đổi trang trí.

## 3. Giọng nói sản phẩm

Copy phải ngắn, bình tĩnh và không phán xét.

- Không dùng đại từ `mày` hoặc `bạn` trong giao diện.
- Ưu tiên câu trung tính: “Bắt đầu một trang mới”, “Chưa có ký ức nào”, “Thử lại”.
- Không hứa hẹn biến đổi cuộc đời, không tuyên bố hiểu người dùng và không dùng ngôn ngữ self-help sáo rỗng.
- Error message nói rõ điều vừa xảy ra và hành động an toàn tiếp theo.
- Destructive action nói rõ dữ liệu nào sẽ mất và có thể khôi phục hay không.

Tên hiển thị chuẩn:

| Khái niệm         | Tên trên giao diện |
| ----------------- | ------------------ |
| Journal           | `Journal`          |
| Memory / Memories | `Ký ức`            |
| Mood              | `Mood`             |
| Habit             | `Habit`            |
| Routine           | `Routine`          |
| Timeline          | `Timeline`         |

Tên route và contract kỹ thuật không cần đổi theo tên hiển thị. Ví dụ, giao diện dùng `Ký ức` nhưng route vẫn là `/memories`.

## 4. Nền tảng thị giác chung

### Màu sắc

Chỉ dùng semantic token đã có như `background`, `foreground`, `card`, `muted`, `primary`, `border`, `destructive` và `ring`.

- `background`: không gian nền chính.
- `card`: bề mặt chứa nội dung có trọng lượng.
- `muted`: lớp phụ, metadata và vùng điều khiển thứ cấp.
- `primary`: hành động có chủ đích, điểm neo và dấu mốc.
- `destructive`: chỉ dành cho lỗi hoặc hành động phá hủy.

Không hard-code màu thương hiệu trực tiếp trong feature component. Khi cần thay đổi palette, chỉnh token toàn cục thay vì tìm và thay từng màn hình.

### Typography

- `font-display`: heading, title của Journal, Ký ức, Habit và Routine.
- Font sans mặc định: control, label, mô tả và body UI.
- `font-mono`: revision, ngày tháng, số thứ tự, trạng thái kỹ thuật và metadata ngắn.
- Heading dùng `tracking-tight`; eyebrow và metadata uppercase dùng tracking rộng.
- Nội dung dài cần line-height thoáng, thường từ `leading-7` đến `leading-9`.

### Hình khối và chiều sâu

- Hero và bề mặt nội dung chính: `rounded-3xl`.
- Card collection và toolbar: `rounded-2xl`.
- Input, button và control nhỏ: theo primitive shadcn hiện có.
- Dùng border mảnh và shadow nhẹ. Hover có thể nâng tối đa khoảng `-translate-y-1`.
- Luôn tôn trọng `motion-reduce`; animation không được là điều kiện để hiểu trạng thái.

## 5. Ngôn ngữ theo context

Các context dùng cùng token và primitive nhưng có cách biểu đạt riêng. Không tạo một theme hoàn toàn khác cho từng module.

### Reflection

Reflection nhẹ, yên và thiên về việc lưu giữ.

- **Journal — manuscript:** bề mặt giống một trang viết, title lớn, content chiếm ưu tiên, chrome tối thiểu.
- **Ký ức — archive record:** ngày xảy ra và độ chính xác là metadata quan trọng; card giống một hiện vật được lưu trữ.
- **Timeline — chronology:** dùng một trục thời gian thực, marker rõ ràng và record nối theo thứ tự.
- **Mood — annotation:** là lớp chú thích cảm xúc cho Journal, không được lấn át nội dung Journal.

### Forge

Forge chắc, có cấu trúc và thiên về thực hành.

- **Habit — practice record:** hiển thị hành động, nhịp lặp và check-in gần nhất.
- **Routine — assembly/workbench:** nhấn mạnh danh sách Habit có thứ tự và thao tác tổ chức.
- Control có thể dày hơn Reflection nhưng không biến thành dashboard năng suất.

Nếu thêm context mới, trước tiên xác định ẩn dụ chức năng của context đó bằng một câu. Sau đó thể hiện ẩn dụ qua hierarchy và layout, không phải qua decoration.

## 6. Cấu trúc chuẩn của một collection page

Một trang danh sách thường có bốn tầng:

1. `ContextHero`: context, title, lời giải thích, metadata và primary action.
2. Workbench/filter surface: search, filter và sort nằm trong một vùng duy nhất.
3. Section divider: một label nhỏ cùng đường kẻ để chuyển từ control sang content.
4. Collection: card grid hoặc timeline, sau đó mới đến pagination.

Ví dụ:

```tsx
<section className="flex flex-col gap-7" aria-labelledby="feature-heading">
  <ContextHero
    id="feature-heading"
    icon={FeatureIcon}
    eyebrow="Context · Capability"
    title="Feature"
    description="Một câu giải thích giá trị của màn hình."
    meta={<Badge variant="outline">{total} mục</Badge>}
    actions={<PrimaryAction />}
  />

  <section
    aria-label="Tìm kiếm và lọc"
    className="rounded-2xl border bg-card/55 p-3 shadow-sm sm:p-4"
  >
    <FilterControls />
  </section>

  <div className="flex items-center gap-3">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      Nội dung đang hiển thị
    </p>
    <span className="h-px flex-1 bg-border" aria-hidden="true" />
  </div>

  <FeatureCollection />
</section>
```

Không render số lượng kết quả thành một metric card riêng. Metadata thuộc hero hoặc section label.

## 7. Card pattern

Card phải trả lời được ba câu hỏi trong một lần quét:

1. Đây là loại nội dung gì?
2. Nội dung chính là gì?
3. Trạng thái hoặc thời điểm liên quan là gì?

Card collection thường gồm:

- Header nhỏ: icon, số thứ tự, ngày hoặc badge trạng thái.
- Title và excerpt: phần có độ tương phản cao nhất.
- Footer nhẹ: metadata hoặc affordance mở chi tiết.

Toàn card có thể là một link nếu chỉ có một đích chính. Không đặt button tương tác bên trong một card-link.

Ưu tiên semantic HTML (`article`, `header`, `footer`) trong Client Component. Chỉ import Card primitive khi composition đó thực sự cần thiết; mỗi dependency phía client đều ảnh hưởng bundle.

## 8. Editor và form pattern

Editor là nơi nội dung đứng trước chrome.

- Toolbar sticky nhưng không che nội dung và không trở thành visual hero.
- Title có hierarchy mạnh hơn label.
- Vùng viết dài dùng bề mặt yên, border nhẹ và khoảng thở lớn.
- Metadata, date precision hoặc membership nằm trong surface phụ.
- Primary submit đặt cuối flow; cancel là hành động thứ cấp.
- Conflict recovery phải giữ local work trên màn hình cho đến khi người dùng chọn cách xử lý.

Không thay behavior ổn định chỉ để phục vụ redesign. Autosave, optimistic concurrency, focus mode, keyboard shortcut và unsaved-change guard là interaction contract.

## 9. Search, filter và navigation state

- Collection filter dùng URL search params để có thể reload, bookmark và dùng back/forward.
- Search form dùng GET hoặc `next/form`; không tạo local fetch chỉ để lọc server data.
- Giữ lại filter/sort không liên quan khi thay đổi một điều kiện.
- Dropdown phải đóng khi click ra ngoài; ưu tiên primitive accessible hoặc Popover API đã có.
- Search không được làm skeleton lại toàn bộ page shell. Loading boundary chỉ bao phủ phần dữ liệu thực sự thay đổi khi kiến trúc cho phép.

## 10. Loading, empty, error và success

Skeleton phải mô phỏng đúng geometry của màn hình thật. Không dùng một skeleton generic cho mọi feature.

Mỗi skeleton cần:

- Một container có `role="status"` và `aria-live="polite"`.
- Một thông báo `sr-only` mô tả nội dung đang tải.
- Hero, filter, card hoặc editor skeleton đúng với route.
- Không animate nội dung thật sau khi đã hiển thị.

Empty state giải thích vì sao chưa có dữ liệu và chỉ đưa ra một hành động hợp lý. Error state không làm lộ raw upstream error; correlation ID chỉ xuất hiện khi giúp debug hoặc support.

## 11. Component và frontend architecture

### Chọn primitive

1. Tìm primitive hiện có trong [`components/ui`](../apps/client/components/ui/) trước.
2. Dùng composition của shadcn thay vì sao chép source vào feature.
3. Shared presentation pattern đặt trong [`components/system`](../apps/client/components/system/).
4. Component chỉ có ý nghĩa với một feature đặt trong `features/<feature>/components`.

Không thêm một component library thứ hai khi shadcn và semantic HTML đã đáp ứng được nhu cầu.

### Server và Client Component

- Page, list data loading, card tĩnh và metadata mặc định là Server Component.
- Chỉ thêm `"use client"` khi component cần state, effect, event handler hoặc browser API.
- Giữ Client Component nhỏ và đặt thấp trong tree.
- Không nhập dependency trang trí nặng vào editor hoặc form nếu CSS hay text đã truyền đạt đủ ý nghĩa.
- Dynamic import dành cho feature phụ hoặc dependency nặng, không dùng để che giấu cấu trúc kém.

### State

- URL state: search, sort, filter, pagination.
- Server state: đọc qua BFF/API adapter hiện có.
- Form state cục bộ: giữ trong editor component hoặc hook của feature.
- Không thêm global store nếu state không thực sự được nhiều route độc lập cùng sở hữu.

## 12. Responsive và accessibility

- Bắt đầu từ mobile; mọi chức năng phải sử dụng được ở viewport nhỏ.
- Control row được phép wrap hoặc scroll ngang có chủ đích, không được đẩy layout ngoài viewport.
- Mọi input có label; icon trang trí có `aria-hidden="true"`.
- Icon-only button cần accessible name.
- Focus ring phải nhìn thấy bằng bàn phím.
- Dialog phá hủy cần title, description, cancel và confirm rõ ràng.
- Không truyền đạt trạng thái chỉ bằng màu.
- Heading hierarchy phải liên tục và mỗi page có một `h1` rõ ràng.

## 13. Performance contract

Thiết kế phải nằm trong performance budget hiện có.

Sau khi sửa nhiều TSX hoặc thêm dependency, chạy:

```bash
pnpm --filter=client build
pnpm --filter=client verify:performance
```

Nếu một route vượt budget:

1. Xác định dependency hoặc markup phía client vừa được thêm.
2. Chuyển presentation tĩnh về Server Component khi có thể.
3. Thay component wrapper bằng semantic HTML nếu wrapper kéo thêm client dependency.
4. Bỏ icon hoặc decoration không mang thêm thông tin.
5. Chỉ đề xuất đổi budget khi có bằng chứng về giá trị sản phẩm và chi phí đã được xem xét.

## 14. Pattern tham chiếu trong codebase

- Shared hero: [`context-hero.tsx`](../apps/client/components/system/context-hero.tsx)
- Shared hero skeleton: [`context-hero-skeleton.tsx`](../apps/client/components/system/context-hero-skeleton.tsx)
- Journal manuscript: [`journal-editor.tsx`](../apps/client/features/journal/components/journal-editor.tsx)
- Ký ức archive card: [`memory-card.tsx`](../apps/client/features/memory/components/memory-card.tsx)
- Timeline chronology: [`timeline-entry-card.tsx`](../apps/client/features/timeline/components/timeline-entry-card.tsx)
- Habit practice detail: [`habit-detail.tsx`](../apps/client/features/habit/components/habit-detail.tsx)
- Routine workbench: [`routine-habit-manager.tsx`](../apps/client/features/routine/components/routine-habit-manager.tsx)

Các file này là ví dụ hiện tại, không phải lý do để sao chép markup nguyên khối. Giữ pattern và điều chỉnh composition theo nội dung thực tế.

## 15. Definition of done cho một thay đổi UI

Một thay đổi chỉ hoàn thành khi:

- Dùng đúng ngôn ngữ của context và đúng tên hiển thị.
- Có hierarchy rõ, responsive và keyboard accessible.
- Không phá loading, empty, error, conflict hoặc destructive flow.
- Skeleton khớp layout nếu geometry của route thay đổi.
- Unit/component test liên quan pass.
- Type-check và lint pass.
- Production build và performance budget pass.
- Browser E2E của flow bị ảnh hưởng pass.
- `git diff --check` sạch.

## 16. Cách giao task cho coding agent

Có thể mở đầu task bằng đoạn sau:

```text
Đọc product/vision.md và product/design.md trước khi sửa giao diện.
Giữ nguyên business logic và interaction contract hiện có.
Tái sử dụng shadcn primitives, semantic tokens và các system pattern trong codebase.
Không thêm client state hoặc dependency nếu chưa chứng minh là cần thiết.
Sau khi sửa, cập nhật skeleton tương ứng và chạy test, type-check, lint, build,
performance budget cùng browser E2E của flow bị ảnh hưởng.
Nếu yêu cầu mâu thuẫn với design contract, hãy nêu rõ trước khi triển khai.
```
