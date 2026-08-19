# 04 — Client Next.js

Client là application dành cho trải nghiệm cá nhân. Nó dùng Next.js App Router và mô hình BFF: browser nói chuyện với Next.js origin; Next.js server mới gọi NestJS API.

## Vì sao client không giống admin?

Admin là SPA vận hành với nhiều bảng, filter và mutation liên tục nên TanStack Query + Zustand phù hợp. Client ưu tiên privacy, server rendering và ít JavaScript hơn. Reads bắt đầu ở Server Components; mutations đi qua Server Actions; session token không xuất hiện trong browser JavaScript.

Không dùng cùng thư viện ở mọi frontend chỉ để “nhất quán”. Nhất quán cần nằm ở contract, error semantics và design primitives; state/data tool phải phù hợp workload.

## Route groups

```text
app/
├─ (public)/              landing page
├─ (auth)/                login/register/reset/verify flows
├─ (protected)/
│  ├─ layout.tsx          protected shell
│  ├─ me/page.tsx         account
│  ├─ journal/            Journal list/editor
│  └─ memories/           Memory collection/create/detail/edit
├─ health/route.ts        deploy health endpoint
├─ layout.tsx             root HTML/fonts/metadata
├─ error.tsx              segment error boundary
├─ global-error.tsx       last-resort boundary
└─ not-found.tsx
```

Tên group trong ngoặc không đi vào URL. Nó cho phép auth/public/protected có layout khác nhau mà URL vẫn gọn.

## Session boundary

`lib/session.ts` sở hữu cookie `client_session`. Cookie chứa access và refresh token nhưng được mã hóa bằng JWE `dir + A256GCM` với key SHA-256 từ `SESSION_SECRET`.

Đọc đoạn tạo cookie:

```ts
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SEVEN_DAYS_SECONDS,
};
```

`httpOnly` chặn JavaScript đọc cookie. `secure` bắt HTTPS ở production. `sameSite=lax` giảm CSRF trong khi vẫn cho top-level navigation. `path=/` làm session dùng được trên mọi route. `maxAge` phải khớp JWE expiry để browser và cryptographic payload không có hai khái niệm hết hạn khác nhau.

`getSession()` chỉ chạy server-side. `setSession()` và `clearSession()` chỉ được gọi tại Server Action/Route Handler vì render phase không được sửa cookie.

## Proxy refresh flow

`proxy.ts` chạy trước route. Nó bảo vệ `/me` và `/journal`, giải mã session rồi đọc `exp` của access token để biết token sắp hết hạn. Đọc `exp` ở đây không phải xác minh token; API vẫn xác minh chữ ký. Proxy chỉ dùng nó như lịch refresh.

Khi còn hơn 60 giây, request đi tiếp. Khi sắp hết hạn, `refreshSessionSingleFlight` chống nhiều request song song cùng consume một rotating refresh token. Nếu refresh thất bại nhưng access token cũ còn hạn, response không xóa cookie ngay vì một request đồng thời khác có thể vừa refresh thành công.

Đây là race condition thực tế của RSC: một page có thể phát nhiều request song song. Single-flight và “loser does not delete a still-valid session” ngăn logout ngẫu nhiên.

## API boundary

`lib/api.ts` là nơi duy nhất ghép `API_URL`, timeout, correlation ID, Authorization header và error normalization.

```text
apiFetch(path)
→ getSession()
→ requestApi(path, Bearer accessToken)
→ AbortSignal timeout 10s
→ no-store fetch
→ response error contract hoặc JSON
→ reportApiFailure nếu lỗi transport/upstream
```

`API_URL` không có prefix `NEXT_PUBLIC_`, nên nó không được bundle xuống browser. `apiFetchPublic` chỉ dùng cho auth endpoint không cần session. Response `204` được đổi thành `undefined`; feature API có thể chuẩn hóa tiếp thành `null`, như `getMood()`.

`ApiError` chứa `kind`, HTTP status, stable backend `code`, correlation ID và retryable. UI hiển thị safe message và dùng code để chọn recovery flow.

## Auth feature

`features/auth/actions/auth.ts` chứa Server Actions cho login, register, logout, password reset và email verification. Components chỉ quản lý form interaction; secret/session mutation nằm server-side.

