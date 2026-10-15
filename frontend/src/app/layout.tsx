import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EduGuard | Academic Risk Early-Warning System",
  description:
    "Explainable AI-based academic risk decision-support and student early-warning platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-full bg-paper text-ink antialiased selection:bg-mint selection:text-ink font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
