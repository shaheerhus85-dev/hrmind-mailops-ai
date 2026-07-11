import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./phase8a.css";

export const metadata: Metadata = {
  title: "HRMind MailOps AI",
  description: "AI-assisted recruiter inbox workflow dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
