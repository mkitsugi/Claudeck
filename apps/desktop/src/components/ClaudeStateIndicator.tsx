import { Circle, Loader, MessageCircle } from 'lucide-react'
import type { ClaudeState } from '../types'

interface ClaudeStateIndicatorProps {
  state: ClaudeState
}

const STATE_CONFIG: Record<
  ClaudeState,
  {
    icon: typeof Circle
    label: string
    className: string
  }
> = {
  idle: {
    icon: Circle,
    label: 'Idle',
    className: 'state-idle',
  },
  processing: {
    icon: Loader,
    label: 'Processing',
    className: 'state-processing',
  },
  'waiting-input': {
    icon: MessageCircle,
    label: 'Waiting',
    className: 'state-waiting',
  },
}

export function ClaudeStateIndicator({ state }: ClaudeStateIndicatorProps) {
  const config = STATE_CONFIG[state]
  const Icon = config.icon

  return (
    <span className={`claude-state-indicator ${config.className}`} title={config.label}>
      <Icon size={12} />
      <span className="state-label">{config.label}</span>
    </span>
  )
}
