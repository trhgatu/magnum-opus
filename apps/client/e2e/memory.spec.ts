import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

const login = async (page: import("@playwright/test").Page) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(ADMIN_EMAIL);

  await page
    .getByLabel("Mật khẩu", {
      exact: true,
    })
    .fill(ADMIN_PASSWORD);

  await page
    .getByRole("button", {
      name: "Đăng nhập",
    })
    .click();

  await expect(page).toHaveURL(/\/me$/);
};

test("completes the private Memory lifecycle through the BFF", async ({
  page,
}) => {
  const timestamp = Date.now();

  const originalTitle = `Memory browser flow ${timestamp}`;
  const updatedTitle = `Memory browser flow updated ${timestamp}`;

  const originalContent = "Ánh nắng cuối ngày nằm yên trên khung cửa sổ.";

  const updatedContent =
    "Ánh nắng cuối ngày nằm yên trên khung cửa sổ, cùng tiếng mưa rất xa.";

  const browserRequests: string[] = [];

  page.on("request", (request) => {
    browserRequests.push(request.url());
  });

  await login(page);

  await page.goto("/memories");

  await expect(
    page.getByRole("heading", {
      name: "Ký ức",
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole("link", {
      name: "Lưu một ký ức",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/new$/);

  await page.getByLabel("Tiêu đề").fill(originalTitle);

  await page
    .getByLabel("Nội dung", {
      exact: true,
    })
    .fill(originalContent);

  await page.getByLabel("Độ chính xác của thời gian").selectOption("MONTH");

  await page
    .getByLabel("Thời điểm xảy ra", {
      exact: true,
    })
    .fill("2024-08");

  await page
    .getByRole("button", {
      name: "Lưu ký ức",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  await expect(
    page.getByRole("heading", {
      name: originalTitle,
    }),
  ).toBeVisible();

  await expect(page.getByText(originalContent)).toBeVisible();
  await expect(page.getByText("Tháng 8, 2024")).toBeVisible();
  await expect(page.getByText("Revision 1")).toBeVisible();

  await page
    .getByRole("link", {
      name: "Chỉnh sửa",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+\/edit$/);

  await page.getByLabel("Tiêu đề").fill(updatedTitle);

  await page
    .getByLabel("Nội dung", {
      exact: true,
    })
    .fill(updatedContent);

  await page
    .getByRole("button", {
      name: "Lưu thay đổi",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  await expect(
    page.getByRole("heading", {
      name: updatedTitle,
    }),
  ).toBeVisible();

  await expect(page.getByText(updatedContent)).toBeVisible();
  await expect(page.getByText("Revision 2")).toBeVisible();

  await page
    .getByRole("button", {
      name: "Đưa vào Trash",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\?state=TRASHED$/);

  await page
    .getByRole("link", {
      name: `Mở ký ức: ${updatedTitle}`,
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  await expect(
    page.locator('[data-slot="badge"]').filter({
      hasText: /^Trash$/,
    }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Khôi phục",
    })
    .click();

  await expect(
    page.getByRole("link", {
      name: "Chỉnh sửa",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: "Đưa vào Trash",
    }),
  ).toBeVisible();

  await expect(page.getByText("Revision 4")).toBeVisible();

  await page
    .getByRole("button", {
      name: "Đưa vào Trash",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\?state=TRASHED$/);

  await page
    .getByRole("link", {
      name: `Mở ký ức: ${updatedTitle}`,
    })
    .click();

  await page
    .getByRole("link", {
      name: `Mở ký ức: ${updatedTitle}`,
    })
    .click();

  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  await page
    .getByRole("button", {
      name: "Xóa vĩnh viễn",
    })
    .click();

  const deleteDialog = page.getByRole("alertdialog");

  await expect(deleteDialog).toBeVisible();

  await expect(
    deleteDialog.getByRole("heading", {
      name: "Xóa vĩnh viễn ký ức này?",
    }),
  ).toBeVisible();

  await deleteDialog
    .getByRole("button", {
      name: "Xóa vĩnh viễn",
    })
    .click();

  await expect(page).toHaveURL(/\/memories\?state=TRASHED$/);

  await expect(
    page.getByRole("link", {
      name: `Mở ký ức: ${updatedTitle}`,
    }),
  ).not.toBeVisible();

  expect(
    browserRequests.some((url) => url.startsWith("http://127.0.0.1:3101")),
  ).toBe(false);
});

test("keeps a Memory after its source Journal entry is deleted", async ({
  page,
}) => {
  const timestamp = Date.now();
  const journalTitle = `Journal source ${timestamp}`;
  const journalContent =
    "Một khoảnh khắc dài được ghi lại trong Journal trước khi chọn lọc.";
  const memoryContent = "Một khoảnh khắc đã được chọn lọc để tiếp tục lưu giữ.";

  await login(page);

  await page.goto("/journal");
  await page.getByRole("button", { name: "Viết entry mới" }).click();
  await page.getByLabel("Tiêu đề").fill(journalTitle);
  await page.getByLabel("Nội dung", { exact: true }).fill(journalContent);

  await expect(page.getByText("Đã lưu · revision 2")).toBeVisible({
    timeout: 10_000,
  });

  const journalUrl = page.url();

  await page.getByRole("button", { name: "Giữ lại như ký ức" }).click();

  await expect(page).toHaveURL(
    /\/memories\/new\?sourceJournalEntryId=[0-9a-f-]+$/,
  );

  await expect(page.getByLabel("Tiêu đề")).toHaveValue(journalTitle);
  await expect(page.getByLabel("Nội dung")).toHaveValue(journalContent);

  await page.getByLabel("Nội dung", { exact: true }).fill(memoryContent);

  await page.getByRole("button", { name: "Lưu ký ức" }).click();
  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  const memoryUrl = page.url();

  await expect(page.getByRole("heading", { name: journalTitle })).toBeVisible();
  await expect(page.getByText(memoryContent)).toBeVisible();

  await page.getByRole("link", { name: "Mở Journal nguồn" }).click();
  await expect(page).toHaveURL(journalUrl);
  await expect(page.getByLabel("Nội dung", { exact: true })).toHaveValue(
    journalContent,
  );

  await page.getByRole("button", { name: "Đưa vào Trash" }).click();
  await expect(page).toHaveURL(/\/journal\?state=TRASHED$/);
  await page.getByRole("link", { name: new RegExp(journalTitle) }).click();
  await expect(page).toHaveURL(/\/journal\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Xóa vĩnh viễn" }).click();

  const journalDeleteDialog = page.getByRole("alertdialog");
  await journalDeleteDialog
    .getByRole("button", { name: "Xóa vĩnh viễn" })
    .click();

  await expect(page).toHaveURL(/\/journal\?state=TRASHED$/);

  await page.goto(memoryUrl);
  await expect(page.getByRole("heading", { name: journalTitle })).toBeVisible();
  await expect(page.getByText(memoryContent)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở Journal nguồn" }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Đưa vào Trash" }).click();
  await expect(page).toHaveURL(/\/memories\?state=TRASHED$/);
  await page.getByRole("link", { name: `Mở ký ức: ${journalTitle}` }).click();
  await expect(page).toHaveURL(/\/memories\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xóa vĩnh viễn" })
    .click();

  await expect(page).toHaveURL(/\/memories\?state=TRASHED$/);
});
