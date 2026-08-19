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

test("shows a sealed Journal entry on the Timeline and links back to it", async ({
  page,
}) => {
  const title = "Timeline browser flow " + Date.now();
  const content = "Một điều đáng nhớ được viết cho luồng E2E của Timeline.";

  await login(page);

  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]+$/);

  await page.getByLabel("Tiêu đề").fill(title);
  await page.getByLabel("Nội dung", { exact: true }).fill(content);
  await expect(page.getByText("Đã lưu · revision 2")).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Xem trước" }).click();
  await page.getByRole("button", { name: "Seal", exact: true }).click();
  await expect(page.getByLabel("Bản xem trước nội dung")).toBeVisible();

  const journalUrl = page.url();

  // Seal đi qua Outbox (bất đồng bộ) trước khi tới được Timeline — poll
  // bằng reload thay vì assert ngay, để không phụ thuộc tốc độ máy chạy CI.
  await page.goto("/timeline");
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole("link", { name: `Mở journal: ${title}` }),
    ).toBeVisible();
  }).toPass({ timeout: 10_000 });

  await page.getByRole("link", { name: `Mở journal: ${title}` }).click();
  await expect(page).toHaveURL(journalUrl);
});
