import React from 'react';
import { Ball } from './Ball';
import type { TubeData } from '../types/game';
import { Star } from 'lucide-react';

interface TubeProps {
  tube: TubeData;
  isSelected: boolean;
  onSelect: (id: number) => void;
  capacity: number;
  itemShape?: 'ball' | 'ring';
  lastMove?: {
    targetTubeId: number;
    count: number;
    timestamp: number;
  };
  lastCompletedTube?: {
    id: number;
    timestamp: number;
  };
}

export const Tube: React.FC<TubeProps> = ({ tube, isSelected, onSelect, capacity, itemShape = 'ball', lastMove, lastCompletedTube }) => {
  // itemHeightVar handles both ring and ball heights
  const itemHeightVar = itemShape === 'ring' ? 'var(--ring-h-mult)' : 'var(--tube-h-mult)';

  // Calculate how many top items of the same color to raise together
  let raiseCount = 0;
  if (isSelected && tube.balls.length > 0) {
    const topColor = tube.balls[tube.balls.length - 1];
    for (let i = tube.balls.length - 1; i >= 0; i--) {
      if (tube.balls[i] === topColor) raiseCount++;
      else break;
    }
  }

  // Top padding to ensure visually the empty space is occupied structurally
  const emptyCount = capacity - tube.balls.length;
  const padding = Array(emptyCount).fill(null);

  // Determine if some balls in this tube should fall
  const isTargetTube = lastMove?.targetTubeId === tube.id;
  
  // Fireworks Logic
  const showFireworks = lastCompletedTube?.id === tube.id && (Date.now() - lastCompletedTube.timestamp < 2000);
  const fireworkColor = tube.balls.length > 0 ? `var(--color-${tube.balls[0]})` : '#fff';

  return (
    <div
      onClick={() => onSelect(tube.id)}
      style={{
        width: 'var(--tube-w)',
        height: `calc(${capacity} * ${itemHeightVar} + 20px)`,
        border: '4px solid var(--tube-border)',
        borderTop: 'none',
        borderRadius: '0 0 32px 32px',
        backgroundColor: 'var(--tube-color)',
        display: 'flex',
        flexDirection: 'column-reverse', // Fill from bottom up
        justifyContent: 'flex-start',
        paddingBottom: '5px',
        margin: '0',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      {showFireworks && Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 100 + Math.random() * 120;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - 60;
        return (
          <Star 
            key={`fw-${i}-${lastCompletedTube?.timestamp}`}
            className="firework-particle"
            color={fireworkColor}
            fill={fireworkColor}
            size={30}
            style={{
              boxShadow: `0 0 25px ${fireworkColor}`,
              ['--x' as any]: `${x}px`,
              ['--y' as any]: `${y}px`
            }}
          />
        );
      })}

      {/* Render actual balls (bottom to top) */}
      {tube.balls.map((b: number, i: number) => {
        const isBeingRaised = i >= tube.balls.length - raiseCount;
        const isNewBall = isTargetTube && (i >= tube.balls.length - (lastMove?.count || 0));
        
        // Dynamic distance from top of tube to current position
        // Top of tube is at visually capacity-1 index.
        const fallHeight = `calc((${capacity - 1 - i}) * -${itemHeightVar})`;

        return (
          <div 
            key={isNewBall ? `ball-${i}-${lastMove?.timestamp}` : `ball-${i}`} 
            style={{ 
              height: itemHeightVar, 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center',
              transform: isBeingRaised ? 'translateY(-25px)' : 'none',
              transition: isBeingRaised ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              zIndex: isBeingRaised ? 10 : 1,
              animation: isNewBall ? `ball-fall 0.4s ease-out forwards` : 'none',
              ['--fall-distance' as any]: fallHeight
            }}
          >
            <Ball colorId={b} shape={itemShape} />
          </div>
        );
      })}

      {/* Invisible padding for the empty space (visual top) */}
      {padding.map((_, i: number) => (
        <div key={`pad-${i}`} style={{ height: itemHeightVar, width: '100%' }} />
      ))}
    </div>
  );
};
