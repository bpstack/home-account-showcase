import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface CountUpProps {
  value: number;
  delay?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

const formatNumber = (num: number, decimals: number): string => {
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withSeparator = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${withSeparator},${decPart}` : withSeparator;
};

export const CountUp: React.FC<CountUpProps> = ({
  value,
  delay = 0,
  duration = 60,
  prefix = '',
  suffix = '',
  decimals = 2,
  className,
}) => {
  const frame = useCurrentFrame();

  const currentValue = interpolate(
    frame,
    [delay, delay + duration],
    [0, value],
    {
      extrapolateRight: 'clamp',
      extrapolateLeft: 'clamp',
    },
  );

  return (
    <span className={className}>
      {prefix}
      {formatNumber(currentValue, decimals)}
      {suffix}
    </span>
  );
};
