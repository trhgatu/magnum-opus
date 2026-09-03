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

const createDailyHabit = async (
  page: import("@playwright/test").Page,
  title: string,
) => {
  await page.goto("/habits/new");
  await page.getByLabel("Tên thói quen").fill(title);
  await page.getByRole("button", { name: "Tạo thói quen" }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
};

test("completes the private Routine lifecycle through the BFF", async ({
  page,
}) => {
  const timestamp = Date.now();
  const firstHabit = `Prepare water ${timestamp}`;
  const secondHabit = `Open journal ${timestamp}`;
  const title = `Morning sequence ${timestamp}`;
  const updatedTitle = `Morning sequence refined ${timestamp}`;
  const browserRequests: string[] = [];
  page.on("request", (request) => browserRequests.push(request.url()));

  await login(page);
  await createDailyHabit(page, firstHabit);
  await createDailyHabit(page, secondHabit);

  await page.goto("/routines");
  await expect(
    page.getByRole("heading", { name: "Nếp sinh hoạt", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Tạo Nếp sinh hoạt" }).click();
  await page.getByLabel("Tên Nếp sinh hoạt").fill(title);
  await page.getByRole("button", { name: "Tạo Nếp sinh hoạt" }).click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(`Đã tạo "${title}"`)).toBeVisible();

  await page.getByRole("combobox").click();
  await page
    .getByRole("textbox", { name: "Tìm Thói quen theo tên" })
    .fill(firstHabit);
  await page.getByRole("option", { name: firstHabit }).click();
  await page.getByRole("button", { name: "Thêm vào Nếp sinh hoạt" }).click();
  await expect(page.getByText(firstHabit, { exact: true })).toBeVisible();

  await page.getByRole("combobox").click();
  await page
    .getByRole("textbox", { name: "Tìm Thói quen theo tên" })
    .fill(secondHabit);
  await page.getByRole("option", { name: secondHabit }).click();
  await page.getByRole("button", { name: "Thêm vào Nếp sinh hoạt" }).click();
  await expect(page.getByText(secondHabit, { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: `Di chuyển ${secondHabit} lên` })
    .click();
  const orderedHabits = page.locator("ol > li");
  await expect(orderedHabits.nth(0)).toContainText(secondHabit);
  await expect(orderedHabits.nth(1)).toContainText(firstHabit);

  await page
    .getByRole("button", { name: `Gỡ ${firstHabit} khỏi Nếp sinh hoạt` })
    .click();
  await expect(page.getByText(firstHabit, { exact: true })).not.toBeVisible();

  await page.getByRole("link", { name: "Chỉnh sửa" }).click();
  await page.getByLabel("Tên Nếp sinh hoạt").fill(updatedTitle);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByText(`Đã cập nhật "${updatedTitle}"`)).toBeVisible();

  // Lưu trữ không rời trang — ở lại đúng Nếp sinh hoạt, chỉ đổi nút thành
  // "Khôi phục" (giống hệt cách Journal/Memory/Habit xử lý tại chỗ).
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByRole("button", { name: "Lưu trữ" })).toBeVisible();

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});
