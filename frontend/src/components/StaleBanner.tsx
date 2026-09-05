import { AlertIcon } from '../icons'
import { relative } from '../status'

interface Props {
  updatedAt: string
  staleRooms: number
  now: Date
}

export function StaleBanner({ updatedAt, staleRooms, now }: Props) {
  return (
    <div className="staleBanner">
      <AlertIcon width={16} height={16} />
      <span>
        Schedule refreshed {relative(updatedAt, now)}
        {staleRooms > 0 && `, ${staleRooms} room${staleRooms === 1 ? '' : 's'} not reporting`}.
        Some times shown may be out of date.
      </span>
    </div>
  )
}
