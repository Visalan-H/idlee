import type { ReactNode } from 'react'
import { CompassIcon } from '../icons'

interface Props {
  title: string
  children?: ReactNode
}

export function EmptyState({ title, children }: Props) {
  return (
    <div className="emptyState">
      <CompassIcon width={28} height={28} />
      <div className="emptyState-title">{title}</div>
      {children && <div className="emptyState-body">{children}</div>}
    </div>
  )
}
