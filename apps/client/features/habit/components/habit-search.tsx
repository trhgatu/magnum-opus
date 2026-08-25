import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <Form action="/habits" replace role="search" className="flex min-w-0 gap-2">
      {location.status === "ARCHIVED" ? (
        <input type="hidden" name="status" value="ARCHIVED" />
      ) : null}
      <input type="hidden" name="sortBy" value={location.sortBy} />
      <input type="hidden" name="sortOrder" value={location.sortOrder} />
      <div className="relative min-w-0 flex-1">
        <label htmlFor="habit-search" className="sr-only">
          Tìm thói quen
        </label>
        <Input
          id="habit-search"
          name="search"
          type="search"
          defaultValue={location.search}
          placeholder="Tìm thói quen…"
          className="pr-9"
        />
        {location.search ? (
          <Link
            href={buildHabitHref({ ...location, page: 1, search: "" })}
            aria-label="Xóa từ khóa"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-sm",
              className: "absolute top-1/2 right-1 -translate-y-1/2",
            })}
          >
            <X aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <Button type="submit" variant="outline">
        <Search aria-hidden="true" /> Tìm
      </Button>
    </Form>
  );
}
