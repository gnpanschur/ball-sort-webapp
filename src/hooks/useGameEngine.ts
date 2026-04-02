import { useState, useEffect, useCallback } from 'react';
import type { LevelData, TubeData, GameState } from '../types/game';

export function useGameEngine(level: LevelData, onMove?: () => void) {
  const [gameState, setGameState] = useState<GameState>({
    tubes: [],
    moves: 0,
    timeElapsed: 0,
    status: 'playing',
    history: []
  });

  const [selectedTubeId, setSelectedTubeId] = useState<number | null>(null);

  // Initialize Game
  useEffect(() => {
    setGameState({
      tubes: JSON.parse(JSON.stringify(level.initialTubes)), // Deep copy
      moves: 0,
      timeElapsed: 0,
      status: 'playing',
      history: []
    });
    setSelectedTubeId(null);
  }, [level.id]); // Reload on level change

  // Check Win Condition
  useEffect(() => {
    if (gameState.status !== 'playing' || gameState.tubes.length === 0) return;

    let isWin = true;
    const seenColors = new Set();
    
    for (const t of gameState.tubes) {
      if (t.balls.length > 0) {
        // Check if all balls in tube are the same color
        const firstColor = t.balls[0];
        if (!t.balls.every(b => b === firstColor)) {
          isWin = false;
          break;
        }
        
        // Check if we already saw this color in another tube
        if (seenColors.has(firstColor)) {
          isWin = false;
          break;
        }
        seenColors.add(firstColor);
      }
    }

    if (isWin) {
      setGameState(s => ({ ...s, status: 'won' }));
    }
  }, [gameState.tubes, level.tubeCapacity, gameState.status]);

  // Handle Tube Click Interactions
  const handleTubeClick = useCallback((id: number) => {
    if (gameState.status !== 'playing') return;

    if (selectedTubeId === null) {
      // Trying to pick up a ball
      const sourceTube = gameState.tubes.find(t => t.id === id);
      if (sourceTube && sourceTube.balls.length > 0) {
        setSelectedTubeId(id);
      }
    } else {
      // Trying to drop a ball
      if (selectedTubeId === id) {
        setSelectedTubeId(null); // Deselect
        return;
      }

      // Perform Move Validation
      setGameState(prevState => {
        const newTubes = JSON.parse(JSON.stringify(prevState.tubes)) as TubeData[];
        const sourceIndex = newTubes.findIndex(t => t.id === selectedTubeId);
        const targetIndex = newTubes.findIndex(t => t.id === id);
        
        const sourceTube = newTubes[sourceIndex];
        const targetTube = newTubes[targetIndex];

        if (sourceTube.balls.length === 0) {
           setSelectedTubeId(null);
           return prevState; // Edge case
        }

        const topBallColor = sourceTube.balls[sourceTube.balls.length - 1]; // Top ball
        
        // Count how many connected balls of the same color are on top
        let movableCount = 0;
        for (let i = sourceTube.balls.length - 1; i >= 0; i--) {
            if (sourceTube.balls[i] === topBallColor) movableCount++;
            else break;
        }

        const targetMaxCapacity = (level.id === 12 && targetTube.id === 8) ? 18 : level.tubeCapacity;
        const availableSpace = targetMaxCapacity - targetTube.balls.length;
        
        // Validation rules: target must have space AND (target is empty OR top ball matches)
        const canMove = availableSpace > 0 && 
                        (targetTube.balls.length === 0 || targetTube.balls[targetTube.balls.length - 1] === topBallColor);
        
        if (canMove) {
           // Move all contiguous balls, or as many as fit in the target
           const ballsToMove = Math.min(movableCount, availableSpace);
           for (let i = 0; i < ballsToMove; i++) {
             sourceTube.balls.pop();
             targetTube.balls.push(topBallColor);
           }
           
           if (onMove) {
             onMove();
           }
           
           return {
             ...prevState,
             tubes: newTubes,
             moves: prevState.moves + 1,
             history: [...prevState.history, prevState.tubes] // Save prev tubes for Undo
           };
        }
        
        // Invalid move: Do not update state
        return prevState;
      });
      
      setSelectedTubeId(null); // Deselect in any case (successful or invalid move usually drops selection)
    }
  }, [selectedTubeId, gameState, level.tubeCapacity]);

  const undoMove = () => {
     if (gameState.status !== 'playing' || gameState.history.length === 0) return;
     
     setGameState(prev => {
        const newHistory = [...prev.history];
        const previousTubes = newHistory.pop()!;
        return {
           ...prev,
           tubes: previousTubes,
           moves: Math.max(0, prev.moves - 1),
           history: newHistory
        };
     });
     setSelectedTubeId(null);
  };

  const restartLevel = () => {
    setGameState({
      tubes: JSON.parse(JSON.stringify(level.initialTubes)),
      moves: 0,
      timeElapsed: 0,
      status: 'playing',
      history: []
    });
    setSelectedTubeId(null);
  };

  const shuffleTubes = () => {
    if (gameState.status !== 'playing') return;
    setGameState(prev => {
      const allBalls: number[] = [];
      prev.tubes.forEach(t => allBalls.push(...t.balls));
      
      for (let i = allBalls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allBalls[i], allBalls[j]] = [allBalls[j], allBalls[i]];
      }

      let pos = 0;
      const newTubes = prev.tubes.map(t => {
        const len = t.balls.length;
        const newBalls = allBalls.slice(pos, pos + len);
        pos += len;
        return { ...t, balls: newBalls };
      });

      return {
        ...prev,
        tubes: newTubes,
        moves: prev.moves + 1,
        history: [...prev.history, prev.tubes]
      };
    });
    setSelectedTubeId(null);
  };

  return {
    gameState,
    selectedTubeId,
    handleTubeClick,
    undoMove,
    restartLevel,
    shuffleTubes,
    setGameState // Exported for timer updates
  };
}
