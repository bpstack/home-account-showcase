import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface StaggerChildrenProps {
  stagger?: number;
  children: React.ReactNode;
}

export const StaggerChildren: React.FC<StaggerChildrenProps> = ({
  stagger = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const childArray = React.Children.toArray(children);

  return (
    <>
      {childArray.map((child, index) => {
        const childDelay = index * stagger;
        const opacity = interpolate(
          frame,
          [childDelay, childDelay + 20],
          [0, 1],
          {
            extrapolateRight: 'clamp',
            extrapolateLeft: 'clamp',
          },
        );
        const translateY = interpolate(
          frame,
          [childDelay, childDelay + 20],
          [20, 0],
          {
            extrapolateRight: 'clamp',
            extrapolateLeft: 'clamp',
          },
        );

        return (
          <div
            key={index}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
            }}
          >
            {child}
          </div>
        );
      })}
    </>
  );
};
