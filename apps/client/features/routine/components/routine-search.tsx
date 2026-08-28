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
      className="flex min-w-0 gap-2"
    >
      {location.status === "ARCHIVED" ? (
        <input type="hidden" name="status" value="ARCHIVED" />
      ) : null}
      <input type="hidden" name="sortBy" value={location.sortBy} />
      <input type="hidden" name="sortOrder" value={location.sortOrder} />
      <div className="relative min-w-0 flex-1">
        <label htmlFor="routine-search" className="sr-only">
          Tìm Routine
        </label>
        <Input
          id="routine-search"
          name="search"
          type="search"
          defaultValue={location.search}
          placeholder="Tìm Routine…"
          className="pr-9"
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
      <Button type="submit" variant="outline">
        <Search aria-hidden="true" /> Tìm
      </Button>
    </Form>
  );
}
