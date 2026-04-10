import React, { useEffect, useRef, useState } from 'react';
import { Tube } from './Tube';
import { useGameEngine } from '../hooks/useGameEngine';
import type { LevelData } from '../types/game';
import { Undo2, RotateCcw, Play, Shuffle } from 'lucide-react';

interface GameBoardProps {
  level: LevelData;
  onLevelComplete: (moves: number, time: number) => void;
  onNextLevel: () => void;
  onMove?: () => void;
  onTubeComplete?: () => void;
  onWin?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ level, onLevelComplete, onNextLevel, onMove, onTubeComplete, onWin }) => {
  const { gameState, selectedTubeId, handleTubeClick, undoMove, restartLevel, shuffleTubes, setGameState } = useGameEngine(level, onMove);
  const [showWinModal, setShowWinModal] = useState(false);

  // Trigger tube complete sound
  useEffect(() => {
    if (gameState.lastCompletedTube && onTubeComplete) {
      onTubeComplete();
    }
  }, [gameState.lastCompletedTube, onTubeComplete]);

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
      setShowWinModal(false);
    }
    if (gameState.status === 'won' && !winTriggeredRef.current) {
      winTriggeredRef.current = true;
      
      // Trigger the "Win started" sound/event immediately
      if (onWin) onWin();

      // Start a 3-second delay before showing the "Level Complete" modal
      const timer = setTimeout(() => {
        setShowWinModal(true);
        onLevelComplete(gameState.moves, gameState.timeElapsed);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.moves, gameState.timeElapsed, onLevelComplete]);

  return (
    <div className="gameboard-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', padding: '20px 0' }}>
      
      <h2 className="hud-level-title">
        Level {level.id}
      </h2>

      {level.description && (
        <div className="level-description" style={{
           maxWidth: '80%', textAlign: 'center', marginBottom: '15px', 
           color: 'rgba(255, 255, 255, 0.9)', fontSize: '1.05rem',
           background: 'rgba(0,0,0,0.3)', padding: '10px 15px', borderRadius: '8px',
           boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
        }}>
          {level.description}
        </div>
      )}

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
          <button className="hud-icon-btn" onClick={shuffleTubes} title="Röhrchen neu mischen">
            <Shuffle />
          </button>
        </div>
      </div>

      {/* Tubes Area */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 'var(--tube-gap)', 
        marginTop: 'auto', 
        marginBottom: level.horizontalTubeId ? '0' : 'auto' 
      }}>
        {gameState.tubes.filter(t => t.id !== level.horizontalTubeId).map(tube => (
          <Tube 
            key={tube.id} 
            tube={tube} 
            capacity={level.tubeCapacity} 
            isSelected={selectedTubeId === tube.id}
            onSelect={handleTubeClick}
            itemShape={level.itemShape}
            lastMove={gameState.lastMove}
            lastCompletedTube={gameState.lastCompletedTube}
          />
        ))}
      </div>

      {/* Optional Horizontal Tube (Generic) */}
      {level.horizontalTubeId && gameState.tubes.find(t => t.id === level.horizontalTubeId) && (
        <div style={{
           position: 'relative',
           width: `calc(${level.horizontalTubeCapacity ?? level.tubeCapacity} * var(--ring-h-mult) + 40px)`,
           height: 'var(--tube-w)',
           margin: '60px auto auto auto', 
           display: 'flex',
           justifyContent: 'center',
           alignItems: 'center'
        }}>
           <div style={{
              position: 'absolute',
              transform: 'rotate(-90deg)'
           }}>
              <Tube 
                tube={gameState.tubes.find(t => t.id === level.horizontalTubeId)!} 
                capacity={level.horizontalTubeCapacity ?? level.tubeCapacity} 
                isSelected={selectedTubeId === level.horizontalTubeId}
                onSelect={handleTubeClick}
                itemShape={level.itemShape}
                lastMove={gameState.lastMove}
                lastCompletedTube={gameState.lastCompletedTube}
              />
           </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(5px)', padding: '20px' }}>
          <h1 style={{ color: '#00ffcc', fontSize: '4rem', marginBottom: '20px', textShadow: '0 0 20px #00ffcc', textAlign: 'center', lineHeight: '1.2' }}>Level geschafft!</h1>
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
