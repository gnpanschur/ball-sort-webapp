import React, { useEffect, useRef } from 'react';
import { Tube } from './Tube';
import { useGameEngine } from '../hooks/useGameEngine';
import type { LevelData } from '../types/game';
import { Undo2, RotateCcw, Play } from 'lucide-react';

interface GameBoardProps {
  level: LevelData;
  onLevelComplete: (moves: number, time: number) => void;
  onNextLevel: () => void;
  onMove?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ level, onLevelComplete, onNextLevel, onMove }) => {
  const { gameState, selectedTubeId, handleTubeClick, undoMove, restartLevel, setGameState } = useGameEngine(level, onMove);

  // Timer
  useEffect(() => {
    if (gameState.status !== 'playing') return;
    const interval = setInterval(() => {
      setGameState(s => ({ ...s, timeElapsed: s.timeElapsed + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState.status, setGameState]);

  const winTriggeredRef = useRef(false);

  useEffect(() => {
    if (gameState.status === 'playing') {
      winTriggeredRef.current = false;
    }
    if (gameState.status === 'won' && !winTriggeredRef.current) {
      winTriggeredRef.current = true;
      onLevelComplete(gameState.moves, gameState.timeElapsed);
    }
  }, [gameState.status, gameState.moves, gameState.timeElapsed, onLevelComplete]);

  return (
    <div className="gameboard-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', padding: '20px 0' }}>
      
      <h2 className="hud-level-title">
        Level {level.id}
      </h2>

      {/* HUD Bar */}
      <div className="game-hud">
        <div className="hud-text">
          Zeit: {gameState.timeElapsed}s {level.timeLimitSeconds && `/ ${level.timeLimitSeconds}s`}
        </div>
        <div className="hud-text">
          Züge: {gameState.moves}
        </div>
        <div className="hud-icons">
          <button className="hud-icon-btn" onClick={undoMove} disabled={gameState.history.length === 0} title="Rückgängig" style={{ color: gameState.history.length === 0 ? 'gray' : 'white' }}>
            <Undo2 />
          </button>
          <button className="hud-icon-btn" onClick={restartLevel} title="Neustart">
            <RotateCcw />
          </button>
        </div>
      </div>

      {/* Tubes Area */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--tube-gap)', marginTop: 'auto', marginBottom: 'auto' }}>
        {gameState.tubes.map(tube => (
          <Tube 
            key={tube.id} 
            tube={tube} 
            capacity={level.tubeCapacity} 
            isSelected={selectedTubeId === tube.id}
            onSelect={handleTubeClick}
            itemShape={level.itemShape}
          />
        ))}
      </div>

      {/* Win Modal */}
      {gameState.status === 'won' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)' }}>
          <h1 style={{ color: '#00ffcc', fontSize: '4rem', marginBottom: '20px', textShadow: '0 0 20px #00ffcc' }}>Level geschafft!</h1>
          <div style={{ fontSize: '1.8rem', marginBottom: '40px', textAlign: 'center' }}>
            <p>Züge: {gameState.moves}</p>
            <p>Zeit: {gameState.timeElapsed}s</p>
          </div>
          <button 
             onClick={onNextLevel} 
             style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', padding: '15px 40px', background: 'var(--btn-bg)', border: 'none', borderRadius: '12px', color: 'var(--btn-text)', cursor: 'pointer', transition: 'background 0.3s' }}
             onMouseEnter={e => e.currentTarget.style.background = 'var(--btn-bg-hover)'}
             onMouseLeave={e => e.currentTarget.style.background = 'var(--btn-bg)'}
          >
            Nächstes Level <Play />
          </button>
        </div>
      )}
    </div>
  );
}
