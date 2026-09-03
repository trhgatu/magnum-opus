import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildRoutineHref,
  type RoutineLocation,
} from "@/features/routine/lib/routine-url";

export function RoutineSearch({
  location,
}: {
  location: Required<RoutineLocation>;
}) {
  return (
    <Form
      action="/routines"
      replace
      role="search"
      className="flex min-w-0 items-center gap-2"
    >
      {location.status === "ARCHIVED" ? (
        <input type="hidden" name="status" value="ARCHIVED" />
      ) : null}
      <input type="hidden" name="sortBy" value={location.sortBy} />
      <input type="hidden" name="sortOrder" value={location.sortOrder} />
      <div className="relative min-w-0 flex-1">
        <label htmlFor="routine-search" className="sr-only">
          Tìm Nếp sinh hoạt
        </label>
        <Input
          id="routine-search"
          name="search"
          type="search"
          defaultValue={location.search}
          placeholder="Tìm theo tên Nếp sinh hoạt…"
          className="h-10 bg-background/70 pl-9 pr-9"
        />
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        {location.search ? (
          <Link
            href={buildRoutineHref({ ...location, page: 1, search: "" })}
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
      <Button type="submit" variant="outline" size="lg">
        Tìm Nếp sinh hoạt
      </Button>
    </Form>
  );
}
