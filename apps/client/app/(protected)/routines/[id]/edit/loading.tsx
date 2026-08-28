import { FormSkeleton } from "@/components/system/form-skeleton";

export default function Loading() {
  return (
    <FormSkeleton
      eyebrow="Forge · Routines"
      title="Chỉnh sửa Routine"
      description="Đang tải dữ liệu Routine."
    />
  );
}