Pattern:

```text
form component
→ useActionState / form action
→ validate input ở Server Action
→ apiFetchPublic
→ set/clear encrypted session nếu cần
→ redirect ngoài catch block
```

Redirect của Next.js được implement bằng exception nội bộ, nên không được bọc `redirect()` trong catch thông thường.

Permanent delete của Journal và Memory cũng kết thúc bằng redirect ngay trong Server Action:

```text
Client xác nhận xóa
→ Server Action gọi DELETE với expectedRevision
→ lỗi: trả safe error, giữ nguyên detail/dialog
→ thành công: revalidate collection
→ redirect sang collection Trash ngoài catch block
```

Client Component không tự gọi tiếp `router.push()` rồi `router.refresh()` trên success path. Nếu làm vậy, Next có thể re-render detail route trong khoảng bản ghi đã bị xóa nhưng navigation chưa hoàn tất; detail page sẽ gọi lại GET entry, Memory hoặc Mood và nhận 404 dù thao tác xóa thực tế đã thành công. Server Action sở hữu cả mutation completion lẫn destination nên không tồn tại trạng thái trung gian đó.

## Account feature

`features/account/api/current-user.ts` đọc `/users/me` phía server. `account-shell.tsx` chỉ nhận public current-user contract; không nhận access token hay class instance.

## Journal feature

### List page

Server Component đọc `searchParams`, chuẩn hóa URL filter rồi gọi `getJournalEntries`. Search/filter/pagination được biểu diễn trong URL để reload, back/forward và chia sẻ link vẫn đúng.

Journal dùng cùng collection toolbar với Memory: search nằm trong cột linh hoạt, state filter nằm ở cạnh phải trên desktop và xuống hàng trên màn hình nhỏ. Toolbar dùng cùng border, background, radius và spacing token. Các state link luôn dùng cùng font weight nên việc đổi active state không làm chiều rộng control thay đổi.

Các component nhỏ có một trách nhiệm: `journal-search`, `journal-state-filter`, `journal-pagination`, `journal-entry-card`, `create-entry-button`. `journal-url.ts` tập trung thao tác URL để component không tự ghép query string khác nhau.

### Editor

`JournalEditor` là client orchestration component. `useJournalDraft` sở hữu title/content, revision, autosave state, local recovery và conflict state. `JournalEntryContent` chỉ render input/preview. `JournalEditorToolbar` chỉ render actions và keyboard affordances.

Autosave flow:

```text
onChange
→ local state đổi ngay
→ debounce
→ updateJournalEntry Server Action(expectedRevision)
→ success: nhận snapshot + revision mới
→ conflict: giữ local draft, hiện recovery choices
→ network error: giữ draft trong session storage
```

`flush()` được gọi trước seal/trash/back để lifecycle command không chạy trên revision cũ trong khi autosave còn chờ.

`JournalDraftRecoveryAlert` cho sao chép Markdown khi entry đã mất, session hết hạn hoặc remote state không còn editable. Dữ liệu người dùng luôn có đường thoát trước khi UI từ bỏ draft.

Markdown preview được dynamic import vì editor write path không cần parser ngay. Điều này giảm first-load JavaScript.

### Ký ức liên quan

`app/(protected)/journal/[id]/page.tsx` gọi `getMemories({ sourceJournalEntryId, limit: 6, sortBy: "occurredOn", sortOrder: "desc" })` cùng `Promise.all` với entry và Mood, tránh waterfall. `JournalLinkedMemories` (dynamic import như `MoodPanel`) hiển thị các Memory đã tạo từ entry và nút "Giữ lại như ký ức" thứ hai.

Nút này **dùng chung** hàm `createMemoryFromEntry` và điều kiện `disabled` với nút cùng tên trên `JournalEditorToolbar` — cả hai đều `flush()` draft trước khi điều hướng và bị khoá khi `busy`/`conflict`/đang phục hồi session. Đây là một pattern cố ý: hai điểm vào cho cùng một hành động không được phép có hai mức an toàn dữ liệu khác nhau.

### Loading state theo hình dạng nội dung

