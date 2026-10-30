import { permanentRedirect } from "next/navigation";

/**
 * Trang chỉnh sửa cũ: giờ sửa trong sheet ngay trên trang chi tiết. Giữ
 * đường dẫn để link và bookmark cũ vẫn tới đúng thói quen.
 */
export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/habits/${encodeURIComponent(id)}`);
}
