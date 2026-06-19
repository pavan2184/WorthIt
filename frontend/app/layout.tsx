import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorthIt",
  description: "Interactive break-even dashboard for everyday decisions.",
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
