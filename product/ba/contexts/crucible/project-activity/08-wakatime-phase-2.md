# Crucible — Project Activity Evidence — Phase 2: WakaTime

> **Status:** Draft for review
> **Date:** 2026-10-21
> **Purpose:** Thêm **thời gian code** từ WakaTime làm nguồn bằng chứng thứ hai, bên cạnh GitHub. Tài liệu này là phần bổ sung trọn vẹn cho Phase 2: hành vi, kiến trúc, yêu cầu, use case, giao diện và API. Những gì không được nhắc ở đây giữ nguyên như `01`–`07`.

---

## 1. Related Documentation

- `01-ba-overview.md` — Phase 2 candidates (§9), DEC-PAC-002/008/010, OQ-PAC-001.
- `02-evidence-behavior-analysis.md` — Activity Event, Attribution, Divergence, Snapshot.
- `03-integration-architecture.md` — ba tầng, sync design, extension point §8.1.
- `04`–`07` — yêu cầu, use case, giao diện, API của Phase 1.

---

## 2. Spike Results (OQ-PAC-001)

Kiểm chứng ngày 2026-10-21 bằng API key thật của người dùng, chỉ đọc (script không in key, tên project hay tên file).

| Câu hỏi                      | Kết quả                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lịch sử đọc lùi được bao xa? | **Không giới hạn 7 ngày.** `durations` có dữ liệu ở mốc lùi 180 ngày; mốc 365 ngày trả 200 với 0 đoạn vì tài khoản tạo ngày 2026-03-02. `summaries` trả đủ khoảng 91 ngày.                   |
| Gói tài khoản                | API `users/current` không có trường `plan` → không biết chắc gói. Chỉ biết **thực tế** đọc được hết lịch sử.                                                                                 |
| Xác thực                     | `Authorization: Basic base64(apiKey)` dùng được.                                                                                                                                             |
| Hình dạng `durations?date=`  | Mỗi đoạn có `project` (tên), `time` (giây Unix, lúc bắt đầu), `duration` (giây), kèm nhiều trường AI. Response có `start`, `end`, `timezone` của ngày được hỏi. Mỗi request là **một ngày**. |
| Danh sách project            | `users/current/projects`: 20 project; mỗi project có `id`, `name`, `repository`, `first_heartbeat_at`, `last_heartbeat_at`.                                                                  |
| Múi giờ WakaTime             | `Asia/Ho_Chi_Minh` — trùng múi giờ tài khoản Magnum Opus, nhưng thiết kế không dựa vào sự trùng này (§4.3).                                                                                  |

**Hệ quả:** OQ-PAC-001 có câu trả lời **cho tài khoản này**: lịch sử đọc được đủ xa, không cần chép định kỳ để giữ lịch sử; WakaTime đi cùng trigger với GitHub (mở trang, khép Cycle, gắn nguồn — `03` §5.1).

Kết quả này **không** được suy rộng thành "WakaTime không giới hạn lịch sử": gói của tài khoản không đọc được qua API, và gói có thể đổi. Thiết kế không dựa vào nó (DEC-PAC-015, §5.3): ngày nào không đọc được thì không được đánh dấu là đã chép, và vẫn là `NO_DATA`.

---

## 3. Scope

### 3.1. In Scope

- Kết nối WakaTime ở cấp tài khoản bằng API key.
- Gắn một hoặc nhiều **WakaTime project** làm nguồn cho một Project Magnum Opus.
- Chép **thời gian code** (các đoạn `durations`) vào sổ hoạt động.
- Thời gian code tham gia vào: trạng thái ngày, dòng tóm tắt, hoạt động gần nhất, Divergence D1–D4 và snapshot.

### 3.2. Out of Scope

| Không làm                                                                   | Lý do                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Ngôn ngữ, editor, OS, máy, file, thư viện, nhánh, loại việc (coding/debug…) | Không trả lời "có đang theo đuổi Project này không"; WakaTime dashboard đã hiện đầy đủ |
| Mọi trường AI (token, chi phí, model, dòng AI/người viết)                   | Dễ thành điểm năng suất; dữ liệu riêng tư không cần cho mục đích này                   |
| Bộ lọc (khoảng ngày, ngôn ngữ…)                                             | Cycle **là** bộ lọc. Lọc thêm biến trang thành một dashboard WakaTime thứ hai          |
| Biểu đồ giờ theo ngày, so sánh giữa Cycle                                   | Như Phase 1: không so sánh, không chấm điểm (`01` §10)                                 |
| Ngôn ngữ chính của Cycle ("chủ yếu TypeScript")                             | Có thể cân nhắc sau (OQ-PAC-010); không thuộc Phase 2                                  |
| Heartbeat thô                                                               | Chứa tên file; `durations` đã đủ                                                       |

---

## 4. Behavior

### 4.1. Coding Session — Một Loại Event Mới

Phase 1 chỉ có event **tại một thời điểm** (commit, PR). Thời gian code là một **khoảng**:

