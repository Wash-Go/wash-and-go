import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wash & Go — Seamless Laundry, Anytime, Anywhere",
  description:
    "Scheduling-first laundry service in Zamboanga City. Book recurring or one-time pickups, doorstep return, cashless payment via GCash/Maya.",
  openGraph: {
    title: "Wash & Go — Seamless Laundry, Anytime, Anywhere",
    description:
      "Book laundry pickup, we handle wash + return. Zamboanga City.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
