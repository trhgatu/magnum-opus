import { permanentRedirect } from "next/navigation";

/**
 * Trang chỉnh sửa cũ: giờ sửa trong sheet ngay trên trang chi tiết. Giữ
 * đường dẫn để link và bookmark cũ vẫn tới đúng ký ức.
 */
export default async function EditMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/memories/${encodeURIComponent(id)}`);
}