| Type          | Thời điểm (`occurredAt`) | Số lượng (`quantity`) | Nguồn                |
| ------------- | ------------------------ | --------------------- | -------------------- |
| `CODING_TIME` | Lúc đoạn code bắt đầu    | Số giây của đoạn      | Một đoạn `durations` |

Sổ chỉ lưu tín hiệu: `{ feed, CODING_TIME, bắt đầu, số giây, khóa }`. Không lưu tên file, ngôn ngữ, editor hay bất kỳ trường AI nào.

Chỉ tính thời gian của **chính người dùng**: API key là của tài khoản người dùng, mọi đoạn trả về đều là của họ (DEC-PAC-007 tự thỏa).

### 4.2. Ledger: Thay Cả Ngày, Không Chỉ Thêm

Sổ Phase 1 chỉ thêm dòng (`02` §2.5): một commit đã viết thì không đổi. Đoạn code thì **còn đổi**: đoạn đang diễn ra dài thêm khi người dùng code tiếp, và WakaTime có thể gộp hai đoạn gần nhau thành một.

```text
14:40 chép: 14:30 · 10 phút
15:10 chép: 14:30 · 40 phút      ← cùng đoạn, đã dài thêm
```

Vì vậy với `CODING_TIME`, mỗi lần chép **thay toàn bộ đoạn của từng ngày WakaTime vừa đọc** (BR-PAC-038):

```text
Đọc ngày WakaTime D → nhận [start, end) của ngày D và danh sách đoạn
Cắt mỗi đoạn vào [start, end)            ← đoạn vắt qua ranh giới ngày thành hai dòng,
                                            mỗi ngày giữ phần của mình
Trong một transaction:
  xóa mọi CODING_TIME của feed có occurredAt ∈ [start, end)
  thêm các đoạn đã cắt
```

Vì mỗi dòng sổ nằm trọn trong đúng một ngày WakaTime, "xóa theo lúc bắt đầu" luôn xóa đủ: không còn dòng nào của ngày D nằm ở ngày khác, dù WakaTime có tự cắt đoạn tại nửa đêm hay không (TQ-WAK-03 không còn chặn thiết kế).

WakaTime là nguồn sự thật cho thời gian code của chính nó. Đây là ngoại lệ thứ hai cho nguyên tắc "chỉ thêm", cùng loại với nguồn nội bộ (`03` §8.2). Snapshot không bị ảnh hưởng: nó chụp **số liệu** lúc khép Cycle và không đọc lại sổ (DEC-PAC-006).

Khóa chống trùng của `CODING_TIME` là thời điểm bắt đầu (sau khi cắt); trong một ngày đã được thay trọn vẹn, nó chỉ để chặn trùng nếu WakaTime trả cùng một đoạn hai lần.

### 4.3. Day Windows Across Time Zones

`durations?date=` hỏi theo **ngày trong múi giờ WakaTime**, còn Magnum Opus tính ngày theo **múi giờ tài khoản**. Thiết kế không giả định hai múi giờ trùng nhau:

- Khoảng cần chép `[from, to)` là khoảng thời gian tuyệt đối.
- Adapter hỏi mọi ngày WakaTime chạm vào khoảng đó, dùng `start`/`end` mà response trả về làm ranh giới để cắt và thay (§4.2).
- Mỗi đoạn mang thời điểm tuyệt đối (`time`), nên Attribution chia ngày theo múi giờ tài khoản như mọi event khác.

### 4.4. Splitting a Session at Boundaries

Một đoạn có thể vắt qua một mốc. Khi tính, đoạn được **cắt tại mỗi mốc**, mỗi phần được gán độc lập (BR-PAC-039):

| Mốc                                               | Vì sao                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Nửa đêm theo múi giờ tài khoản                    | Giờ code của mỗi ngày đúng với ngày đó                                        |
| Mỗi lần chuyển trạng thái (Start, Pause, Resume…) | Phần trong/ngoài Cycle, phần ACTIVE/PAUSED được tính riêng                    |
| Lúc khép Cycle (snapshot)                         | Snapshot chỉ gồm phần trước lúc khép                                          |
| Lúc gắn nguồn, với Project `NOT_STARTED`          | D4 chỉ xét hoạt động sau lúc gắn (`04` BR-PAC-016) — phần trước mốc bị bỏ qua |

```text
Đoạn 13:50 → 14:20, Pause lúc 14:00

13:50 ───────── 14:00 ───────── 14:20
   10 phút ACTIVE  │  20 phút PAUSED
```

Sổ vẫn lưu đoạn nguyên vẹn; việc cắt chỉ diễn ra khi tính (Attribution không ghi gì).

### 4.5. Overlap Is Counted Once

Hai WakaTime project gắn cùng một Project có thể có đoạn trùng giờ (hai editor mở cùng lúc). Trong phạm vi **một Project**, thời gian code là **hợp** của các khoảng — phần trùng chỉ tính một lần (BR-PAC-040):

