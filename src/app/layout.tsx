import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientLayout } from "@/components/layout/ClientLayout";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bob's StockPulse — 1000X Stock Analysis",
  description: "Interactive projection engine for deep stock analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
