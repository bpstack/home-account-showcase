import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface FadeInProps {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}

export const FadeIn: React.FC<FadeInProps> = ({
  delay = 0,
  duration = 30,
  children,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp',
  });

  return <div style={{ opacity }}>{children}</div>;
};
