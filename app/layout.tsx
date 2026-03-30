import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";

export const metadata: Metadata = {
  title: "HIIT Timer",
  description: "High Intensity Interval Training Timer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HIIT Timer",
  },
};

export const viewport: Viewport = {
  themeColor: "#010108",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full bg-[#0d0d0d] text-slate-100 antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
