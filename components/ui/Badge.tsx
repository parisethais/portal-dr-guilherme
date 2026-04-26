import { cn } from '@/lib/utils'

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  switch (status) {
    case 'pendente':
      return <Badge variant="yellow">Pendente</Badge>
    case 'em_andamento':
      return <Badge variant="blue">Em andamento</Badge>
    case 'resolvido':
      return <Badge variant="green">Resolvido</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}
