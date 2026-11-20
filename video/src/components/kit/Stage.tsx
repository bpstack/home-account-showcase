import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONTS, COLORS } from '../../design/theme'
import { enter, sceneFade } from '../../design/motion'
import { AppWindow, WINDOW } from './AppWindow'
import { Backdrop } from './Caption'

/** A scene: the backdrop, the fade in and out, and the content on top. */
export const Scene: React.FC<{
  duration: number
  children: React.ReactNode
  glowX?: string
  glowY?: string
  glow?: number
}> = ({ duration, children, glowX, glowY, glow }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ opacity: sceneFade(frame, duration), fontFamily: FONTS.sans, color: COLORS.text }}>
      <Backdrop glowX={glowX} glowY={glowY} strength={glow} />
      {children}
    </AbsoluteFill>
  )
}

/** Where the window sits in the 1920×1080 video, under the caption. */
export const DESKTOP_STAGE = { top: 176, scale: 1.13 } as const
export const desktopWindowLeft = (videoWidth: number) => (videoWidth - WINDOW.width * DESKTOP_STAGE.scale) / 2

/**
 * The app window placed under the caption: it rises in and then stays still, so the text stays
 * sharp (a slow zoom resamples it every frame and starves the encoder).
 * `children` of the stage itself (cursor…) are drawn on top in video coordinates.
 */
export const WindowStage: React.FC<{
  url: string
  active: string
  title: string
  content: React.ReactNode
  overlay?: React.ReactNode
  padded?: boolean
  children?: React.ReactNode
}> = ({ url, active, title, content, overlay, padded, children }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const rise = enter(frame, fps, 2)
  const left = desktopWindowLeft(width)
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: DESKTOP_STAGE.top,
          left,
          opacity: rise,
          transform: `translateY(${(1 - rise) * 60}px)`,
        }}
      >
        <AppWindow url={url} active={active} title={title} scale={DESKTOP_STAGE.scale} overlay={overlay} padded={padded}>
          {content}
        </AppWindow>
        {children}
      </div>
    </>
  )
}