```text
Feed A: 09:00 ─────────── 10:00
Feed B:        09:30 ─────────── 10:30
Tính:   09:00 ──────────────────── 10:30   = 1 giờ 30 phút (không phải 2 giờ)
```

Một WakaTime project gắn vào **nhiều** Project thì mỗi Project đều tính đủ — như một repository dùng chung (`02` §6.9). Cảnh báo khi gắn như với repository (`06` §7.3).

### 4.6. Day State With Coding Time

Bảng trạng thái ngày (`02` §3.3) đổi điều kiện "có hoạt động" (BR-PAC-041):

> Một ngày **có hoạt động** khi có ít nhất một event GitHub, **hoặc** tổng thời gian code trong ngày (sau khi cắt và hợp) **từ 15 phút**.

| Trạng thái      | Điều kiện                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| `ACTIVE`        | Ngày có hoạt động, và có bằng chứng lúc `ACTIVE` (event GitHub nhãn `ACTIVE`, hoặc > 0 giây code lúc `ACTIVE`) |
| `PAUSED_ACTIVE` | Ngày có hoạt động, và mọi bằng chứng đều lúc `PAUSED`                                                          |
| `PAUSED_IDLE`   | Ngày nằm hoàn toàn trong khoảng PAUSED, không có hoạt động                                                     |
| `IDLE`          | Còn lại — kể cả ngày có code dưới 15 phút                                                                      |
| `NO_DATA`       | Như Phase 1 (`04` BR-PAC-020): không nguồn nào chép đầy đủ ngày đó                                             |

Ngưỡng 15 phút loại các lần mở editor thoáng qua. Đây là tham số hiệu chỉnh (OQ-PAC-002), không phải mục tiêu: giao diện không bao giờ nói "chưa đủ 15 phút".

### 4.7. Metrics

Thêm một metric vào `02` §3.4:

| Metric   | Định nghĩa                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------- |
| Giờ code | Tổng thời gian code của Cycle (hợp các khoảng, sau khi cắt tại mốc Cycle), tính cả lúc `PAUSED` |

- Giờ code được tính **từ lúc Cycle bắt đầu tới hiện tại** khi Cycle đang mở, và **tới lúc khép** trong snapshot. Không cần khép Cycle mới có số.
- "Hoạt động gần nhất" là thời điểm muộn nhất giữa event GitHub và **lúc kết thúc** của đoạn code (bắt đầu + số giây).
- Giờ code chỉ được đo khi Project có ít nhất một nguồn WakaTime. Không có nguồn WakaTime thì giờ code là **không đo** (`null`), khác với "đo được 0 giờ" — không bao giờ trình bày "0 giờ code" cho Project không dùng WakaTime (§7).

### 4.8. Divergence

| Divergence | Thay đổi                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1         | Không đổi định nghĩa; "ngày có hoạt động" giờ gồm cả ngày code ≥ 15 phút → D1 ít báo nhầm hơn với người code nhiều mà ít commit                     |
| D2         | Không đổi định nghĩa; ngày `PAUSED_ACTIVE` do code cũng được đếm                                                                                    |
| D3         | Thời gian code sau khi khép được tính khi tổng **từ 15 phút**. Câu chữ nêu giờ code cạnh số event (§7.4)                                            |
| D4         | Code lúc `NOT_STARTED` **sau lúc gắn nguồn** (`04` BR-PAC-016) từ 15 phút trở lên tính là "đã có hoạt động"; đoạn vắt qua lúc gắn chỉ tính phần sau |

### 4.9. Edge Cases

| Trường hợp                                           | Hành vi                                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Đổi tên project trên WakaTime                        | Nguồn lưu **id** project. Mỗi lần chép, adapter tra id → tên hiện tại rồi hỏi `durations` theo tên đó; tên hiển thị của nguồn được cập nhật |
| Project bị xóa trên WakaTime                         | Tra id không thấy → nguồn `ERROR` với `WAKATIME_PROJECT_NOT_FOUND`; sổ cũ vẫn dùng                                                          |
| Gắn nguồn giữa Cycle                                 | Chép bù về tới đầu Cycle đang mở (`03` §5.3) — lịch sử đọc được đủ xa                                                                       |
| Đoạn đang diễn ra lúc mở trang                       | Tính tới lúc chép; lần chép sau thay bằng độ dài mới (§4.2)                                                                                 |
| Đoạn vắt qua lúc khép Cycle                          | Chỉ phần trước lúc khép vào snapshot; phần sau thuộc "sau khi khép" (D3)                                                                    |
| WakaTime sửa lại một ngày cũ (gộp đoạn, xóa dữ liệu) | Ngày nằm trong khoảng đệm 2 ngày được thay ở lần chép sau; cũ hơn thì giữ như sổ đang có — Cycle đã khép không bị ảnh hưởng (snapshot)      |
| API key bị đổi hoặc thu hồi                          | Mọi nguồn WakaTime `DISCONNECTED` với `WAKATIME_KEY_INVALID`; sổ cũ vẫn dùng; nhắc cập nhật ở Cài đặt                                       |
| Kết nối lại bằng key của **tài khoản WakaTime khác** | Như GitHub (`04` BR-PAC-008): hỏi xác nhận; nguồn của tài khoản cũ `DISCONNECTED` với `WAKATIME_ACCOUNT_CHANGED`                            |
| Snapshot chụp trước Phase 2                          | Giờ code là `null` (không đo) — không hiện, không phải "0 giờ"                                                                              |

