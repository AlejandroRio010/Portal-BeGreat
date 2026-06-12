import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  title: "BeGreat Consulting — Portal de Colaboradores",
  description: "Portal privado de colaboradores de BeGreat Consulting",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/begreat-oso.png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        {process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY && (
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY}&libraries=places`}
            async
            defer
          />
        )}
      </body>
    </html>
  );
}
