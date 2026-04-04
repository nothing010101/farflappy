'use client'

import { ReactNode } from 'react'
import { createAppKit } from '@reown/appkit/react'
import { base } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { cookieToInitialState } from 'wagmi'
import { wagmiAdapter, projectId } from '@/config/reownConfig'

const queryClient = new QueryClient()

createAppKit({
  adapters: [wagmiAdapter],
  projectId: projectId!,
  networks: [base],
  defaultNetwork: base,
  metadata: {
    name: 'FarFlappy Admin',
    description: 'FarFlappy Admin Panel',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://farflappy.xyz',
    icons: ['https://farflappy.xyz/icon.png'],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
})

export function AdminProviders({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
