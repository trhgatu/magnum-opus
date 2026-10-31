import { permanentRedirect } from "next/navigation";

/**
 * Trang chỉnh sửa cũ: giờ đổi tên trong sheet ngay trên trang chi tiết. Giữ
 * đường dẫn để link và bookmark cũ vẫn tới đúng Nếp sinh hoạt.
 */
export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/routines/${encodeURIComponent(id)}`);
}
