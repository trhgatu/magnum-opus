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

test("completes the private Habit lifecycle through the BFF", async ({
  page,
}) => {
  const timestamp = Date.now();
  const title = `Habit browser flow ${timestamp}`;
  const updatedTitle = `Habit browser flow updated ${timestamp}`;
  const browserRequests: string[] = [];
  page.on("request", (request) => browserRequests.push(request.url()));

  await login(page);
  await page.goto("/habits");
  await expect(
    page.getByRole("heading", { name: "Thói quen", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Tạo thói quen" }).click();
  await page.getByLabel("Tên thói quen").fill(title);
  await page
    .getByLabel("Ý nghĩa")
    .fill("Một hành động nhỏ để lặp lại có chủ ý.");
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Theo ngày trong tuần" }).click();
  await page.getByRole("button", { name: "T2" }).click();
  await page.getByRole("button", { name: "T4" }).click();
  await page.getByRole("button", { name: "T6" }).click();
  await page.getByRole("button", { name: "Tạo thói quen" }).click();

  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("T2 · T4 · T6")).toBeVisible();
  await expect(page.getByText(`Đã tạo "${title}"`)).toBeVisible();

  await page.getByRole("button", { name: "Hoàn thành hôm nay" }).click();
  await expect(
    page.getByRole("button", { name: "Hoàn tác hôm nay" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác hôm nay" }).click();
  await expect(
    page.getByRole("button", { name: "Hoàn thành hôm nay" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Chỉnh sửa" }).click();
  await page.getByLabel("Tên thói quen").fill(updatedTitle);
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByText(`Đã cập nhật "${updatedTitle}"`)).toBeVisible();

  // Lưu trữ không rời trang — ở lại đúng thói quen, chỉ đổi nút thành
  // "Khôi phục" (giống hệt cách Journal/Memory xử lý trash tại chỗ).
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.getByRole("button", { name: "Khôi phục" })).toBeVisible();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByRole("button", { name: "Lưu trữ" })).toBeVisible();

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});
