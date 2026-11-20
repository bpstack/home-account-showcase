import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
import { enter } from '../../design/motion'
import { Caption } from './Caption'
import type { IconName } from './Icon'
import { Phone, PHONE } from './Phone'

/** Phone size in the 1080×1920 video, under the caption. */
export const MOBILE_STAGE = { top: 420, scale: 1.62 } as const
const OUTER_W = PHONE.width + 24

/** The caption of a vertical scene: same as the desktop one, larger. */
export const MobileCaption: React.FC<{ eyebrow: string; icon: IconName; title: string; description?: string; top?: number }> = ({
  top = 120,
  ...props
}) => <Caption {...props} size={1.5} style={{ position: 'absolute', top, left: 70, right: 70 }} />

/** A phone running the app, rising in under the caption and then still (see WindowStage). */
export const PhoneStage: React.FC<{
  title: string
  active: string
  children: React.ReactNode
  overlay?: React.ReactNode
  /** Drawn over the phone, in the phone's (scaled) coordinates */
  extra?: React.ReactNode
}> = ({ title, active, children, overlay, extra }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const rise = enter(frame, fps, 2)
  return (
    <div
      style={{
        position: 'absolute',
        top: MOBILE_STAGE.top,
        left: (width - OUTER_W * MOBILE_STAGE.scale) / 2,
        opacity: rise,
        transform: `translateY(${(1 - rise) * 80}px)`,
      }}
    >
      <Phone title={title} active={active} scale={MOBILE_STAGE.scale} overlay={overlay}>
        {children}
      </Phone>
      {extra}
    </div>
  )
}
