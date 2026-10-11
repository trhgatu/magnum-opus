// Lấy từ @testing-library/dom (cùng instance mà @testing-library/react dùng):
// setup chạy cho mọi file test, kể cả file môi trường node thuần — không kéo
// React/ReactDOM vào những file đó.
import { configure } from "@testing-library/dom";

// findBy*/waitFor mặc định chỉ chờ 1s; khi turbo chạy test mọi package song
// song, cập nhật UI bất đồng bộ từng chậm hơn thế vì thiếu CPU. Assertion
// sai thật vẫn fail — chỉ là sau 5s thay vì 1s.
configure({ asyncUtilTimeout: 5_000 });
