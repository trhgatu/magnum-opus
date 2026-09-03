import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const KIBIBYTE = 1024;
// +3 KiB trên /me và /memories, +2 KiB trên /journal/[id]: overhead cố
// định của ToastProvider (components/system/toast-provider.tsx) dùng
// next/dynamic ssr:false để tách sonner khỏi first-load JS — hạ tầng
// toast dùng chung toàn client, không phải markup phình theo feature.
const routeBudgets = new Map([
  ["/", 560 * KIBIBYTE],
  ["/login", 560 * KIBIBYTE],
  ["/me", 563 * KIBIBYTE],
  ["/journal", 570 * KIBIBYTE],
  ["/journal/[id]", 627 * KIBIBYTE],
  ["/memories", 568 * KIBIBYTE],
  // Memory editors include the isolated shadcn Calendar/Date Picker chunk.
  ["/memories/new", 670 * KIBIBYTE],
  ["/memories/[id]", 610 * KIBIBYTE],
  ["/memories/[id]/edit", 670 * KIBIBYTE],
  // +2 KiB trên toàn bộ route con của /habits và /routines: error.tsx mới
  // thêm (EmptyState + Button + Link) — Journal/Memories đã có sẵn boundary
  // này từ đầu, khoản overhead tương đương đã nằm trong budget của chúng.
  ["/habits", 568 * KIBIBYTE],
  // ConflictAlert dùng chung (components/system/conflict-alert.tsx) + logic
  // reload-on-conflict nâng habit-editor lên cùng chuẩn xử lý xung đột với
  // memory/journal-editor: +3 KiB trên /habits/new và /habits/[id]/edit.
  // +0.3 KiB thêm nữa từ useUnsavedChangesWarning (đồng bộ với journal-editor).
  ["/habits/new", 662 * KIBIBYTE],
  ["/habits/[id]", 572 * KIBIBYTE],
  ["/habits/[id]/edit", 662 * KIBIBYTE],
  ["/routines", 568 * KIBIBYTE],
  // Cùng ConflictAlert/reload-on-conflict trên routine-editor: +2 KiB trên
  // /routines/new và /routines/[id]/edit.
  ["/routines/new", 575 * KIBIBYTE],
  // Routine detail includes the isolated shadcn Select used for membership.
  ["/routines/[id]", 660 * KIBIBYTE],
  ["/routines/[id]/edit", 575 * KIBIBYTE],
  ["/today", 570 * KIBIBYTE],
]);

const diagnosticsPath = resolve(
  process.cwd(),
  ".next/diagnostics/route-bundle-stats.json",
);

const formatKibibytes = (bytes) => `${(bytes / KIBIBYTE).toFixed(1)} KiB`;

let routeStats;

try {
  routeStats = JSON.parse(await readFile(diagnosticsPath, "utf8"));
} catch (error) {
  console.error(
    "Client performance budget could not read the Next.js production build diagnostics.",
  );
  console.error("Run `pnpm --filter=client build` before this command.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const statsByRoute = new Map(
  routeStats.map((entry) => [entry.route, entry.firstLoadUncompressedJsBytes]),
);
const failures = [];

for (const [route, budget] of routeBudgets) {
  const actual = statsByRoute.get(route);

  if (typeof actual !== "number") {
    failures.push(`${route}: route is missing from Next.js bundle diagnostics`);
    continue;
  }

  const result = `${route}: ${formatKibibytes(actual)} / ${formatKibibytes(budget)}`;
  console.log(result);

  if (actual > budget) {
    failures.push(result);
  }
}

if (failures.length > 0) {
  console.error("\nClient JavaScript performance budget failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "Reduce client-side JavaScript or review the budget deliberately with evidence.",
  );
  process.exit(1);
}

console.log("Client JavaScript performance budget passed.");
