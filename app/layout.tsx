import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ContentFlow — Planifie ton contenu LinkedIn",
  description: "Planifie, programme et publie ton contenu LinkedIn automatiquement.",
  openGraph: {
    title: "ContentFlow — Planifie ton contenu LinkedIn",
    description: "Le moyen le plus simple de planifier ton contenu LinkedIn.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
