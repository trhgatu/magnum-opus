import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  buildHabitHref,
  type HabitLocation,
} from "@/features/habit/lib/habit-url";

export function HabitSearch({
  location,
}: {
  location: Required<HabitLocation>;
}) {
  return (
    <Form
      action="/habits"
      replace
      role="search"
      className="relative w-full sm:w-72"
    >
      {location.status !== "ACTIVE" ? (
        <input type="hidden" name="status" value={location.status} />
      ) : location.type === "QUIT" ? (
        <input type="hidden" name="type" value="QUIT" />
      ) : null}
      <label htmlFor="habit-search" className="sr-only">
        Tìm thói quen
      </label>
      <input
        id="habit-search"
        name="search"
        type="search"
        defaultValue={location.search}
        placeholder="Tìm theo tên"
        className="h-11 w-full rounded-xl border border-border bg-card pr-10 pl-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-search-cancel-button]:hidden"
      />
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      {location.search ? (
        <Link
          href={buildHabitHref({
            status: location.status,
            type: location.type,
          })}
          aria-label="Xóa từ khóa"
          className={buttonVariants({
            variant: "ghost",
            size: "icon-sm",
            className: "absolute top-1/2 right-1.5 -translate-y-1/2",
          })}
        >
          <X aria-hidden="true" />
        </Link>
      ) : null}
    </Form>
  );
}
