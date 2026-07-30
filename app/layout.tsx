import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rouletté — Guilloché Pattern Studio",
  description:
    "Design adjustable guilloché patterns and export press-ready vector SVGs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
