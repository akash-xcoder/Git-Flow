import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-pjs",
  weight: ["300", "400", "500", "600", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "RepoFlow — AI GitHub Repository Visualizer | DarkLine Division",
  description:
    "Drop a GitHub link to instantly map architecture, dependencies, and CI/CD pipelines using Gemini AI.",
  openGraph: {
    title: "RepoFlow — AI GitHub Repository Visualizer | DarkLine Division",
    description:
      "Drop a GitHub link to instantly map architecture, dependencies, and CI/CD pipelines using Gemini AI.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoFlow — AI GitHub Repository Visualizer | DarkLine Division",
    description:
      "Drop a GitHub link to instantly map architecture, dependencies, and CI/CD pipelines using Gemini AI.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-black text-white antialiased selection:bg-[#00f3ff]/20 selection:text-[#00f3ff] overflow-hidden m-0 p-0"
      >
        {children}
      </body>
    </html>
  );
}
