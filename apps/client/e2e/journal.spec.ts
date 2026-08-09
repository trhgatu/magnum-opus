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
  await page.getByRole("link", { name: "Journal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Journal", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]+$/);

  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel("Nội dung", { exact: true }).fill(content);
  await expect(page.getByText("Đã lưu · revision 2")).toBeVisible({
    timeout: 10_000,
  });

  await page.reload();
  await expect(page.getByLabel("Tiêu đề")).toHaveValue(title);
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    content,
  );

  await page.getByRole("button", { name: "Xem trước" }).click();
  await expect(
    page.getByRole("heading", { name: "Khoảnh khắc" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Viết", exact: true }).click();

  await page.getByRole("button", { name: "Seal", exact: true }).click();
  await expect(page.getByLabel("Bản xem trước nội dung")).toBeVisible();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await expect(page.getByLabel("Nội dung", { exact: true })).toBeEditable();

  await page.getByRole("button", { name: "Đưa vào Trash" }).click();
  await expect(page).toHaveURL(/\/journal\?state=TRASHED$/);
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await page.getByRole("button", { name: "Journal", exact: true }).click();

  await page.getByLabel("Tìm trong journal").fill(title);
  await page.getByRole("button", { name: "Tìm", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});
