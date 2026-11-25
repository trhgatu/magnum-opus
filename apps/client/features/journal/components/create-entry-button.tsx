"use client";

import { PenLine } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function CreateEntryButton({
  label = "Viết trang mới",
}: {
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="lg"
      className="w-full sm:w-auto"
    >
      <PenLine data-icon="inline-start" aria-hidden="true" />
      {pending ? "Đang mở trang viết…" : label}
    </Button>
  );
}
