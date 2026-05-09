import type { Metadata } from 'next'
import { Syne } from 'next/font/google'
import { DM_Mono } from 'next/font/google'
import { DM_Serif_Display } from 'next/font/google'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  variable: '--font-dm-serif',
})

export const metadata: Metadata = {
  title: 'Portal Dr. Guilherme',
  description: 'Portal de atendimento ao paciente — Dr. Guilherme',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${syne.variable} ${dmMono.variable} ${dmSerifDisplay.variable}`}>
      <body>{children}</body>
    </html>
  )
}
