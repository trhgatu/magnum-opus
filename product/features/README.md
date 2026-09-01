# Feature index

Feature index là danh sách capability theo trạng thái sản phẩm, không phải backlog kỹ thuật.

| Capability            | Vai trò trong journey                                    | Trạng thái                                         |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| Identity & access     | Bảo vệ không gian riêng tư và quyền sở hữu dữ liệu       | Foundation đang được sử dụng                       |
| [Journal](journal.md) | Capture trải nghiệm và bắt đầu reflection                | Đã hoàn thành vertical slice v1                    |
| [Mood](mood.md)       | Ghi nhận trạng thái cảm xúc trong bối cảnh Journal       | Đã hoàn thành vertical slice v1                    |
| [Memory](memory.md)   | Giữ lại những trải nghiệm có ý nghĩa theo dòng thời gian | Đã hoàn thành vertical slice v1                    |
| [Forge](forge.md)     | Chuyển insight thành hành vi lặp lại và cấu trúc sống    | Habit, Check-in, Routine và Today đã hoàn thành V1 |
| Knowledge             | Chuyển trải nghiệm và nguồn bên ngoài thành hiểu biết    | Chưa thiết kế                                      |
| Vitality              | Kết nối sự chuyển hóa với cơ thể vật lý                  | Chưa thiết kế                                      |
| Gamification          | Phản chiếu tiến trình mà không thao túng người dùng      | Chưa thiết kế                                      |

Mỗi capability chuyển sang trạng thái “đã thiết kế” khi tài liệu của nó trả lời được:

1. Người dùng cần giải quyết điều gì?
2. Điều gì khởi động flow?
3. Happy path diễn ra ra sao?
4. Những nhánh lỗi hoặc trạng thái biên nào có ý nghĩa?
5. Business rules nào phải luôn đúng?
6. Capability đọc hoặc phát ra sự kiện nào?
7. Dữ liệu nào nhạy cảm và người dùng kiểm soát nó thế nào?
8. Làm sao biết flow tạo ra giá trị thật?
