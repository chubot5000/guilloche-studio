import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Rouletté | Guilloché Pattern Studio";
const description =
  "Design adjustable guilloché medallions, woven ribbons, tubes, background fields, precision sine-wave hatching, and geodesic globes, then export press-ready vector SVGs.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0] ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host
    ? `${protocol}://${host}`
    : "https://roulette-guilloche-studio.lilchu.chatgpt.site";
  const socialImage = new URL("/og-v2.png", origin).toString();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: socialImage, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

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
