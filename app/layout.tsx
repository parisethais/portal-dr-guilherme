import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Archivo } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jakarta',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
})

export const metadata: Metadata = {
  title: 'MedEn — Portal de Saúde',
  description: 'Portal de atendimento ao paciente — Dr. Guilherme Santa Catharina',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  )
}
