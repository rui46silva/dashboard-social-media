import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { SessionProvider, themeScript } from "@/components/session";
import { StoreProvider } from "@/components/store";
import { PillSync } from "@/components/pill-sync";

export const metadata: Metadata = {
  title: { default: "Mesa", template: "%s · Mesa" },
  description: "Redes sociais, site e negócio da agência num só lugar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1f21" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <StoreProvider>{children}</StoreProvider>
          <PillSync />
        </SessionProvider>
      </body>
    </html>
  );
}
