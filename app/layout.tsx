import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BfcacheHandler } from "@/components/BfcacheHandler";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Homebase",
  description: "Your personal service dashboard",
  icons: {
    icon: "/icon.png?v=2",
    apple: "/icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-gray-50 dark:bg-gray-900 retro:bg-retro-bg text-gray-900 dark:text-gray-100 retro:text-retro-green"
      >
        <ThemeProvider>
          <BfcacheHandler />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
