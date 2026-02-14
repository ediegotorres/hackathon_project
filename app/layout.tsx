import type { Metadata } from "next";
import { AppShell } from "@/src/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabLens",
  description: "Bloodwork dashboard and tracking app for hackathon demos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
