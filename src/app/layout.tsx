import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Belas Passadeiras",
  description: "Sistema de gestão de lavanderia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${poppins.variable} font-inter antialiased bg-brand-bg text-brand-text`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#FFFFFF",
              color: "#4A3F35",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: "12px",
              fontFamily: "var(--font-inter)",
              fontSize: "14px",
              boxShadow: "0 4px 24px rgba(212,175,55,0.10)",
            },
            success: {
              iconTheme: { primary: "#7D9B76", secondary: "#FFFFFF" },
            },
            error: {
              iconTheme: { primary: "#e53e3e", secondary: "#FFFFFF" },
            },
          }}
        />
      </body>
    </html>
  );
}
