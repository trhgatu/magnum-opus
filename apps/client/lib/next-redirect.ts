// Server Actions gọi redirect() thành công bằng cách throw một lỗi có
// digest dạng "NEXT_REDIRECT;<type>;<destination>;<statusCode>;" — Next.js
// hiện thực điều hướng qua cơ chế đó. Bất kỳ try/catch nào bọc quanh lời
// gọi Server Action có thể redirect đều phải nhận diện và re-throw đúng
// lỗi này, nếu không sẽ vô tình nuốt mất tín hiệu điều hướng và coi một
// thao tác thành công là lỗi.
//
// Khớp theo dấu ";" ngay sau "NEXT_REDIRECT" (không chỉ startsWith chuỗi
// trần) để không nhầm với một digest khác chỉ tình cờ trùng tiền tố.
export const isRedirectError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  typeof (error as { digest?: unknown }).digest === "string" &&
  (error as { digest: string }).digest.startsWith("NEXT_REDIRECT;");
