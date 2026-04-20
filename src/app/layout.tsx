import type { Metadata } from "next";
import { SocketProvider } from "@/contexts/SocketContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blackjack Multiplayer - Bàn Bạn Bè",
  description: "Game Blackjack multiplayer real-time. Tối đa 6 người chơi + 1 Dealer. Hỗ trợ 3 tay/người, side bets Perfect Pairs & 21+3.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Raleway:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
