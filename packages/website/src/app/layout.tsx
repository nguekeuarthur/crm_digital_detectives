import type { Metadata } from "next";
import { montserrat } from "./fonts";
import "./globals.css";
import { FloatingContact } from "../components/FloatingContact";

export const metadata: Metadata = {
  title: "Digital Detectives | Enquête de Vérité",
  description: "Votre détective privé en Suisse et à l'international",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col ${montserrat.className}`} suppressHydrationWarning>
        {children}
        <FloatingContact />
      </body>
    </html>
  );
}