`journal/loading.tsx`, `journal/[id]/loading.tsx`, và các route tương ứng của Memories dùng 4 component khung xương dùng chung (`components/system/{collection,editor,article,form}-skeleton.tsx`) thay vì `app/loading.tsx` chung của toàn app — vì `app/loading.tsx` chỉ hiện ở lần tải đầu tiên (Suspense boundary gốc không remount khi điều hướng trong app đã mount), không hiện khi chuyển giữa các route con. Khung xương khớp đúng hình dạng nội dung thật (danh sách thẻ, editor, bài viết, form) để tránh giật layout khi dữ liệu tải xong.

## Mood feature

`app/(protected)/journal/[id]/page.tsx` bắt đầu `getJournalEntry(id)` và `getMood(id)` cùng lúc bằng `Promise.all`, tránh waterfall.

`features/mood/api/mood.ts` là server-only read adapter. `actions/mood.ts` validate lại toàn bộ input vì TypeScript type không bảo vệ runtime Server Action. `mood-panel.tsx` giữ draft UI và dùng `useTransition` cho mutation.

Mood panel được lazy-load từ Journal editor. Initial bundle của `/journal/[id]` nhờ đó còn khoảng 615.9 KiB thay vì sát trần 625 KiB. Lazy loading không thay business flow; skeleton có role/status để assistive technology hiểu trạng thái.

Conflict không tự retry PUT vì retry cùng revision chắc chắn tiếp tục conflict, còn retry không revision có thể ghi đè dữ liệu mới. UI đưa nút tải snapshot mới nhất.

## Memory feature

Toolbar collection gom search, trạng thái và sắp xếp vào cùng một surface. Trạng thái còn ở dạng segmented control vì được chuyển thường xuyên; tiêu chí và chiều sắp xếp dùng HTML Popover API với chế độ `auto`. Browser tự light-dismiss khi click ra ngoài, đóng bằng phím Escape và đặt panel vào top layer mà không cần hydrate React. CSS Anchor Positioning neo panel vào nút trigger. Các lựa chọn bên trong vẫn là link có URL canonical, nên deep link, back/forward và chia sẻ URL không bị mất.

Memory tiếp tục cùng server-first pattern nhưng được tách thành feature riêng:

```text
app/(protected)/memories/*   route composition và server reads
features/memory/api          server-only HTTP adapter
features/memory/actions      validated Server Actions
features/memory/lib          URL và partial-date normalization
features/memory/components   collection, editor và lifecycle UI
```

List page giữ search, state, sort và pagination trong URL. Vì vậy reload, back/forward và link được chia sẻ vẫn khôi phục đúng collection. Page detail/new/edit là Server Component; chỉ editor và lifecycle controls mang `"use client"` vì chúng cần local interaction state.

Search form dùng `next/form`: nếu JavaScript chưa sẵn sàng, browser vẫn submit GET bình thường; sau hydration, Next thực hiện client navigation và thay history entry thay vì tải lại document. Search và sort controls vẫn là Server Component, không tạo local state hoặc effect; hành vi dismiss của sort popover thuộc về browser platform.

Memory có thể được tạo độc lập hoặc từ Journal. Link “Giữ lại như một ký ức” chỉ chuyển sang form mới với `sourceJournalEntryId`; nó không tự tạo record. Server Component owner-scope Journal để tạo seed, còn backend kiểm tra lại source trước khi persist. Hai lớp kiểm tra phục vụ hai mục đích khác nhau: frontend tạo trải nghiệm đúng, backend bảo vệ trust boundary.

Route segment `/memories` có `error.tsx` riêng. Boundary giữ lời nhắn an toàn rằng dữ liệu không bị thay đổi, đồng thời cung cấp nút retry và đường quay về không gian chính. Collection cố ý không dùng route-level `loading.tsx`: một thao tác search hoặc filter không được thay PageHeading, toolbar và toàn bộ nội dung bằng skeleton. Giao diện hiện tại được giữ nguyên cho tới khi Server Component mới sẵn sàng thay thế. Root boundary vẫn là lớp dự phòng cuối cùng cho lỗi nằm ngoài feature.

Editor chuyển input `DAY`, `MONTH`, `YEAR`, `UNKNOWN` sang representation chuẩn trước khi gọi Server Action. Khi update gặp revision conflict, local form không bị thay đổi. Người dùng chọn một trong hai flow:

