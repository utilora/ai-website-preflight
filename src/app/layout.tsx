import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Website Preflight",
  description: "A pre-launch verification product for AI-built websites.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
