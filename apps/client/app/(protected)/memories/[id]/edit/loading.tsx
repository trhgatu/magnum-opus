import { FormSkeleton } from "@/components/system/form-skeleton";

export default function Loading() {
  return (
    <FormSkeleton
      eyebrow="Reflection"
      title="Chỉnh sửa ký ức"
      description="Điều chỉnh cách khoảnh khắc được ghi lại mà không làm mất nguồn gốc và lịch sử revision."
    />
  );
}
