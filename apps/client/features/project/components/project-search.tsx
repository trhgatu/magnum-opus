import { Search, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildProjectHref,
  parseProjectLocation,
} from "@/features/project/lib/project-url";

export function ProjectSearch({
  location,
}: {
  location: ReturnType<typeof parseProjectLocation>;
}) {
  return (
    <Form
      action="/projects"
      replace
      role="search"
      className="flex min-w-0 items-center gap-2"
    >
      {location.state ? (
        <input type="hidden" name="state" value={location.state} />
      ) : null}
      <div className="relative min-w-0 flex-1">
        <label htmlFor="project-search" className="sr-only">
          Tìm Project
        </label>
        <Input
          id="project-search"
          name="search"
          type="search"
          defaultValue={location.search}
          placeholder="Tìm theo tên Project…"
          className="h-10 bg-background/70 pl-9 pr-9"
        />
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        {location.search ? (
          <Link
            href={buildProjectHref({ ...location, page: 1, search: "" })}
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
        Tìm Project
      </Button>
    </Form>
  );
}
