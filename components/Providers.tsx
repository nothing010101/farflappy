'use client'

import { ReactNode, useEffect } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import sdk from '@farcaster/frame-sdk'

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [injected()],
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    sdk.actions.ready().catch(console.error)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
