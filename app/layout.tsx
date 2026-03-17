import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ContentFlow — Planifie ton contenu LinkedIn",
  description: "Planifie, programme et publie ton contenu LinkedIn automatiquement. Calendrier visuel, templates, et preview en temps réel.",
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
