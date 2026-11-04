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

  // Ghi dấu rồi hoàn tác ngay trên trang chi tiết.
  const checkIn = page.getByRole("button", { name: "Ghi dấu hôm nay" });
  await checkIn.click();
  await expect(checkIn).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^Đã ghi dấu lúc \d{2}:\d{2}\.$/)).toBeVisible();
  await checkIn.click();
  await expect(checkIn).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", { name: "Dấu vết 13 tuần" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  const editSheet = page.getByRole("dialog", { name: "Chỉnh sửa thói quen" });
  await editSheet.getByLabel("Tên thói quen").fill(updatedTitle);
  await editSheet.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
  await expect(page.getByText(`Đã cập nhật "${updatedTitle}"`)).toBeVisible();

  // Lưu trữ không rời trang — ở lại đúng thói quen, chỉ đổi nút thành
  // "Khôi phục" (giống hệt cách Journal/Memory xử lý trash tại chỗ).
  await page.getByRole("button", { name: "Lưu trữ" }).click();
  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.getByRole("button", { name: "Khôi phục" })).toBeVisible();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByRole("button", { name: "Lưu trữ" })).toBeVisible();

  // Ghi dấu ngay trên danh sách: dòng chuyển sang nhóm đã ghi dấu.
  // Lịch T2 · T4 · T6: hôm nay có thể là ngày nghỉ, nhóm đó gập sẵn.
  await page.goto("/habits");
  const restFold = page.getByText("Không có lịch hôm nay", { exact: true });
  if (await restFold.count()) await restFold.click();
  await page.getByRole("button", { name: `Ghi dấu ${updatedTitle}` }).click();
  // Dòng chuyển vào nhóm đã ghi dấu (gập sẵn): mở ra để xem.
  await page.getByText("Đã ghi dấu hôm nay", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Ghi dấu ${updatedTitle}` }),
  ).toHaveAttribute("aria-pressed", "true");

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});

test("completes the private QUIT-type Habit lifecycle through the BFF", async ({
  page,
}) => {
  const timestamp = Date.now();
  const title = `Quit browser flow ${timestamp}`;

  await login(page);
  await page.goto("/habits/new");

  await page.getByRole("radio", { name: "Từ bỏ điều xấu" }).click();
  await page.getByLabel("Tên thói quen").fill(title);
  await page.getByRole("button", { name: "Tạo thói quen" }).click();

  await expect(page).toHaveURL(/\/habits\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText(`Đã tạo "${title}"`)).toBeVisible();

  // Không có nhịp check-in hằng ngày cho QUIT-type.
  await expect(
    page.getByRole("button", { name: "Ghi dấu hôm nay" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("ngày không tái phạm", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tôi đã tái phạm" }).click();
  await page.getByRole("button", { name: "Xác nhận tái phạm" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("ngày không tái phạm", { exact: true }),
  ).toBeVisible();

  // Danh sách xếp thói quen QUIT vừa tạo vào nhóm Từ bỏ.
  // Thói quen Từ bỏ nằm ở tab riêng.
  await page.goto("/habits");
  await page.getByRole("link", { name: /^Từ bỏ/ }).click();
  await expect(page).toHaveURL(/\/habits\?type=QUIT$/);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
