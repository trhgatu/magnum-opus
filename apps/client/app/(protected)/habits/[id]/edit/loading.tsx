import { FormSkeleton } from "@/components/system/form-skeleton";

export default function Loading() {
  return (
    <FormSkeleton
      eyebrow="Forge · Habits"
      title="Chỉnh sửa thói quen"
      description="Đang chuẩn bị định nghĩa và lịch thực hiện hiện tại."
    />
  );
}
