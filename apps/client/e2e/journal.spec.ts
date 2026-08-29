import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

const login = async (page: import("@playwright/test").Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/me$/);
};

test("completes the private Journal lifecycle through the BFF", async ({
  page,
}) => {
  const title = "Journal browser flow " + Date.now();
  const content = "## Khoảnh khắc\n\nMột điều được giữ lại từ browser E2E.";
  const browserRequests: string[] = [];
  page.on("request", (request) => browserRequests.push(request.url()));

  await login(page);
  // Đi thẳng bằng URL thay vì bấm link nav: link "Journal" nằm trong nhóm
  // "Phản chiếu" (context-navigation.tsx dùng <details>), chỉ tự mở khi
  // pathname hiện tại đã thuộc nhóm đó — ở /me nó đang đóng.
  await page.goto("/journal");
  await expect(
    page.getByRole("heading", { name: "Nhật ký", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]+$/);

  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel("Nội dung", { exact: true }).fill(content);
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  await page.reload();
  await expect(page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    content,
  );

  await page.getByRole("button", { name: "Thêm mood" }).click();
  await page.getByRole("button", { name: "Bình yên" }).click();
  await page.getByRole("button", { name: "Cường độ 3" }).click();
  await page
    .getByLabel("Ghi chú ngắn")
    .fill("Bình yên sau khi cơn mưa đi qua.");
  await page.getByRole("button", { name: "Lưu tâm trạng" }).click();
  await expect(page.getByText("Cường độ 3/5")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("Bình yên sau khi cơn mưa đi qua."),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("Bình yên sau khi cơn mưa đi qua."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thay đổi" }).click();
  await page.getByRole("button", { name: "Hy vọng" }).click();
  await page.getByRole("button", { name: "Cường độ 4" }).click();
  await page.getByRole("button", { name: "Lưu tâm trạng" }).click();
  await expect(page.getByText("Cường độ 4/5")).toBeVisible();

  await page.getByRole("button", { name: "Xem trước" }).click();
  await expect(
    page.getByRole("heading", { name: "Khoảnh khắc" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Viết", exact: true }).click();

  await page.getByRole("button", { name: "Niêm phong", exact: true }).click();
  await expect(page.getByLabel("Bản xem trước nội dung")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thay đổi" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Mở lại", exact: true }).click();
  await expect(page.getByLabel("Nội dung", { exact: true })).toBeEditable();

  await page.getByRole("button", { name: "Thay đổi" }).click();
  await page.getByRole("button", { name: "Loại bỏ tâm trạng" }).click();
  await page.getByRole("button", { name: "Loại bỏ", exact: true }).click();
  await expect(
    page.getByText("Entry này chưa lưu lại trạng thái cảm xúc."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thêm tâm trạng" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByText("Entry này chưa lưu lại trạng thái cảm xúc."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thêm tâm trạng" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Đưa vào Thùng rác" }).click();
  await expect(page).toHaveURL(/\/journal\?state=TRASHED$/);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await page.getByRole("button", { name: "Nhật ký", exact: true }).click();

  await page.getByLabel("Tìm trong nhật ký").fill(title);
  await page.getByRole("button", { name: "Tìm", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});

test("supports Journal search, reset and state filters", async ({ page }) => {
  const missingEntry = `missing-entry-${Date.now()}`;

  await login(page);
  await page.goto("/journal");

  // JournalSearch dùng next/form (submit thật), không còn debounce tự tìm
  // khi gõ — phải submit rõ ràng thì URL mới đổi.
  await page.getByLabel("Tìm trong nhật ký").fill(missingEntry);
  await page.getByRole("button", { name: "Tìm" }).click();
  await expect(page).toHaveURL(new RegExp(`search=${missingEntry}`));
  await expect(
    page.getByRole("heading", { name: "Chưa có entry phù hợp" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xóa tìm kiếm và bộ lọc" }),
  ).toBeVisible();

  // "Xóa từ khóa tìm kiếm" là <Link> (role link), không phải button.
  await page.getByRole("link", { name: "Xóa từ khóa tìm kiếm" }).click();
  await expect(page).toHaveURL(/\/journal$/);

  await page.getByRole("link", { name: "Thùng rác", exact: true }).click();
  await expect(page).toHaveURL(/\/journal\?state=TRASHED$/);
  await expect(
    page.getByRole("link", { name: "Thùng rác", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("recovers an explicit concurrent-edit conflict without losing local work", async ({
  page,
  context,
}) => {
  const title = `Concurrent reflection ${Date.now()}`;
  const remoteContent = "Nội dung được lưu từ cửa sổ thứ hai.";
  const localContent = "Nội dung được giữ lại từ cửa sổ đầu tiên.";

  await login(page);
  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await page.getByLabel("Tiêu đề").fill(title);
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.getByLabel("Nội dung", { exact: true }).fill(remoteContent);
  await expect(secondPage.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByLabel("Nội dung", { exact: true }).fill(localContent);
  await expect(
    page.getByRole("heading", { name: "Entry đã được thay đổi ở nơi khác" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    localContent,
  );

  await page.getByRole("button", { name: "Ghi nội dung đang gõ" }).click();
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.reload();
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    localContent,
  );

  await secondPage.close();
});

test("guards unsaved navigation and supports editor shortcuts", async ({
  page,
}) => {
  await login(page);
  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();

  await page
    .getByLabel("Nội dung", { exact: true })
    .fill("Một thay đổi chưa kịp autosave.");
  await expect(page.getByRole("button", { name: "Lưu ngay" })).toBeEnabled();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Nội dung chưa được lưu");
    await dialog.dismiss();
  });
  // Link "Hồ sơ cá nhân" nằm trong account menu, phải mở dropdown trước
  // (cùng pattern đã dùng ở auth.spec.ts).
  await page.getByLabel(/^Mở menu tài khoản của /).click();
  await page.getByRole("link", { name: "Hồ sơ" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]+$/);

  await page.keyboard.press("Control+s");
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.keyboard.press("Control+Shift+p");
  await expect(page.getByLabel("Bản xem trước nội dung")).toBeVisible();
  await page.keyboard.press("Control+Shift+f");
  await expect(page.locator("article")).toHaveClass(/fixed/);
  await page.keyboard.press("Escape");
  await expect(page.locator("article")).not.toHaveClass(/fixed/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Nhật ký" })).toBeVisible();
  await expect(page.getByLabel("Tiêu đề")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("keeps the draft when the browser cannot reach the Server Action", async ({
  page,
}) => {
  const localContent = "Nội dung được giữ trong lúc mất kết nối.";

  await login(page);
  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();

  await page.route("**/journal/**", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.abort("internetdisconnected");
      return;
    }
    await route.continue();
  });

  await page.getByLabel("Nội dung", { exact: true }).fill(localContent);
  await expect(page.getByText(/kiểm tra kết nối rồi thử lại/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    localContent,
  );

  await page.unroute("**/journal/**");
  await page.getByRole("button", { name: "Thử lưu lại" }).click();
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
});

test("preserves local work when another tab moves the entry to Trash", async ({
  page,
  context,
}) => {
  const title = `Remote trash ${Date.now()}`;
  const localContent = "Phần đang gõ chưa được phép biến mất.";

  await login(page);
  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await page.getByLabel("Tiêu đề").fill(title);
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.getByRole("button", { name: "Đưa vào Thùng rác" }).click();
  await expect(secondPage).toHaveURL(/\/journal\?state=TRASHED$/);

  await page.getByLabel("Nội dung", { exact: true }).fill(localContent);
  await expect(
    page.getByRole("heading", { name: "Entry đã được thay đổi ở nơi khác" }),
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Ghi nội dung đang gõ" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Entry đã đổi trạng thái ở nơi khác",
    }),
  ).toBeVisible();
  await expect(page.getByText(localContent)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sao chép nội dung" }),
  ).toBeVisible();

  await secondPage.close();
});

test("preserves local work when another tab permanently deletes the entry", async ({
  page,
  context,
}) => {
  const title = `Remote delete ${Date.now()}`;
  const localContent = "Bản local sau khi entry đã bị xóa.";

  await login(page);
  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await page.getByLabel("Tiêu đề").fill(title);
  await expect(page.getByText("Đã lưu", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  const secondPage = await context.newPage();
  await secondPage.goto(page.url());
  await secondPage.getByRole("button", { name: "Đưa vào Thùng rác" }).click();
  await secondPage.getByRole("link", { name: new RegExp(title) }).click();
  await secondPage.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await secondPage
    .getByRole("button", { name: "Xóa vĩnh viễn" })
    .last()
    .click();
  await expect(secondPage).toHaveURL(/\/journal\?state=TRASHED$/);

  await page.getByLabel("Nội dung", { exact: true }).fill(localContent);
  await expect(
    page.getByRole("heading", {
      name: "Entry không còn tồn tại trên server",
    }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    localContent,
  );
  await expect(
    page.getByRole("button", { name: "Sao chép nội dung" }),
  ).toBeVisible();

  await secondPage.close();
});
