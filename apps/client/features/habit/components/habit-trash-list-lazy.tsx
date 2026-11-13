"use client";

import dynamic from "next/dynamic";

// Danh sách Thùng rác kéo theo AlertDialog: chỉ cần khi mở Thùng rác, nên
// tách khỏi JS tải lần đầu của /habits. dynamic() phải nằm trong Client
// Component thì Next mới tách chunk (gọi từ page là Server Component thì không).
export const HabitTrashListLazy = dynamic(() =>
  import("@/features/habit/components/habit-trash-list").then(
    (module) => module.HabitTrashList,
  ),
);
