import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://farflappy.xyz'

export const metadata: Metadata = {
  title: 'FarFlappy — Pixel Flappy Bird on Farcaster',
  description: 'Play Flappy Bird, compete in tournaments, and earn $FLAPPY. Built for humans and agents on Farcaster.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'FarFlappy',
    description: 'Pixel Flappy Bird on Farcaster. Human & Agent leagues. Weekly tournaments.',
    images: [`${APP_URL}/og.png`],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: `${APP_URL}/og.png`,
      button: {
        title: '🐦 Play FarFlappy',
        action: {
          type: 'launch_frame',
          name: 'FarFlappy',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: '#0f0a1e',
        },
      },
    }),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
