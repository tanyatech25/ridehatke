import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import RideCareChat from "@/components/RideCareChat";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RideHatke - Compare Ride Fares instantly",
  description: "Find the best ride fares across multiple platforms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={outfit.className}>
        {children}
        <RideCareChat />
      </body>
    </html>
  );
}