Phần nhập thời gian được tách thành `MemoryDateField` thay vì nằm lẫn trong `MemoryEditor`. Độ chính xác dùng shadcn `Select` vì đây là lựa chọn một giá trị trong tập cố định; `DropdownMenu` chỉ dành cho danh sách hành động. Khi chọn `DAY`, `MemoryDayPicker` ghép `Popover` và `Calendar` thành Date Picker. `MONTH` và `YEAR` vẫn dùng input chuyên biệt vì lịch chọn ngày sẽ gợi sai độ chính xác, còn `UNKNOWN` không dựng ra một ngày giả.

`MemoryDayPicker` được dynamic import với `ssr: false`. Nhờ đó `react-day-picker`, locale và formatter ngày chỉ được tải khi editor thật sự cần lịch; collection, detail và các route không liên quan không phải trả chi phí JavaScript này. Giá trị từ lịch được chuyển bằng năm, tháng và ngày ở local timezone thay vì `toISOString()`, tránh trường hợp một ngày người dùng chọn bị lùi sang ngày trước ở UTC+7.

Production build sau thay đổi đo hai editor route ở khoảng 659.1 KiB, collection khoảng 562.3 KiB và detail khoảng 602.3 KiB. Collection tăng khoảng 3.9 KiB để đổi native document submit thành soft navigation qua `next/form`; đổi lại thao tác tìm kiếm không thay toàn bộ route bằng skeleton. Budget riêng của `/memories` được điều chỉnh có chủ đích từ 560 lên 565 KiB, chỉ còn khoảng 2.7 KiB dư địa. Vì script đo toàn bộ first-load JavaScript gắn với route, bao gồm async Date Picker chunk, budget riêng của `/memories/new` và `/memories/[id]/edit` vẫn là 670 KiB. Đây không phải trần chung mới: các route khác giữ nguyên budget của chúng và CI vẫn chặn regression tiếp theo.

```text
Dùng bản mới nhất
→ reloadMemory qua BFF
→ thay form bằng snapshot server

Ghi nội dung đang viết
→ reloadMemory qua BFF
→ lấy revision mới
→ PUT local form với expectedRevision mới
```

Không dùng `router.refresh()` làm conflict recovery chính vì Server Component có thể render lại nhưng state đã khởi tạo trong Client Component không tự động được reset theo ý nghiệp vụ.

## Timeline feature

Timeline là feature đọc thuần túy, gọi `GET /reflection/timeline` qua `features/timeline/api/timeline.ts`. Không có `actions/` vì không có mutation nào ở client cho feature này.

`app/(protected)/timeline/page.tsx` render danh sách một cột (không phải grid như Memory) vì Timeline là dòng sự kiện tuần tự, không phải collection để so sánh cạnh nhau. `TimelineEntryCard` rẽ nhánh theo `entryType` (`JOURNAL_SEALED` → link `/journal/:id`, `MEMORY_CREATED` → link `/memories/:id`) và tự vô hiệu hóa link khi `sourceExists === false` — nguồn có thể đã bị xóa vĩnh viễn sau khi được ghi vào Timeline, hiển thị nhầm một link chết còn tệ hơn hiển thị badge "Đã xóa".

`timeline/loading.tsx` không tái dùng `CollectionSkeleton` vì component đó có sẵn ô action button và search bar (khớp Memory/Journal) mà Timeline không có; skeleton riêng chỉ giữ `PageHeading` và các dải placeholder một cột, đúng tinh thần "khung xương khớp hình dạng nội dung thật" đã áp dụng cho Journal/Memory.

## Navigation theo không gian

Protected client không còn đặt Hồ sơ, Journal và Memories ngang hàng trong một danh sách link. `AccountShell` chỉ làm composition root cho ba phần độc lập:

```text
AppSidebar          navigation desktop
MobileNavigation   drawer navigation trên màn hình nhỏ
AccountMenu        hồ sơ và đăng xuất
```

