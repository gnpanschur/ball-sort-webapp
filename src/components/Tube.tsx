import React from 'react';
import { Ball } from './Ball';
import type { TubeData } from '../types/game';

interface TubeProps {
  tube: TubeData;
  isSelected: boolean;
  onSelect: (id: number) => void;
  capacity: number;
  itemShape?: 'ball' | 'ring';
}

export const Tube: React.FC<TubeProps> = ({ tube, isSelected, onSelect, capacity, itemShape = 'ball' }) => {
  // Top padding to ensure visually the empty space is occupied structurally (optional but helps fixed layout)
  const emptyCount = capacity - tube.balls.length;
  const padding = Array(emptyCount).fill(null);

  // Note: tube.balls is bottom-to-top (index 0 is bottom). We reverse array to render top-to-bottom
  const displayBalls = [...tube.balls].reverse();
  const itemHeightVar = itemShape === 'ring' ? 'var(--ring-h-mult)' : 'var(--tube-h-mult)';

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
        flexDirection: 'column',
        justifyContent: 'flex-start',
        paddingTop: '5px',
        margin: '0',
        cursor: 'pointer',
        transform: isSelected ? 'translateY(-20px)' : 'none',
        transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        boxShadow: isSelected ? '0px 15px 25px rgba(0,0,0,0.6)' : 'none',
        position: 'relative'
      }}
    >
      {/* Invisible padding for the empty space from top */}
      {padding.map((_, i) => (
        <div key={`pad-${i}`} style={{ height: itemHeightVar, width: '100%' }} />
      ))}
      
      {/* Render actual balls (top to bottom) */}
      {displayBalls.map((b, i) => (
        <div key={`ball-${i}`} style={{ height: itemHeightVar, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <Ball colorId={b} shape={itemShape} />
        </div>
      ))}
    </div>
  );
};
