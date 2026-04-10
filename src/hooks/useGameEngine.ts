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
      history: [],
      lastMove: undefined,
      lastCompletedTube: undefined
    });
    setSelectedTubeId(null);
  }, [level.id]); // Reload on level change

  // Check Win Condition
  useEffect(() => {
    if (gameState.status !== 'playing' || gameState.tubes.length === 0) return;

    let isWin = true;
    
    // Count total required balls for each color in the level
    const colorCounts: Record<number, number> = {};
    level.initialTubes.forEach(t => t.balls.forEach(b => {
      let realColor = Math.abs(b);
      if (realColor > 1000) realColor %= 1000;
      colorCounts[realColor] = (colorCounts[realColor] || 0) + 1;
    }));

    // Group current tubes by their contents
    const tubeContents: Record<number, { count: number; capacity: number; isPure: boolean }[]> = {};
    for (const t of gameState.tubes) {
      if (t.balls.length > 0) {
        let firstColor = t.balls[0];
        const isPure = t.balls.every(b => b === firstColor && b > 0 && b <= 1000);
        
        firstColor = Math.abs(firstColor);
        if (firstColor > 1000) firstColor %= 1000;

        const capacity = (level.horizontalTubeId === t.id) 
           ? (level.horizontalTubeCapacity ?? level.tubeCapacity) 
           : level.tubeCapacity;

        if (!tubeContents[firstColor]) tubeContents[firstColor] = [];
        tubeContents[firstColor].push({ count: t.balls.length, capacity, isPure });
      }
    }

    // Check every color present in the level
    for (const colorStr of Object.keys(colorCounts)) {
      const color = parseInt(colorStr);
      const totalBalls = colorCounts[color];
      const colorTubes = tubeContents[color] || [];

      // Every ball of this color must be in a PURE tube
      if (!colorTubes.every(ct => ct.isPure)) {
        isWin = false;
        break;
      }

      // Check if total balls in pure tubes match total balls in level
      const ballsInPureTubes = colorTubes.reduce((sum, ct) => sum + ct.count, 0);
      if (ballsInPureTubes !== totalBalls) {
        isWin = false; // Some balls are in mixed tubes or elsewhere
        break;
      }

      // Verify colors are "Optimally Stacked"
      // They must fill as many tubes as possible to their maximum capacity.
      let remainingBalls = totalBalls;
      // Sort tubes by capacity (descending) to fill the largest ones first?
      // Actually, any full tube works.
      const sortedTubes = [...colorTubes].sort((a, b) => b.count - a.count);
      
      for (const ct of sortedTubes) {
        const fillAmount = Math.min(remainingBalls, level.winHeight || ct.capacity);
        if (ct.count !== fillAmount) {
          isWin = false;
          break;
        }
        remainingBalls -= fillAmount;
      }
      
      if (!isWin || remainingBalls > 0) {
        isWin = false;
        break;
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
        const topBall = sourceTube.balls[sourceTube.balls.length - 1];
        if (topBall < 0 || topBall > 1000) return; // Cannot pick up a covered or locked ball directly
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
        if (topBallColor > 1000) {
           setSelectedTubeId(null);
           return prevState; // Edge case, cannot move a locked ball
        }
        
        // Count how many connected balls of the same color are on top
        let movableCount = 0;
        if (level.moveSingleBallOnly) {
            movableCount = 1;
        } else {
            for (let i = sourceTube.balls.length - 1; i >= 0; i--) {
                if (sourceTube.balls[i] === topBallColor) movableCount++;
                else break;
            }
        }

        const targetMaxCapacity = (level.horizontalTubeId === targetTube.id) 
            ? (level.horizontalTubeCapacity ?? level.tubeCapacity) 
            : level.tubeCapacity;
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
           
           // Automatically reveal the new top ball in source tube
           if (sourceTube.balls.length > 0 && sourceTube.balls[sourceTube.balls.length - 1] < 0) {
             sourceTube.balls[sourceTube.balls.length - 1] = Math.abs(sourceTube.balls[sourceTube.balls.length - 1]);
           }
           
           // Check if targetTube is now complete
           const isComplete = targetTube.balls.length === targetMaxCapacity && 
                              targetTube.balls.every(b => b === topBallColor && b > 0 && b <= 1000);

           let finalTubes = newTubes;
           if (isComplete) {
               finalTubes = newTubes.map(t => ({
                   ...t,
                   balls: t.balls.map(b => b > 1000 ? b % 1000 : b)
               }));
           }

           return {
             ...prevState,
             tubes: finalTubes,
             moves: prevState.moves + 1,
             history: [...prevState.history, prevState.tubes],
             lastMove: {
                targetTubeId: id,
                count: ballsToMove,
                timestamp: Date.now()
             },
             lastCompletedTube: isComplete ? { id, timestamp: Date.now() } : prevState.lastCompletedTube
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
      history: [],
      lastMove: undefined,
      lastCompletedTube: undefined
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
        
        if (newBalls.length > 0 && newBalls[newBalls.length - 1] < 0) {
          newBalls[newBalls.length - 1] = Math.abs(newBalls[newBalls.length - 1]);
        }
        
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
