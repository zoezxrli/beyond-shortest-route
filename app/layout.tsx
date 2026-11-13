import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruta Justa Bogotá Demo",
  description: "Worker reporting and biweekly AI-assisted waste-picking planning for Los Mártires, Bogotá.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