---

## 5. Integration Architecture

### 5.1. Module

Theo đúng `03` §8.1 — không đổi sổ, sync service, Attribution, Divergence logic ngoài phần đã nêu ở §4:

```text
integrations/
  github/        (Phase 1)
  wakatime/      ← mới
    domain/          WakaTimeConnection (externalAccountId = user id WakaTime)
    application/     connect / get / disconnect; ports: WakaTimeApiPort
    infrastructure/  WakaTimeHttpClient, WakaTimeActivityProvider implements ActivityProviderPort
    presentation/    /integrations/wakatime
```

- Enum thêm `WAKATIME` vào `IntegrationProvider`, `ActivityProvider`; thêm `CODING_TIME` vào `ActivityKind`.
- API key mã hóa AES-256-GCM như token GitHub (`03` §9). Không bao giờ log, trả về hay đưa vào lỗi.
- Kết nối không có ngày hết hạn (`expiresAt = null`).

### 5.2. Adapter

| `ActivityProviderPort`  | WakaTime                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveResource(id)`   | `GET /users/current/projects` → tìm theo `id`; trả tên hiện tại làm `displayName`                                                                                                                                                                                                                                                                                                                                                       |
| `fetchEvents(from, to)` | Tra id → tên hiện tại (như `resolveResource`) và múi giờ tài khoản (`users/current`), rồi với mỗi ngày WakaTime chạm `[from, to)`: `GET /users/current/durations?date=…` **không lọc theo project** (TQ-WAK-02). **Kiểm từng đoạn**: `project` phải đúng tên vừa tra, so chính xác cả hoa/thường; đoạn khác bị bỏ (BR-PAC-044). Khoảng thay của mỗi ngày là `[start, end)`, với `end` = giây cuối WakaTime trả về (`23:59:59`) + 1 giây |
| `connectedAccountId`    | `id` của `users/current`                                                                                                                                                                                                                                                                                                                                                                                                                |

Tên project là duy nhất trong một tài khoản WakaTime (kiểm chứng ở TQ-WAK-02), và tên được tra lại từ id ở **mỗi** lần chép. Vì vậy hai project WakaTime cùng gắn vào Magnum Opus không thể nhận thời gian của nhau: danh tính là id, tên chỉ dùng để nhận ra đoạn nào của project; bước kiểm từng đoạn chặn cả trường hợp project bị đổi tên đúng giữa lúc tra và lúc hỏi. Không dùng bộ lọc `&project=` của WakaTime: nó không phân biệt hoa/thường, và chặt đoạn theo từng file.

**Hợp đồng port phải đổi (PR 7c).** `ActivityProviderPort` hiện chỉ trả danh sách event (`03` §3); sync service không biết khoảng nào đã đọc trọn nên không thể thay theo ngày một cách an toàn. `FetchedActivity` thêm:

```typescript
export interface FetchedActivity {
  displayName: string;
  events: ActivityEventInput[];
  /** Chỉ provider "thay theo ngày" (WakaTime). Mỗi khoảng là một ngày nguồn đã đọc
   *  TRỌN; sync service xóa CODING_TIME của feed trong từng khoảng rồi ghi events
   *  thuộc khoảng đó. Khoảng không có ở đây thì không bị đụng tới. */
  replacedWindows?: { from: Date; to: Date }[];
}
```

GitHub không trả `replacedWindows` và giữ nguyên upsert. Sổ ghi theo hai chế độ:

| Kind                                        | Ghi sổ                                        |
| ------------------------------------------- | --------------------------------------------- |
| `COMMIT_AUTHORED`, `PR_OPENED`, `PR_MERGED` | Upsert theo khóa chống trùng (Phase 1)        |
| `CODING_TIME`                               | Thay theo ngày đã đọc trọn, trong transaction |

### 5.3. Sync Cost and Progress

> **Hoãn (PR 7c-3).** Bản đang chạy (7c-2) đọc mọi ngày cần chép, mới trước, tối đa 4 request cùng lúc; một ngày lỗi thì cả lần chép thất bại và sổ không đổi. Lần chép quá 10 giây vẫn chạy tiếp ở nền và ghi sổ khi xong, nên giới hạn thời gian không làm mất tiến độ. Phần "giữ phần liên tục đã đọc trọn" bên dưới chỉ được làm khi chép bù gặp `WAKATIME_RATE_LIMITED` lặp lại (§10).

Mỗi ngày là một request. Lần chép tăng dần chỉ cần 1–3 ngày (khoảng đệm 2 ngày + hôm nay). Lần chép bù một Cycle dài thì nhiều request:

- Đọc **từ ngày mới về ngày cũ**, song song có giới hạn (vd 4 request cùng lúc).
- `syncedUntil`/`coveredFrom` chỉ dời theo phần **liên tục** đã đọc trọn: hết giới hạn 10 giây (`03` §10, TQ-PAC-05) giữa chừng thì phần đã chép vẫn được giữ và mốc dời tới đó; lần mở trang sau chép tiếp phần còn lại.
- Ngày chưa chép là `NO_DATA`, không phải `IDLE` — như Phase 1.
- **Ngày nằm ngoài lịch sử mà WakaTime cho đọc** (gói giới hạn): nếu WakaTime báo bằng lỗi, chép bù dừng tại đó, `coveredFrom` không lùi qua ngày đó → `NO_DATA`. Nếu WakaTime trả `200` rỗng (không phân biệt được với ngày không code), dữ liệu không tự phát hiện được giới hạn — khi đó `historyWindowDays` phải được đặt theo gói. Cách WakaTime phản hồi được kiểm chứng ở TQ-WAK-04 **trước** PR 7c.

### 5.4. Technical Questions

| ID        | Câu hỏi                                                                                                                                 | Kiểm chứng khi                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| TQ-WAK-01 | Giới hạn request của WakaTime API (mỗi giây / mỗi ngày) và header báo giới hạn                                                          | Implement adapter                                                   |
| TQ-WAK-02 | Tham số `project` của `durations` khớp tên thế nào (có dấu cách, ký tự đặc biệt, phân biệt hoa thường?)                                 | Implement adapter                                                   |
| TQ-WAK-03 | Một đoạn có thể vắt qua `end` của ngày WakaTime không, hay WakaTime đã cắt sẵn? (ảnh hưởng ranh giới thay §4.2)                         | Implement adapter — không còn chặn thiết kế nhờ cắt lúc chép (§4.2) |
| TQ-WAK-04 | Ngày nằm ngoài lịch sử mà gói cho đọc: WakaTime trả lỗi gì, hay trả `200` rỗng? (quyết định có tự phát hiện được giới hạn không — §5.3) | Trước PR 7c, theo tài liệu WakaTime / tài khoản gói free            |

**Kết quả kiểm chứng (2026-10-24, tài khoản `Asia/Ho_Chi_Minh` tạo 2026-03-02, khoảng 45 request bằng script chỉ đọc):**

| ID        | Kết quả                                                                                                                                                                                                                                                                             | Quyết định                                                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TQ-WAK-01 | Không chạm giới hạn trong ~45 request liên tiếp; không đo được ngưỡng.                                                                                                                                                                                                              | Tối đa 4 request cùng lúc; `429` → `WAKATIME_RATE_LIMITED` kèm `Retry-After`. Còn mở cho tới khi gặp giới hạn thật.                                                                  |
| TQ-WAK-02 | 20 project, không tên nào trùng (kể cả khác hoa/thường). `&project=` **không phân biệt hoa/thường** (tên đổi hoa/thường vẫn trả cùng dữ liệu); có lọc thì đoạn bị chặt theo file (79 đoạn), không lọc thì gộp theo project (3 đoạn), cùng tổng giờ. Tên không tồn tại → `200` rỗng. | Gọi `durations` không lọc, tự giữ đoạn có `project` đúng tên (so chính xác).                                                                                                         |
| TQ-WAK-03 | 0/396 đoạn trong 30 ngày lọt ra ngoài ngày được hỏi. Mốc ngày WakaTime trả về là ngày theo múi giờ tài khoản WakaTime: `start` 00:00, `end` 23:59:59 (vd `2026-10-23T17:00:00Z` → `2026-10-24T16:59:59Z`).                                                                          | Khoảng thay = `[start, end + 1 giây)` lấy từ WakaTime, không tự tính. Vẫn cắt đoạn vào ngày lúc chép (rẻ, và 30 ngày chưa chắc có đoạn vắt qua nửa đêm).                             |
| TQ-WAK-04 | Ngày cách 365, 400, 730, 1500 ngày và ngày tương lai đều `200` rỗng. Lần spike trước đọc được ≥ 180 ngày, tức gần trọn lịch sử của tài khoản; giới hạn thật của gói không đo được.                                                                                                  | `historyWindowDays: null`. **Rủi ro còn lại:** tài khoản gói giới hạn sẽ thấy ngày quá giới hạn là "không code" thay vì `NO_DATA` — khi có người dùng như vậy thì cấu hình theo gói. |

---

## 6. Requirements & Business Rules

### 6.1. Functional Requirements

| ID         | Requirement                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| FR-PAC-015 | Kết nối WakaTime bằng API key: kiểm tra key với `users/current`, lưu mã hóa, hiện tên tài khoản.    |
| FR-PAC-016 | Xem kết nối WakaTime (tài khoản, trạng thái, lần kiểm tra gần nhất); thay key; ngắt kết nối.        |
| FR-PAC-017 | Liệt kê WakaTime project của tài khoản (tên, lần code gần nhất), tìm theo tên.                      |
| FR-PAC-018 | Gắn / gỡ WakaTime project làm nguồn của Project, cùng quy tắc với repository (`04` FR-PAC-005/006). |
| FR-PAC-019 | Chép thời gian code vào sổ theo §4.2, cùng trigger với GitHub.                                      |
| FR-PAC-020 | Hoạt động của Cycle đang mở, snapshot và Divergence tính cả thời gian code theo §4.4–4.8.           |

### 6.2. Business Rules

| ID         | Rule                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-PAC-037 | Một tài khoản Magnum Opus có tối đa một kết nối WakaTime. API key chỉ được dùng để đọc.                                                                                    |
| BR-PAC-038 | `CODING_TIME` được ghi bằng cách thay toàn bộ đoạn của một ngày WakaTime đã đọc trọn, trong một transaction. Ngày đọc dở không được thay.                                  |
| BR-PAC-039 | Khi tính, một đoạn được cắt tại nửa đêm (múi giờ tài khoản), tại mỗi lần chuyển trạng thái và tại lúc khép Cycle; mỗi phần được gán độc lập. Sổ không bị sửa bởi việc cắt. |
| BR-PAC-040 | Trong một Project, thời gian code là hợp các khoảng của mọi nguồn WakaTime — phần trùng tính một lần.                                                                      |
| BR-PAC-041 | Một ngày có hoạt động khi có ≥ 1 event GitHub hoặc ≥ 15 phút code (sau cắt và hợp). Ngưỡng 15 phút áp dụng cho D3, D4 như nhau.                                            |
| BR-PAC-042 | Giờ code là `null` (không đo) khi Project — hoặc snapshot — không có nguồn WakaTime, và chỉ được trình bày khi khác `null`. `0` nghĩa là đo được và không có code.         |
| BR-PAC-043 | Chỉ `project`, `time`, `duration` của một đoạn được dùng; mọi trường khác của WakaTime (AI, ngôn ngữ, editor, file…) không được lưu.                                       |
| BR-PAC-044 | Một đoạn chỉ được ghi vào feed khi `project` của nó đúng tên hiện tại của project mà feed trỏ tới (tra từ id ngay trong lần chép đó).                                      |

### 6.3. Decisions

| ID          | Decision                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEC-PAC-015 | Không chép định kỳ: tài khoản hiện tại đọc được đủ lịch sử (§2). Nhưng không giả định mọi tài khoản như vậy: ngày không đọc được giữ `NO_DATA`; nếu WakaTime không báo giới hạn bằng lỗi thì `historyWindowDays` đặt theo gói (TQ-WAK-04). |
| DEC-PAC-016 | Đọc `durations` theo từng ngày, không dùng `summaries`: cần thời điểm của từng đoạn để gán đúng trạng thái lúc code (§4.4).                                                                                                                |
| DEC-PAC-017 | Chỉ lấy thời gian code. Không bộ lọc, không ngôn ngữ/editor/AI (§3.2).                                                                                                                                                                     |
| DEC-PAC-018 | Nguồn WakaTime trỏ tới **id** project, không phải tên — đổi tên trên WakaTime không làm đứt liên kết.                                                                                                                                      |

---

## 7. Product Specification

### 7.1. Settings — Kết nối WakaTime

Card riêng, ngay dưới card GitHub, cùng bố cục (`06` §6):

| Trạng thái          | Hiển thị                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Chưa kết nối        | Ô nhập API key (kiểu mật khẩu) + hướng dẫn + **Kết nối**                                            |
| Đã kết nối          | "Đã kết nối với **{username}**" · "Kiểm tra lần cuối {thời điểm}" · **Thay key** · **Ngắt kết nối** |
| Key không dùng được | "API key không còn dùng được — dán key mới để tiếp tục." + ô nhập                                   |

Hướng dẫn:

```text
1. Mở wakatime.com/settings/api-key và sao chép API key (bắt đầu bằng "waka_").
2. Dán vào ô dưới đây. Key được mã hóa và không bao giờ hiện lại.
```

Không có ngày hết hạn nên không có trạng thái "sắp hết hạn".

### 7.2. Sheet Nguồn hoạt động

- Thêm nút **Gắn project WakaTime** cạnh **Gắn repository** (chỉ khi đã kết nối WakaTime; chưa kết nối thì có đường dẫn tới Cài đặt, như GitHub).
- Bộ chọn giống bộ chọn repository: tìm theo tên; mỗi dòng có tên project và "Code gần nhất {ngày}".
- Dòng nguồn: biểu tượng WakaTime · tên project · trạng thái như `06` §7.2.
- Cảnh báo khi project đã dùng ở Project khác: như repository.

### 7.3. Project Detail — Hoạt động của vòng này

**Dòng tóm tắt** (`06` §8.3) thêm giờ code ở cuối, chỉ khi có nguồn WakaTime:

```text
8 ngày có hoạt động · 23 commit · 4 PR mở · 3 PR merge · 12,5 giờ code
```

Chỉ có nguồn WakaTime (không có repository):

```text
8 ngày có hoạt động · 12,5 giờ code
```

**Dải ngày**: tooltip và mô tả cho trình đọc màn hình thêm giờ code của ngày khi > 0:

```text
20/10: có hoạt động · 2,9 giờ code
18/10: không có hoạt động · 10 phút code
```

**Hoạt động gần nhất** (`06` §8.4): thời điểm muộn nhất giữa commit/PR và lúc kết thúc đoạn code.

### 7.4. Divergence Copy

| ID         | Câu chữ                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D3         | Chỉ code: "2,5 giờ code kể từ khi hoàn thành (gần nhất 14/10)." · Có cả event: "4 commit · 2,5 giờ code kể từ khi dừng (gần nhất 14/10)." |
| D1, D2, D4 | Không đổi câu chữ                                                                                                                         |

### 7.5. Closed Cycle

Snapshot (`06` §10) hiện giờ code trong dòng tóm tắt khi snapshot có nguồn WakaTime; dòng nguồn liệt kê project WakaTime như repository.

### 7.6. Formatting

| Loại     | Định dạng                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Giờ code | ≥ 1 giờ: một chữ số thập phân, dấu phẩy — "12,5 giờ code". < 1 giờ: phút — "40 phút code".                                                                                      |
| Làm tròn | Làm tròn xuống tới phút trước khi định dạng (không bao giờ nói nhiều hơn thực tế)                                                                                               |
| < 1 phút | Có code nhưng chưa đủ một phút: "dưới 1 phút code" — không nói "0 phút"                                                                                                         |
| Chỉ code | Dòng tóm tắt bỏ commit/PR khi không có nguồn GitHub — nguồn đang gắn với vòng đang mở, nguồn lúc chụp với snapshot (§7.3). Số commit/PR > 0 thì luôn hiện, không giấu số đã đếm |

### 7.7. Source Error Copy

| Mã                           | Câu chữ                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `WAKATIME_KEY_INVALID`       | API key WakaTime không còn dùng được — cập nhật ở Cài đặt. |
| `WAKATIME_NOT_CONNECTED`     | WakaTime chưa được kết nối — kết nối ở Cài đặt.            |
| `WAKATIME_ACCOUNT_CHANGED`   | Project thuộc tài khoản WakaTime trước — gỡ và gắn lại.    |
| `WAKATIME_PROJECT_NOT_FOUND` | Không còn thấy project này trên WakaTime.                  |
| `WAKATIME_RATE_LIMITED`      | WakaTime đang giới hạn yêu cầu — sẽ thử lại sau.           |
| `WAKATIME_UNAVAILABLE`       | Không kết nối được WakaTime — sẽ thử lại sau.              |

---

## 8. Use Cases & Acceptance Criteria

### UC-PAC-009 — Connect WakaTime

- **Given** chưa kết nối WakaTime, **when** dán API key hợp lệ và chọn Kết nối, **then** card hiện "Đã kết nối với {username}" và key không bao giờ hiện lại.
- **Given** key sai, **then** hiện "API key không đúng — kiểm tra lại và dán đầy đủ." và không lưu gì.
- **Given** đã kết nối, **when** dán key của tài khoản WakaTime khác, **then** hỏi xác nhận; xác nhận xong, các nguồn của tài khoản cũ báo `WAKATIME_ACCOUNT_CHANGED`.

### UC-PAC-010 — Link a WakaTime Project

- **Given** đã kết nối, **when** chọn một project trong bộ chọn, **then** dòng nguồn xuất hiện và lần chép đầu bù về tới đầu Cycle đang mở.
- **Given** project đã dùng ở Project khác, **then** hiện cảnh báo trước khi gắn, như repository.

### UC-PAC-011 — See Coding Time in the Open Cycle

- **Given** Project có nguồn WakaTime, Cycle bắt đầu 19/10 10:00, có 5,2 giờ code từ đó, **then** dòng tóm tắt kết thúc bằng "5,2 giờ code".
- **Given** ngày 20/10 không có commit nhưng có 20 phút code lúc ACTIVE, **then** ô 20/10 là "có hoạt động".
- **Given** ngày 18/10 chỉ có 10 phút code, **then** ô 18/10 là "không có hoạt động" và tooltip ghi "10 phút code".
- **Given** đoạn 13:50–14:20 và Pause lúc 14:00, **then** 10 phút là ACTIVE, 20 phút là PAUSED.
- **Given** hai nguồn WakaTime có đoạn 09:00–10:00 và 09:30–10:30, **then** giờ code là 1 giờ 30 phút.
- **Given** Project không có nguồn WakaTime, **then** không có "giờ code" ở bất kỳ đâu.

### UC-PAC-012 — Snapshot With Coding Time

- **Given** Cycle khép lúc 18/10 17:00 với một đoạn 16:30–17:30, **then** snapshot tính 30 phút của đoạn đó; 30 phút sau lúc khép thuộc D3 nếu tổng sau khép ≥ 15 phút.
- **Given** snapshot đã chụp, **when** WakaTime sửa lại dữ liệu ngày cũ, **then** snapshot không đổi.

---

## 9. API Contract Changes

### 9.1. WakaTime Connection

| Method   | Path                              | Body / Query                        | Response                                 |
| -------- | --------------------------------- | ----------------------------------- | ---------------------------------------- |
| `PUT`    | `/integrations/wakatime`          | `{ apiKey, confirmAccountChange? }` | `200 WakaTimeConnectionResponse`         |
| `GET`    | `/integrations/wakatime`          | —                                   | `200 WakaTimeConnectionResponse` · `204` |
| `DELETE` | `/integrations/wakatime`          | —                                   | `204`                                    |
| `GET`    | `/integrations/wakatime/projects` | `?search=`                          | `200 WakaTimeProjectResponse[]`          |

```ts
interface WakaTimeConnectionResponse {
  account: { id: string; username: string };
  status: 'ACTIVE' | 'REVOKED';
  lastVerifiedAt: string;
}

