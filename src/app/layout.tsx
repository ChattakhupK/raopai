import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";

const plex = IBM_Plex_Sans_Thai({
  variable: "--font-plex",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RaoPai",
  description: "ปักหมุดทุกที่ที่เราไปด้วยกัน พร้อมวันที่และรูปภาพ",
  appleWebApp: { capable: true, title: "RaoPai", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plex.variable} h-full antialiased`}>
      <body className="h-full">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
