import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PocketBaseClientProvider } from "@/app/PocketBaseClientProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "Stowage",
  description: "Asset management for small teams",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stowage",
    statusBarStyle: "default",
    startupImage: ["/images/web/apple-touch-icon.png"],
  },
  icons: {
    icon: [
      { url: "/images/web/favicon.ico", sizes: "any" },
      {
        url: "/images/web/icon-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/images/web/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/images/web/favicon.ico",
    apple: [
      {
        url: "/images/web/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/images/web/apple-touch-icon.png",
      },
      {
        rel: "mask-icon",
        url: "/images/web/safari-pinned-tab.svg",
        color: "#c2410c",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c2410c" },
    { media: "(prefers-color-scheme: dark)", color: "#ea580c" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pocketbaseUrl =
    process.env.NEXT_PUBLIC_POCKETBASE_URL ?? "http://127.0.0.1:8090";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PocketBaseClientProvider pocketbaseUrl={pocketbaseUrl}>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </PocketBaseClientProvider>
      </body>
    </html>
  );
}