interface WakaTimeProjectResponse {
  id: string;
  name: string;
  lastHeartbeatAt: string | null;
  usedByProjects: { id: string; title: string }[];
}
```

Lỗi: `WAKATIME_KEY_INVALID` (400), `WAKATIME_ACCOUNT_CHANGE_UNCONFIRMED` (409, kèm `currentAccount`/`newAccount`), `WAKATIME_UNAVAILABLE` (502, như `GITHUB_UNAVAILABLE`), `WAKATIME_RATE_LIMITED` (429).

### 9.2. Project Activity

- `POST /projects/:id/activity/sources` nhận thêm `provider: "GITHUB" | "WAKATIME"`; thiếu `provider` thì là `GITHUB` (tương thích client cũ).
- `ActivitySourceResponse.provider` có thêm `"WAKATIME"`; `error.code` có thêm các mã §7.7.
- `ActivityMetrics` thêm `codingSeconds: number | null` — `null` khi không có nguồn WakaTime (không đo), `0` khi đo được và không có code (BR-PAC-042).
- `ActivityDay` thêm `codingSeconds: number | null` (sau cắt và hợp, cả ACTIVE lẫn PAUSED); `null` theo cùng quy tắc.
- Divergence `ACTIVITY_AFTER_CLOSE` thêm `codingSeconds: number | null`.
- Snapshot: `metrics.codingSeconds` và `days[].codingSeconds` cùng kiểu; snapshot chụp trước Phase 2 trả `null` — dữ liệu JSON đã lưu không bị sửa, presenter điền `null` khi thiếu trường.

---

## 10. Delivery Plan

Theo cách Phase 1 (một PR mỗi phần, CI + review trước khi merge):

| PR   | Nội dung                                                                                                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7a   | Domain thuần: `CODING_TIME`, cắt đoạn tại mốc, hợp khoảng, ngưỡng ngày, metric `codingSeconds` — có test                                                                                                                             |
| 7b   | Migration enum + `integrations/wakatime`: kết nối (connect/get/disconnect), HTTP client                                                                                                                                              |
| 7c-1 | Đổi `FetchedActivity` (`replacedWindows`); sổ ghi "thay theo ngày" trong transaction                                                                                                                                                 |
| 7c-2 | Kiểm chứng TQ-WAK-01–04; `WakaTimeActivityProvider` (tra id → tên, kiểm từng đoạn, cắt theo ngày), đăng ký vào tầng activity; mã lỗi nguồn WakaTime                                                                                  |
| 7c-3 | **Hoãn.** Chép bù có tiến độ: giữ phần liên tục đã đọc trọn khi một ngày lỗi giữa chừng. Lần chép quá 10 giây vẫn chạy tiếp ở nền và ghi sổ khi xong, nên chỉ cần khi chép bù gặp `WAKATIME_RATE_LIMITED` lặp lại (TQ-WAK-01 còn mở) |
| 7d-1 | API: `GET /integrations/wakatime/projects`; gắn nguồn `WAKATIME` (id kiểm theo provider, lỗi gắn theo provider)                                                                                                                      |
| 7d-2 | API: `codingSeconds` trong response và snapshot                                                                                                                                                                                      |
| 7e   | Client: card WakaTime ở Cài đặt                                                                                                                                                                                                      |
| 7f   | Client: gắn project WakaTime ở trang chỉnh sửa                                                                                                                                                                                       |
| 7g   | Client: giờ code ở tóm tắt, tooltip, D3, snapshot                                                                                                                                                                                    |

---

## 11. Open Questions

| ID         | Question                                                                               |
| ---------- | -------------------------------------------------------------------------------------- |
| OQ-PAC-010 | Có hiện "ngôn ngữ chính của vòng" không? Để sau khi Phase 2 được dùng thật.            |
| OQ-PAC-002 | (Đã có) Ngưỡng 15 phút của ngày code là tham số hiệu chỉnh cùng các ngưỡng Divergence. |
