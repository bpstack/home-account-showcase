import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

interface SlideInProps {
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
  distance?: number;
  children: React.ReactNode;
}

export const SlideIn: React.FC<SlideInProps> = ({
  direction = 'up',
  delay = 0,
  distance = 50,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const translateMap: Record<string, string> = {
    up: `translateY(${(1 - progress) * distance}px)`,
    down: `translateY(${(1 - progress) * -distance}px)`,
    left: `translateX(${(1 - progress) * distance}px)`,
    right: `translateX(${(1 - progress) * -distance}px)`,
  };

  return (
    <div
      style={{
        opacity: progress,
        transform: translateMap[direction],
      }}
    >
      {children}
    </div>
  );
};
