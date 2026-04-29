import type React from "react"
import type { Metadata } from "next"
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { OutreachProvider } from "@/contexts/outreach-context"
import { Toaster } from "sonner"
import "./globals.css"

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
})

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SalesMatter — Operator-grade cold email",
  description:
    "Import leads. We research every name and draft the email — operator voice, no templates, no jargon. Personalized B2B outreach that sounds like a person actually wrote it.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <OutreachProvider>{children}</OutreachProvider>
        <Toaster position="top-right" richColors closeButton />
        <Analytics />
      </body>
    </html>
  )
}
