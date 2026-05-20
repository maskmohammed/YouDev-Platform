import type { Metadata } from "next"
import {
  Geist,
  Geist_Mono,
  Noto_Sans,
  Playfair_Display,
} from "next/font/google"

import "./globals.css"

import { cn } from "@/lib/utils"

const playfairDisplayHeading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
})

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "YouDev",
    template: "%s | YouDev",
  },
  description:
    "YouDev est une plateforme publique de vote pour les projets étudiants.",
  applicationName: "YouDev",
  metadataBase: new URL("https://youdev.sup2i.ac"),
  openGraph: {
    title: "YouDev",
    description:
      "Plateforme publique de vote pour les projets étudiants dans le concours YOU-DEV.",
    url: "https://youdev.sup2i.ac",
    siteName: "YouDev",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
}

function ThemeScript() {
  const code = `
    (function () {
      try {
        var savedTheme = localStorage.getItem("youdev_theme");
        var theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";

        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        notoSans.variable,
        playfairDisplayHeading.variable,
        "font-sans",
      )}
    >
      <head>
        <ThemeScript />
      </head>

      <body className="flex min-h-full flex-col theme-transition">
        {children}
      </body>
    </html>
  )
}