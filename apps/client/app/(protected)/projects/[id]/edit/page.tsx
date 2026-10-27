import { permanentRedirect } from "next/navigation";

/**
 * Trang chỉnh sửa cũ: tên, mô tả sửa ngay trên trang chi tiết, nguồn hoạt
 * động mở từ nút ở đầu trang. Giữ đường dẫn để link và bookmark cũ vẫn tới
 * đúng Project.
 */
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/projects/${encodeURIComponent(id)}`);
}
