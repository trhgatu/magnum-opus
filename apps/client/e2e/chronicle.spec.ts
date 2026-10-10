import { expect, type Page, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin.e2e@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2EPassword123!";

const login = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/me$/);
};

interface Month {
  year: number;
  month: number;
}

const label = ({ year, month }: Month) => `Tháng ${month} · ${year}`;

const shift = ({ year, month }: Month, delta: number): Month => {
  const index = year * 12 + (month - 1) + delta;

  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/**
 * Tháng hiện tại tính theo múi giờ của owner trên server, không theo đồng hồ
 * của máy chạy test — nên đọc nó từ URL mà `/chronicle` chuyển hướng tới.
 */
const openCurrentMonth = async (page: Page): Promise<Month> => {
  await page.goto("/chronicle");
  await expect(page).toHaveURL(/\/chronicle\/\d{4}\/\d{1,2}$/);

  const match = new URL(page.url()).pathname.match(
    /\/chronicle\/(\d{4})\/(\d{1,2})$/,
  );
  if (!match) {
    throw new Error(`Unexpected Chronicle URL: ${page.url()}`);
  }

  return { year: Number(match[1]), month: Number(match[2]) };
};

const expectMonthHeading = async (page: Page, month: Month) => {
  await expect(
    page.getByRole("heading", { level: 1, name: label(month) }),
  ).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("opens the current month and browses back to a closed month", async ({
  page,
}) => {
  const current = await openCurrentMonth(page);

  await expectMonthHeading(page, current);
  await expect(page.getByText("Đang diễn ra · tính tới hôm nay")).toBeVisible();
  for (const space of ["Duy trì", "Theo đuổi", "Ghi lại"]) {
    await expect(
      page.getByRole("heading", { level: 2, name: space }),
    ).toBeVisible();
  }

  const nav = page.getByRole("navigation", { name: "Chuyển tháng" });
  const next = nav.getByRole("link", { name: label(shift(current, 1)) });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(next).not.toHaveAttribute("href");

  const previous = shift(current, -1);
  await nav.getByRole("link", { name: label(previous) }).click();

  await expect(page).toHaveURL(
    new RegExp(`/chronicle/${previous.year}/${previous.month}$`),
  );
  await expectMonthHeading(page, previous);
  await expect(page.getByText(/Đã khép lại · chốt lúc/)).toBeVisible();
});

test("sends future and invalid months back to the current month", async ({
  page,
}) => {
  const current = await openCurrentMonth(page);
  const currentUrl = new RegExp(`/chronicle/${current.year}/${current.month}$`);
  const future = shift(current, 1);

  await page.goto(`/chronicle/${future.year}/${future.month}`);
  await expect(page).toHaveURL(currentUrl);

  await page.goto(`/chronicle/${current.year}/13`);
  await expect(page).toHaveURL(currentUrl);

  await page.goto("/chronicle/1969/12");
  await expect(page).toHaveURL(currentUrl);
});

test("jumps to a month of an earlier year with the month picker", async ({
  page,
}) => {
  const current = await openCurrentMonth(page);
  const target = { year: current.year - 1, month: 1 };

  await page.getByRole("button", { name: "Chọn tháng" }).click();
  await page.getByRole("button", { name: `Năm ${target.year}` }).click();
  await page.getByRole("link", { name: label(target) }).click();

  await expect(page).toHaveURL(
    new RegExp(`/chronicle/${target.year}/${target.month}$`),
  );
  await expectMonthHeading(page, target);
  await expect(page.getByRole("dialog")).toBeHidden();
});
