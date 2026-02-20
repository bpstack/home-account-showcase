import React from 'react';
import { useCurrentFrame } from 'remotion';

interface TypewriterTextProps {
  text: string;
  startFrame?: number;
  charsPerFrame?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame = 0,
  charsPerFrame = 1.5,
  style,
  className,
}) => {
  const frame = useCurrentFrame();

  const elapsed = Math.max(0, frame - startFrame);
  const visibleChars = Math.min(
    Math.floor(elapsed * charsPerFrame),
    text.length,
  );
  const displayedText = text.slice(0, visibleChars);

  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showCursor = visibleChars < text.length || cursorVisible;

  return (
    <span style={style} className={className}>
      {displayedText}
      {showCursor && (
        <span
          style={{
            borderRight: '2px solid currentColor',
            marginLeft: 1,
          }}
        />
      )}
    </span>
  );
};
