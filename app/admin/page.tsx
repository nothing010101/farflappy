'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { parseUnits, formatUnits } from 'viem'

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_VAULT_ADDRESS as `0x${string}`
const ADMIN_WALLET = '0x274785f92c8829c6F2D7E67e67c3d087f51B57be'

const VAULT_ABI = [
  {
    name: 'createTournament',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tournamentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'distributePrizes',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tournamentId', type: 'uint256' },
      { name: 'winners', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    name: 'getTournamentInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tournamentId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'entryFee', type: 'uint256' },
      { name: 'prizePool', type: 'uint256' },
      { name: 'devFee', type: 'uint256' },
      { name: 'participantCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'isPaidOut', type: 'bool' },
    ],
  },
  {
    name: 'devBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'withdrawDev',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'pause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'unpause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'initiateEmergencyWithdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tournamentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

export default function AdminPage() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  // Form states
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newTournamentType, setNewTournamentType] = useState<'human' | 'agent' | 'both'>('human')
  const [newTournamentStart, setNewTournamentStart] = useState('')
  const [tournamentIdQuery, setTournamentIdQuery] = useState('1')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [distributeId, setDistributeId] = useState('')
  const [distributeWinners, setDistributeWinners] = useState('')
  const [distributeAmounts, setDistributeAmounts] = useState('')

  // Read contract state
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'paused',
  })

  const { data: devBalance, refetch: refetchDevBalance } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'devBalance',
  })

  const { data: tournamentInfo, refetch: refetchTournament } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getTournamentInfo',
    args: [BigInt(tournamentIdQuery || '1')],
  })

  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase()

  const exec = async (label: string, fn: () => Promise<unknown>) => {
    setLoading(true)
    setStatus(`${label}...`)
    try {
      const tx = await fn()
      setStatus(`✓ ${label} done! TX: ${String(tx).slice(0, 20)}...`)
      refetchPaused()
      refetchDevBalance()
      refetchTournament()
    } catch (e: unknown) {
      setStatus(`✗ Error: ${e instanceof Error ? e.message.slice(0, 80) : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTournament = async () => {
    if (!newTournamentName) return

    // Generate numeric ID from timestamp
    const numId = Math.floor(Date.now() / 1000)

    // Save to Supabase first
    const startTime = newTournamentStart
      ? new Date(newTournamentStart).toISOString()
      : new Date(getNextMonday()).toISOString()

    const endTime = new Date(new Date(startTime).getTime() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('tournaments').insert({
      name: newTournamentName,
      player_type: newTournamentType,
      start_time: startTime,
      end_time: endTime,
      entry_fee_usdc: 0.5,
      prize_pool_usdc: 0,
      status: 'upcoming',
      contract_address: VAULT_ADDRESS,
    })

    if (error) { setStatus('✗ Supabase error: ' + error.message); return }

    // Create onchain
    await exec('Create Tournament', () =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'createTournament',
        args: [BigInt(numId)],
      })
    )
  }

  const handleDistribute = async () => {
    const winners = distributeWinners.split('\n').map(w => w.trim()).filter(Boolean) as `0x${string}`[]
    const amounts = distributeAmounts.split('\n').map(a => parseUnits(a.trim(), 6))

    await exec('Distribute Prizes', () =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'distributePrizes',
        args: [BigInt(distributeId), winners, amounts],
      })
    )
  }

  const handleWithdrawDev = async () => {
    const amount = parseUnits(withdrawAmount, 6)
    await exec('Withdraw Dev', () =>
      writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'withdrawDev',
        args: [amount],
      })
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="card p-8 text-center space-y-4">
          <div className="pixel-font text-farcaster-light text-sm">FARFLAPPY ADMIN</div>
          <p className="text-text-muted text-xs">Connect your owner wallet to continue</p>
          <w3m-button />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="card p-8 text-center">
          <div className="text-red-400 pixel-font text-sm mb-2">ACCESS DENIED</div>
          <p className="text-text-muted text-xs">Not the admin wallet</p>
          <p className="text-text-muted text-xs mt-1 font-mono">{address}</p>
          <w3m-button />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="pixel-font text-farcaster-light text-sm">⚙️ ADMIN</div>
        <w3m-button />
      </div>

      {/* Status */}
      {status && (
        <div className={`card p-3 text-xs font-mono ${status.startsWith('✓') ? 'border-green-400/50 text-green-400' : status.startsWith('✗') ? 'border-red-400/50 text-red-400' : 'text-text-muted'}`}>
          {status}
        </div>
      )}

      {/* Contract Stats */}
      <div className="card p-4 space-y-2">
        <div className="pixel-font text-text-muted mb-2" style={{ fontSize: 8 }}>CONTRACT STATUS</div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Contract</span>
          <span className="font-mono text-farcaster-light">{VAULT_ADDRESS?.slice(0, 10)}...</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Status</span>
          <span className={isPaused ? 'text-red-400' : 'text-green-400'}>
            {isPaused ? '⏸ PAUSED' : '▶ ACTIVE'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Dev Balance</span>
          <span className="text-pixel">${devBalance ? Number(formatUnits(devBalance, 6)).toFixed(2) : '0.00'} USDC</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 btn-primary text-xs py-2"
            onClick={() => exec('Pause', () => writeContractAsync({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'pause' }))}
            disabled={loading || !!isPaused}
          >
            PAUSE
          </button>
          <button
            className="flex-1 btn-primary text-xs py-2"
            style={{ background: '#10b981' }}
            onClick={() => exec('Unpause', () => writeContractAsync({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'unpause' }))}
            disabled={loading || !isPaused}
          >
            UNPAUSE
          </button>
        </div>
      </div>

      {/* Create Tournament */}
      <div className="card p-4 space-y-3">
        <div className="pixel-font text-text-muted" style={{ fontSize: 8 }}>CREATE TOURNAMENT</div>
        <input
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
          placeholder="Tournament name (e.g. Week 1 Human League)"
          value={newTournamentName}
          onChange={e => setNewTournamentName(e.target.value)}
        />
        <select
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
          value={newTournamentType}
          onChange={e => setNewTournamentType(e.target.value as 'human' | 'agent' | 'both')}
        >
          <option value="human">👤 Human League</option>
          <option value="agent">🤖 Agent League</option>
          <option value="both">⚔️ Open (Both)</option>
        </select>
        <input
          type="datetime-local"
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
          value={newTournamentStart}
          onChange={e => setNewTournamentStart(e.target.value)}
          placeholder="Start time (default: next Monday UTC)"
        />
        <button className="btn-primary w-full text-xs" onClick={handleCreateTournament} disabled={loading || !newTournamentName}>
          CREATE + ACTIVATE ONCHAIN
        </button>
      </div>

      {/* Query Tournament */}
      <div className="card p-4 space-y-3">
        <div className="pixel-font text-text-muted" style={{ fontSize: 8 }}>QUERY TOURNAMENT</div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
            placeholder="Tournament numeric ID"
            value={tournamentIdQuery}
            onChange={e => setTournamentIdQuery(e.target.value)}
          />
          <button className="btn-primary text-xs px-3" onClick={() => refetchTournament()}>
            FETCH
          </button>
        </div>
        {tournamentInfo && (
          <div className="space-y-1 text-xs">
            {[
              ['Prize Pool', `$${Number(formatUnits(tournamentInfo[2], 6)).toFixed(2)} USDC`],
              ['Participants', String(tournamentInfo[4])],
              ['Active', tournamentInfo[5] ? '✓ Yes' : '✗ No'],
              ['Paid Out', tournamentInfo[6] ? '✓ Yes' : '✗ No'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-text-muted">{k}</span>
                <span className="text-text">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribute Prizes */}
      <div className="card p-4 space-y-3">
        <div className="pixel-font text-text-muted" style={{ fontSize: 8 }}>DISTRIBUTE PRIZES</div>
        <input
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
          placeholder="Tournament numeric ID"
          value={distributeId}
          onChange={e => setDistributeId(e.target.value)}
        />
        <textarea
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text h-20"
          placeholder={"Winner addresses (one per line)\n0x123...\n0x456..."}
          value={distributeWinners}
          onChange={e => setDistributeWinners(e.target.value)}
        />
        <textarea
          className="w-full bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text h-16"
          placeholder={"Amounts in USDC (one per line)\n10.00\n5.00"}
          value={distributeAmounts}
          onChange={e => setDistributeAmounts(e.target.value)}
        />
        <div className="text-text-muted text-xs">Total must be ≤ 80% of prize pool</div>
        <button className="btn-primary w-full text-xs" onClick={handleDistribute} disabled={loading || !distributeId}>
          DISTRIBUTE 🏆
        </button>
      </div>

      {/* Withdraw Dev */}
      <div className="card p-4 space-y-3">
        <div className="pixel-font text-text-muted" style={{ fontSize: 8 }}>WITHDRAW DEV FEES</div>
        <div className="text-xs text-text-muted">
          Available: <span className="text-pixel">${devBalance ? Number(formatUnits(devBalance, 6)).toFixed(2) : '0.00'} USDC</span>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-bg-secondary border border-farcaster/30 rounded p-2 text-xs text-text"
            placeholder="Amount USDC (e.g. 10.00)"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
          />
          <button className="btn-primary text-xs px-3" onClick={handleWithdrawDev} disabled={loading || !withdrawAmount}>
            WITHDRAW
          </button>
        </div>
      </div>

      {/* Emergency */}
      <div className="card p-4 border-red-400/30 space-y-3">
        <div className="pixel-font text-red-400" style={{ fontSize: 8 }}>⚠️ EMERGENCY</div>
        <div className="text-xs text-text-muted">Initiates 72h timelock before funds can be withdrawn</div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-bg-secondary border border-red-400/30 rounded p-2 text-xs text-text"
            placeholder="Tournament numeric ID"
            id="emergency-id"
          />
          <button
            className="btn-primary text-xs px-3"
            style={{ background: '#ef4444' }}
            onClick={() => {
              const id = (document.getElementById('emergency-id') as HTMLInputElement).value
              if (!id) return
              if (!confirm('Initiate 72h emergency timelock?')) return
              exec('Emergency Initiate', () =>
                writeContractAsync({
                  address: VAULT_ADDRESS,
                  abi: VAULT_ABI,
                  functionName: 'initiateEmergencyWithdraw',
                  args: [BigInt(id)],
                })
              )
            }}
            disabled={loading}
          >
            INITIATE
          </button>
        </div>
      </div>
    </div>
  )
}

function getNextMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
