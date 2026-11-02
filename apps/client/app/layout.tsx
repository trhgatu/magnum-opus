import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Newsreader } from "next/font/google";

import { ToastProvider } from "@/components/system/toast-provider";

import "./globals.css";

// Bộ font của bộ thiết kế Magnum Opus: Newsreader cho tiêu đề và con số,
// Be Vietnam Pro cho chữ thường, IBM Plex Mono cho nhãn và ngày giờ.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Magnum Opus",
    template: "%s | Magnum Opus",
  },
  description:
    "Không gian riêng để ghi lại, soi chiếu và chủ động kiến tạo đời sống mỗi ngày.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${newsreader.variable} ${beVietnamPro.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