`features/navigation/config/product-navigation.ts` là nguồn sự thật duy nhất cho cấu trúc điều hướng. Mỗi `ProductSpace` đại diện cho một không gian có ý nghĩa đối với hành trình sản phẩm; `NavigationItem` là capability bên trong không gian đó. Tên capability dùng tiếng Anh nhất quán: Reflection hiện chứa Journal, Memories và Timeline. Nội dung mô tả và hành động vẫn dùng tiếng Việt tự nhiên, chẳng hạn “lưu một ký ức”; đây là câu nghiệp vụ chứ không phải tên module. Engineering được ghi nhận ở trạng thái `planned` nhưng không được render thành link chết.

`ContextNavigation` dùng pathname làm nguồn sự thật cho active state. `/journal` và `/journal/:id` cùng đánh dấu Journal; `/journalism` không được nhận nhầm chỉ vì có chung tiền tố. Vì trạng thái được tính từ URL, deep link, reload và back/forward không làm sidebar lệch khỏi trang đang mở.

Trên desktop, `AppSidebar` có hai trạng thái. Trạng thái mở rộng rộng `17rem`, hiển thị tên sản phẩm, mô tả context và label của từng capability. Trạng thái thu gọn rộng `5rem`, chỉ giữ logo và icon; mỗi icon navigation có native tooltip qua `title`, `aria-label` và vẫn giữ `aria-current` cho route đang active. Control trên đường biên là label của một native checkbox ẩn trực quan: click chuột hoặc nhấn Space đều đổi checked state, còn focus ring vẫn dùng design token của sidebar.

`AccountShell` dùng flex thay vì grid có cột cố định. Vì sidebar tự đổi chiều rộng còn content dùng `flex-1`, vùng nội dung tự nhận lại không gian mà không cần truyền state collapse lên layout. CSS `:has(input:checked)` điều khiển width và visibility của label; không cần React state hoặc thêm JavaScript vào shared bundle. Checked state được giữ khi chuyển giữa các protected route vì shared layout không remount, nhưng chủ động trở về trạng thái mở rộng sau một lần reload. Chưa lưu vào cookie hay local storage vì đây là preference trình bày nhỏ, chưa phải dữ liệu nghiệp vụ.

Chỉ `ContextNavigation` và mobile dialog cần `use client`: context navigation đọc pathname, mobile dialog gọi DOM API. `AppSidebar`, `AccountShell` và `AccountMenu` vẫn là Server Component; sidebar collapse và account dropdown lần lượt dùng native checkbox và `details`. Boundary này giữ JavaScript phía browser ở phần thực sự tương tác, còn page content truyền qua layout vẫn được render phía server.

## Components

`components/ui` là primitives theo phong cách shadcn: Button, Card, Alert, Dialog, Input… Chúng không biết Journal, Mood hay Memory. `components/system` là composition có ý nghĩa toàn application như BrandMark, PageHeading, EmptyState.

Feature component được phép import UI primitive; UI primitive không được import feature. Direction này giữ design system tái sử dụng được.

## State nên đặt ở đâu?

| State                    | Vị trí                                         |
| ------------------------ | ---------------------------------------------- |
| Dữ liệu đọc ban đầu      | Server Component/API function.                 |
| Session/token            | Encrypted HttpOnly cookie phía Next server.    |
| Form interaction ngắn    | Local component state/useActionState.          |
| Journal draft + autosave | Feature hook `useJournalDraft`.                |
| Memory editor/conflict   | Local component state + Server Actions.        |
| Sidebar mở/thu gọn       | Native checkbox trong shared protected layout. |
| Filter có thể bookmark   | URL search params.                             |
| Data backend dài hạn     | NestJS + database, không phải browser store.   |

Client hiện không cần Zustand global store hoặc TanStack Query. Chỉ thêm khi có use case mà RSC/URL/local state không giải quyết tốt, không thêm vì admin đang dùng.

## Tests

Unit tests kiểm tra URL helpers, environment/session crypto, API error normalization, Server Actions và hooks. Component tests dùng jsdom cho interaction/recovery. Playwright E2E chứng minh auth, accessibility, Journal autosave/conflict/resilience, Mood lifecycle và Memory lifecycle qua BFF thật. Backend E2E riêng của Memory kiểm tra ownership, stale revision và việc Memory sống tiếp khi Journal nguồn bị xóa.
