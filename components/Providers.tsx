'use client'

import { ReactNode, useEffect } from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { farcasterFrame as farcasterMiniApp } from '@farcaster/frame-wagmi-connector'
import { sdk } from '@farcaster/miniapp-sdk'

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [farcasterMiniApp()],
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
