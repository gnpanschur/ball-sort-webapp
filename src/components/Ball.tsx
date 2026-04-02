import React from 'react';
import type { BallColor } from '../types/game';

interface BallProps {
  colorId: BallColor;
  shape?: 'ball' | 'ring';
}

const getZodiacSign = (id: number): string => {
  const signs: Record<number, string> = {
    1: '♈\uFE0E', // Widder
    2: '♉\uFE0E', // Stier
    3: '♊\uFE0E', // Zwillinge
    4: '♋\uFE0E', // Krebs
    5: '♌\uFE0E', // Löwe
    6: '♍\uFE0E', // Jungfrau
    7: '♎\uFE0E', // Waage
    8: '♏\uFE0E', // Skorpion
    9: '♐\uFE0E', // Schütze
    10: '♑\uFE0E', // Steinbock
    11: '♒\uFE0E', // Wassermann
    12: '♓\uFE0E', // Fische
  };
  return signs[id] || '';
};

export const Ball: React.FC<BallProps> = ({ colorId, shape = 'ball' }) => {
  const isRing = shape === 'ring';
  
  return (
    <div 
      className="ball" 
      style={{
        width: isRing ? '90%' : 'var(--ball-s)',
        height: isRing ? 'calc(var(--ring-h-mult) - 2px)' : 'var(--ball-s)',
        borderRadius: isRing ? '4px' : '50%',
        backgroundColor: `var(--color-${colorId})`,
        margin: isRing ? '1px auto' : 'var(--ball-margin)',
        boxShadow: isRing ? 'inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 3px rgba(0,0,0,0.4)' : 'inset -8px -8px 12px rgba(0,0,0,0.4), inset 5px 5px 12px rgba(255,255,255,0.4)',
        transition: 'all 0.3s ease',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: isRing ? '0px' : 'var(--ball-font)',
        textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
      }}
    >
      {!isRing && getZodiacSign(colorId)}
    </div>
  );
};
