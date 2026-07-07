import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quy Đổi Điểm Trúng Tuyển — Học viện Ngân hàng 2026 | TB 3508/HVNH",
  description:
    "Công cụ nội suy điểm tương đương giữa 5 phương thức xét tuyển (PTXT 4, 2.1, 2.2, 2.3, 3) theo Thông báo 3508/TB-HVNH — Học viện Ngân hàng năm 2026. Nhanh chóng, chính xác, miễn phí.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}
