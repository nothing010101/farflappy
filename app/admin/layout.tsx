import { headers } from 'next/headers'
import { AdminProviders } from '@/components/admin/AdminProviders'

export const metadata = {
  title: 'FarFlappy Admin',
  robots: 'noindex, nofollow',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersObj = await headers()
  const cookies = headersObj.get('cookie')

  return (
    <AdminProviders cookies={cookies}>
      {children}
    </AdminProviders>
  )
}
