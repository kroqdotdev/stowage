import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { PocketBaseClientProvider } from "@/app/PocketBaseClientProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stowage",
  description: "Asset management for small teams",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Stowage",
    statusBarStyle: "black",
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
        color: "#1f2220",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f2220" },
    { media: "(prefers-color-scheme: dark)", color: "#141615" },
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
        className={`${archivo.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <PocketBaseClientProvider pocketbaseUrl={pocketbaseUrl}>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </PocketBaseClientProvider>
      </body>
    </html>
  );
}
