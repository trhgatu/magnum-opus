// sonner phải được dynamic-import ngay tại điểm gọi, không import tĩnh ở
// đầu file — mỗi component lifecycle gọi trực tiếp `import { toast } from
// "sonner"` từng khiến webpack gộp runtime sonner vào first-load JS của
// route detail tương ứng, vượt performance budget dù chỉ dùng cho 1 dòng
// thông báo sau khi thao tác thành công.
export async function notifySuccess(message: string) {
  const { toast } = await import("sonner");
  toast.success(message);
}
