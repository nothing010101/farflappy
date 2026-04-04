import { useWriteContract, useReadContract, useAccount } from 'wagmi'
import { parseUnits } from 'viem'

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_VAULT_ADDRESS as `0x${string}`
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`

const VAULT_ABI = [
  {
    name: 'enterTournament',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tournamentId', type: 'uint256' }],
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
    name: 'hasEntered',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tournamentId', type: 'uint256' },
      { name: 'player', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const ENTRY_FEE = parseUnits('0.5', 6) // 0.5 USDC

export function useTournament(tournamentId: number) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  // Read tournament info
  const { data: tournamentInfo, refetch: refetchInfo } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'getTournamentInfo',
    args: [BigInt(tournamentId)],
  })

  // Check if player already entered
  const { data: alreadyEntered, refetch: refetchEntered } = useReadContract({
    address: VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: 'hasEntered',
    args: [BigInt(tournamentId), address!],
    query: { enabled: !!address },
  })

  // Check USDC allowance
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, VAULT_ADDRESS],
    query: { enabled: !!address },
  })

  const enterTournament = async () => {
    if (!address) throw new Error('Wallet not connected')

    // Step 1: Approve USDC if needed
    const currentAllowance = allowance ?? BigInt(0)
    if (currentAllowance < ENTRY_FEE) {
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS, ENTRY_FEE],
      })
    }

    // Step 2: Enter tournament
    const tx = await writeContractAsync({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'enterTournament',
      args: [BigInt(tournamentId)],
    })

    await refetchInfo()
    await refetchEntered()

    return tx
  }

  return {
    tournamentInfo,
    alreadyEntered,
    enterTournament,
    prizePool: tournamentInfo ? Number(tournamentInfo[2]) / 1e6 : 0,
    participantCount: tournamentInfo ? Number(tournamentInfo[4]) : 0,
    isActive: tournamentInfo ? tournamentInfo[5] : false,
  }
}
