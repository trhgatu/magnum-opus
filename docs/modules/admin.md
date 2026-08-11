# 05 — Admin React SPA

Admin là Vite React SPA cho người vận hành. Nó gọi NestJS API trực tiếp, dùng TanStack Query cho server state, Zustand cho auth state, React Router cho navigation và Socket.IO cho realtime.

## Bootstrap tree

`main.tsx` chỉ import global CSS/i18n và mount `<App />` trong StrictMode. `App.tsx` ghép providers theo thứ tự:

```text
ApplicationErrorBoundary
└─ ThemeProvider
   └─ QueryClientProvider
      └─ RealtimeProvider
         ├─ RouterProvider
         └─ Toaster
```

Error boundary ở ngoài để bắt cả lỗi provider. Query client phải có trước realtime vì socket handlers cập nhật/invalidate cache. Router ở trong auth/realtime environment để route components dùng được cả hai.

Khi App mount, auth store khôi phục phiên. Trong lúc đó UI render explicit loading state thay vì chớp login/dashboard. Global events `auth:logout` và `auth:token-refreshed` nối API client với store mà không tạo circular import.

## Auth store và API client

Zustand store giữ access token và current principal trong memory. Refresh cookie do API đặt HttpOnly. Reload trang mất access token trong memory; `initialize()` dùng refresh endpoint để khôi phục.

`lib/api-client.ts` tập trung base URL, headers, credentials, refresh single-flight, retry một lần và normalized error. Feature API files không tự viết refresh logic.

Luồng 401:

```text
feature request nhận 401
→ nếu chưa phải refresh request, vào shared refresh promise
→ POST /auth/refresh với HttpOnly cookie
→ cập nhật in-memory access token
→ phát auth:token-refreshed
→ retry original request một lần
→ nếu refresh thất bại: auth:logout
```

Single-flight ngăn 10 query đồng thời tạo 10 refresh request. Retry bị giới hạn một lần để không loop vô hạn.

`auth-cache-boundary.ts` dọn TanStack Query cache khi identity đổi. Nếu user A logout và user B login trên cùng tab, cache của A không được hiện thoáng qua cho B.

## Routing và permissions

`route-manifest.ts` là nguồn metadata cho path, label và permission. Router config dùng lazy page imports để chia bundle theo feature. Sidebar cũng đọc manifest thay vì duy trì danh sách thứ hai.

`ProtectedRoute` phân biệt ba trạng thái: chưa auth → login; đã auth nhưng thiếu permission → forbidden; đủ quyền → render outlet. `usePermission` kiểm tra effective permission từ current principal.

Frontend permission chỉ điều khiển UX. Backend `PermissionsGuard` vẫn là enforcement thật.

## TanStack Query convention

Mỗi feature thường có:

```text
features/users/
├─ api/user.api.ts       HTTP functions
├─ api/user.keys.ts      query key factory
├─ hooks/useUsers.ts     queries + mutations + cache policy
├─ components/           feature UI
├─ pages.ts              lazy route entry
└─ utils/                pure helpers
```

Query keys là hierarchy, ví dụ root → lists → list(filters) → detail(id). Mutation thành công invalidate đúng nhánh thay vì `queryClient.clear()` toàn cục. Optimistic update chỉ dùng khi rollback rõ ràng; destructive/permission mutation thường đợi server xác nhận.

## Feature catalog

### Dashboard

`dashboard.api.ts` gọi stats/health endpoints. `useDashboardStats` và `useSystemHealth` đặt refresh/cache policy. Overview và charts chỉ nhận presentation data. Dashboard không tự query users/roles ở component.

### Users

Users gồm list/search/pagination, create, edit, activate/deactivate/delete và avatar upload. Validation thuần nằm trong `user-form.validation.ts`, dùng được trong test mà không render component.

`useUsers` là orchestration boundary cho query/mutations. `UserTable`/`UsersDataTable` render data; `EditUserModal` giữ form lifecycle; `AvatarUpload` chỉ xử lý upload interaction. `avatar-url.ts` chuẩn hóa relative upload path theo configured API origin.

### Roles

Roles đọc role list và permission catalog, tạo role, thay permission set, xóa role. Form validation không cho duplicate/blank role semantics. UI permission matrix là representation; backend transaction mới là source of truth.

### Sessions

Sessions hiển thị active refresh sessions và cho revoke one/revoke others. Current session cần được đánh dấu để tránh UX tự cắt phiên đang dùng nếu không chủ ý.

### Audit

Audit list có filter/search/pagination và detail timeline. `audit-log.presentation.ts` biến raw action/resource/status thành label dễ đọc; API contract vẫn giữ raw values ổn định.

### Notifications

`notification.api.ts` đọc list, mark one/all. `useNotifications` quản lý query và mutation cache. Notification bell là shell consumer. Realtime event cập nhật cache nhưng reload vẫn lấy dữ liệu thật từ API.

### Auth

LoginForm gọi auth store/action và dùng safe redirect utility để không cho open redirect. ForbiddenPage là authorization state, khác 404 và khác unauthenticated.

## Realtime

`realtime-client.ts` tạo Socket.IO client với token hiện tại và lifecycle reconnect có kiểm soát. `RealtimeProvider` bind/unbind listeners. `realtime-event-handlers.ts` chuyển event contract thành cache operations.

Không đặt business decision trong socket callback. Socket chỉ thông báo “dữ liệu nào có thể đã đổi”; query layer quyết định fetch/update.

## Shared UI trong admin

`components/ui` là primitives. `components/` cấp app gồm TablePagination, SearchInput, SingleSelect, ConfirmDialog, QueryErrorState, PageHeader… Feature dùng lại chúng nhưng không nhét domain-specific API vào đây.

`app/shell` sở hữu layout/sidebar/nav-user/notification bell vì đây là application shell, không thuộc feature users hay notifications riêng lẻ.

## Error và observability

`error-handler.ts` chuyển API error thành translated user message. i18n có `errors.json` và `exceptions.json` cho English/Vietnamese. Unknown backend detail không được show thẳng.

`observability.ts` gửi structured diagnostic với correlation ID; sensitive headers/cookies/token phải được redact. `ApplicationErrorBoundary` là last resort cho render crash; query error nên dùng `QueryErrorState` gần feature để retry được.

## Test strategy

Pure validation/key/presentation tests chạy nhanh. Hook tests dựng QueryClient riêng để không rò cache giữa case. Component tests kiểm tra accessibility role và mutation state. Route-manifest tests đảm bảo sidebar/route permission không lệch. Playwright E2E kiểm chứng login và protected navigation qua API thật.
