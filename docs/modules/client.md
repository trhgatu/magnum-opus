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
│  └─ journal/            Journal list/editor
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

## Account feature

`features/account/api/current-user.ts` đọc `/users/me` phía server. `account-shell.tsx` chỉ nhận public current-user contract; không nhận access token hay class instance.

## Journal feature

### List page

Server Component đọc `searchParams`, chuẩn hóa URL filter rồi gọi `getJournalEntries`. Search/filter/pagination được biểu diễn trong URL để reload, back/forward và chia sẻ link vẫn đúng.

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

## Mood feature

`app/(protected)/journal/[id]/page.tsx` bắt đầu `getJournalEntry(id)` và `getMood(id)` cùng lúc bằng `Promise.all`, tránh waterfall.

`features/mood/api/mood.ts` là server-only read adapter. `actions/mood.ts` validate lại toàn bộ input vì TypeScript type không bảo vệ runtime Server Action. `mood-panel.tsx` giữ draft UI và dùng `useTransition` cho mutation.

Mood panel được lazy-load từ Journal editor. Initial bundle của `/journal/[id]` nhờ đó còn khoảng 615.9 KiB thay vì sát trần 625 KiB. Lazy loading không thay business flow; skeleton có role/status để assistive technology hiểu trạng thái.

Conflict không tự retry PUT vì retry cùng revision chắc chắn tiếp tục conflict, còn retry không revision có thể ghi đè dữ liệu mới. UI đưa nút tải snapshot mới nhất.

## Components

`components/ui` là primitives theo phong cách shadcn: Button, Card, Alert, Dialog, Input… Chúng không biết Journal hay Mood. `components/system` là composition có ý nghĩa toàn application như BrandMark, PageHeading, EmptyState.

Feature component được phép import UI primitive; UI primitive không được import feature. Direction này giữ design system tái sử dụng được.

## State nên đặt ở đâu?

| State                    | Vị trí                                       |
| ------------------------ | -------------------------------------------- |
| Dữ liệu đọc ban đầu      | Server Component/API function.               |
| Session/token            | Encrypted HttpOnly cookie phía Next server.  |
| Form interaction ngắn    | Local component state/useActionState.        |
| Journal draft + autosave | Feature hook `useJournalDraft`.              |
| Filter có thể bookmark   | URL search params.                           |
| Data backend dài hạn     | NestJS + database, không phải browser store. |

Client hiện không cần Zustand global store hoặc TanStack Query. Chỉ thêm khi có use case mà RSC/URL/local state không giải quyết tốt, không thêm vì admin đang dùng.

## Tests

Unit tests kiểm tra URL helpers, environment/session crypto, API error normalization, Server Actions và hooks. Component tests dùng jsdom cho interaction/recovery. Playwright E2E chứng minh auth, accessibility, Journal autosave/conflict/resilience và Mood lifecycle qua BFF thật.
