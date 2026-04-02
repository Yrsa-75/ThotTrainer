import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Thot Trainer',
  description: 'Plateforme d\'entraînement commercial IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: '#0f1219' }}>{children}</body>
    </html>
  )
}
