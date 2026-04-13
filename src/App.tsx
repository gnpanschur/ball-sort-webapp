import { useState, useEffect, useRef } from 'react';
import levelsData from './levels/levels.json';
import type { LevelData, UserProfile, ThemeType, GameMode } from './types/game';
import { storageService } from './services/storageService';
import { useAudio } from './hooks/useAudio';
import { GameBoard } from './components/GameBoard';
import { Settings, Trophy, PlayCircle, X, Maximize, User } from 'lucide-react';

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
};


function App() {
  const [profile, setProfile] = useState<UserProfile>(storageService.getProfile());
  const [currentLevelId, setCurrentLevelId] = useState<number>(profile.highestLevel);
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'leaderboard' | 'settings' | 'completion'>('menu');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Bestätigen', cancelText = 'Abbrechen') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const { playClick, playWin, playPour, playTubeComplete, playCongratulations } = useAudio(profile);

  // Sync profile to storage and DOM
  useEffect(() => {
    storageService.saveProfile(profile);
    document.documentElement.setAttribute('data-theme', profile.theme);
  }, [profile]);

  // Track last played level when it changes in game view
  useEffect(() => {
    if (currentView === 'game' && currentLevelId !== profile.lastPlayedLevel) {
      setProfile(p => ({ ...p, lastPlayedLevel: currentLevelId }));
    }
  }, [currentLevelId, currentView, profile.lastPlayedLevel]);

  const currentLevel = levelsData.find((l) => l.id === currentLevelId) as LevelData;

  const handleLevelComplete = (moves: number, time: number) => {
    // Score submission only now (sound triggered early in onWin)    
    // Submit score
    storageService.submitScore(profile.playerName || 'Spieler1', currentLevelId, time, moves); 

    setProfile(p => ({
      ...p,
      highestLevel: Math.max(p.highestLevel, currentLevelId + 1 > levelsData.length ? levelsData.length : currentLevelId + 1),
      lastPlayedLevel: Math.max(p.lastPlayedLevel ?? 1, currentLevelId + 1 > levelsData.length ? levelsData.length : currentLevelId + 1),
      completedLevels: Array.from(new Set([...p.completedLevels, currentLevelId])),
      bestTimes: (!p.bestTimes[currentLevelId] || p.bestTimes[currentLevelId] > time) 
        ? { ...p.bestTimes, [currentLevelId]: time } 
        : p.bestTimes,
      bestMoves: (!p.bestMoves[currentLevelId] || p.bestMoves[currentLevelId] > moves)
        ? { ...p.bestMoves, [currentLevelId]: moves }
        : p.bestMoves
    }));
  };

  const handleTimeUpdate = (seconds: number) => {
    setProfile(p => ({
      ...p,
      totalTimePerLevel: {
        ...p.totalTimePerLevel,
        [currentLevelId]: (p.totalTimePerLevel[currentLevelId] || 0) + seconds
      }
    }));
  };

  const handleNextLevel = () => {
    playClick();
    if (currentLevelId < levelsData.length) {
      setCurrentLevelId(currentLevelId + 1);
    } else {
      setCurrentView('completion');
    }
  };

  // Open name dialog to collect name; optionally navigate to game after saving
  const openNameDialog = () => {
    setNameInput(profile.playerName || '');
    setShowNameDialog(true);
  };

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setProfile(p => ({ ...p, playerName: trimmed }));
    setShowNameDialog(false);
  };


  const handleRestartFromZero = () => {
    showConfirm(
      'Neustart?',
      'Möchtest du wirklich ganz von vorne anfangen? Dein gesamter Fortschritt und deine Spielzeit werden gelöscht.',
      () => {
        playClick();
        storageService.clearLeaderboard();
        setProfile(p => ({
          ...p,
          highestLevel: 1,
          lastPlayedLevel: 1,
          completedLevels: [],
          totalTimePerLevel: {},
          bestTimes: {},
          bestMoves: {}
        }));
        setCurrentLevelId(1);
        setCurrentView('game');
      },
      'Ganz von vorne anfangen'
    );
  };

  const handleResetGame = () => {
    showConfirm(
      'Alles zurücksetzen?',
      'Möchtest du das Spiel wirklich komplett zurücksetzen? Dein gesamter Fortschritt geht verloren.',
      () => {
        playClick();
        storageService.resetAllData();
        const freshProfile = storageService.getProfile();
        setProfile(freshProfile);
        setCurrentLevelId(freshProfile.highestLevel);
        setCurrentView('menu');
      },
      'Jetzt zurücksetzen'
    );
  };

  // Name Dialog Modal
  const NameDialog = () => (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999
    }}>
      <div style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--tube-border)',
        borderRadius: '20px',
        padding: '36px 32px',
        maxWidth: '380px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        <User size={48} style={{ marginBottom: '16px', color: 'white' }} />
        <h2 style={{ marginBottom: '10px', fontSize: '1.6rem' }}>Wie heißt du?</h2>
        <p style={{ opacity: 0.7, marginBottom: '24px', fontSize: '0.95rem' }}>Dein Name erscheint in der Rangliste.</p>
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveName()}
          placeholder="Dein Name..."
          autoFocus
          maxLength={20}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '1.2rem',
            borderRadius: '12px',
            border: '2px solid var(--tube-border)',
            background: 'var(--bg-color)',
            color: 'var(--text-color)',
            outline: 'none',
            marginBottom: '20px',
            textAlign: 'center'
          }}
        />
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {profile.playerName && (
            <button
              onClick={() => { setShowNameDialog(false); }}
              style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--panel-bg)', border: '1px solid var(--tube-border)', fontSize: '1rem' }}
            >
              Abbrechen
            </button>
          )}
          <button
            onClick={saveName}
            disabled={!nameInput.trim()}
            style={{ padding: '12px 28px', borderRadius: '12px', background: 'var(--btn-bg)', fontSize: '1rem', fontWeight: 'bold', opacity: nameInput.trim() ? 1 : 0.5 }}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );

  // Custom Confirm Dialog Modal
  const ConfirmDialog = () => {
    if (!confirmConfig.isOpen) return null;

    return (
      <div className="animate-fade-in" style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100
      }}>
        <div className="animate-scale-in" style={{
          background: 'rgba(25, 25, 35, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '28px',
          padding: '44px 36px',
          maxWidth: '440px',
          width: '92%',
          textAlign: 'center',
          boxShadow: '0 30px 70px rgba(0,0,0,0.8)',
          position: 'relative'
        }}>
          <h2 style={{ fontSize: '2.1rem', marginBottom: '16px', color: 'white', fontWeight: '800' }}>{confirmConfig.title}</h2>
          <p style={{ fontSize: '1.05rem', marginBottom: '36px', opacity: 0.85, lineHeight: '1.6', color: 'white' }}>{confirmConfig.message}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={confirmConfig.onConfirm}
              style={{
                padding: '18px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ff3b6b, #ff0844)',
                color: 'white',
                fontSize: '1.15rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 8px 20px rgba(255, 8, 68, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {confirmConfig.confirmText}
            </button>
            <button
              onClick={() => { playClick(); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }}
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'white',
                fontSize: '1.05rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'white'; }}
            >
              {confirmConfig.cancelText}
            </button>
          </div>
        </div>
      </div>
    );
  };

    const LeaderboardView = () => {
      const records = storageService.getLeaderboard().filter(r => r.levelId === currentLevelId);
      const scrollRef = useRef<HTMLDivElement>(null);
      const [sliderValue, setSliderValue] = useState(0);
      const totalLevels = levelsData.length;

      const totalSeconds = Object.values(profile.totalTimePerLevel).reduce((sum, sec) => sum + sec, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const totalTimeStr = `${h > 0 ? h + 'h ' : ''}${pad(m)}m ${pad(s)}s`;

      // Sync range slider -> scroll
      const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        setSliderValue(val);
        if (scrollRef.current) {
          const max = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
          scrollRef.current.scrollLeft = (val / 100) * max;
        }
      };

      // Sync scroll -> range slider
      const handleScroll = () => {
        if (scrollRef.current) {
          const max = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
          if (max > 0) setSliderValue(Math.round((scrollRef.current.scrollLeft / max) * 100));
        }
      };

      return (
        <div style={{ padding: '20px', width: '100%', maxWidth: '600px', margin: '0 auto', background: 'var(--panel-bg)', borderRadius: '16px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '5px' }}>Rangliste (Level {currentLevelId})</h2>
          <div style={{ textAlign: 'center', marginBottom: '15px', opacity: 0.9, fontSize: '0.9rem', color: 'white' }}>
            Deine gesamte Spielzeit: <strong>{totalTimeStr}</strong>
          </div>

        {/* Level buttons with hidden overflow, controlled by slider */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', marginBottom: '8px', scrollbarWidth: 'none' }}
        >
          {Array.from({length: totalLevels}).map((_, i) => (
             <button key={i} onClick={() => { playClick(); setCurrentLevelId(i+1); }} style={{ padding: '8px 16px', flexShrink: 0, background: currentLevelId === i + 1 ? 'var(--btn-bg-hover)' : 'var(--btn-bg)', borderRadius: '8px', fontWeight: 'bold' }}>
               L{i+1}
             </button>
          ))}
        </div>

        {/* Green range slider */}
        <input
          type="range"
          min="0" max="100"
          value={sliderValue}
          onChange={handleSlider}
          className="big-slider"
        />

        {records.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '350px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
                   <th style={{ padding: '10px 5px' }}>Spieler</th><th style={{ padding: '10px 5px' }}>Zeit</th><th style={{ padding: '10px 5px' }}>Züge</th><th style={{ padding: '10px 5px' }}>Datum</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '10px 5px' }}>{r.playerName}</td><td style={{ padding: '10px 5px' }}>{r.time}s</td><td style={{ padding: '10px 5px' }}>{r.moves}</td><td style={{ padding: '10px 5px' }}>{new Date(r.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{ textAlign: 'center', margin: '20px 0' }}>Noch keine Einträge für dieses Level.</p>}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            onClick={() => { playClick(); setCurrentView('menu'); }}
            style={{ padding: '10px 20px', fontSize: '1.2rem', background: 'var(--btn-bg)', borderRadius: '12px' }}
          >
            Rangliste schließen
          </button>
        </div>
      </div>
    );
  };

  const SettingsView = () => (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', background: 'var(--panel-bg)', borderRadius: '16px' }}>
      <h2>Einstellungen</h2>
      
      <div style={{ margin: '20px 0' }}>
        <h3>Design</h3>
        <select 
           value={profile.theme} 
           onChange={e => { playClick(); setProfile({...profile, theme: e.target.value as ThemeType}); }}
           style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--tube-border)' }}
        >
          <option value="ball">Klassische Bälle</option>
          <option value="glass">Glaskugeln</option>
          <option value="neon">Neon</option>
          <option value="gems">Edelsteine</option>
          <option value="casino">Casino (Grün)</option>
        </select>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h3>Spielmodus</h3>
        <select 
           value={profile.gameMode} 
           onChange={e => { playClick(); setProfile({...profile, gameMode: e.target.value as GameMode}); }}
           style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--tube-border)' }}
        >
          <option value="relaxed">Entspannt (ohne Zeitlimit)</option>
          <option value="timed">Auf Zeit (Schwer)</option>
        </select>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h3>Hintergrund</h3>
        <select 
           value={profile.background || 'default'} 
           onChange={e => { playClick(); setProfile({...profile, background: e.target.value}); }}
           style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--tube-border)', width: '100%', maxWidth: '300px' }}
        >
          <option value="Grün01.webp">Standard (Grün 1)</option>
          <option value="Grün02.webp">Grün 2</option>
          <option value="Rot.webp">Rot</option>
          <option value="Violett.webp">Violett</option>
        </select>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h3>Audio</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox" 
            checked={profile.audioEnabled} 
            onChange={e => { playClick(); setProfile({...profile, audioEnabled: e.target.checked}); }}
            style={{ width: '24px', height: '24px' }}
          /> Soundeffekte aktivieren
        </label>
        <input 
           type="range" min="0" max="1" step="0.1" 
           value={profile.audioVolume} 
           onChange={e => setProfile({...profile, audioVolume: parseFloat(e.target.value)})}
           style={{ display: 'block', marginTop: '10px' }}
        />
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={() => { playClick(); setCurrentView('menu'); }}
          style={{ padding: '10px 20px', fontSize: '1.2rem', background: 'var(--btn-bg)', borderRadius: '12px' }}
        >
          Einstellungen schließen
        </button>
      </div>
    </div>
  );

  const CompletionView = () => {
    const totalSeconds = Object.values(profile.totalTimePerLevel).reduce((sum, sec) => sum + sec, 0);

    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ---- Fireworks canvas effect (5 seconds) ----
    useEffect(() => {
      playCongratulations();

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      type Particle = {
        x: number; y: number; vx: number; vy: number;
        alpha: number; color: string; size: number;
      };
      const COLORS = [
        '#ffd700','#ff4e50','#f9d423','#00e5ff',
        '#ff6ec7','#39ff14','#ff8c00','#b47fff',
      ];
      const particles: Particle[] = [];

      const launch = () => {
        const x = Math.random() * canvas.width;
        const y = (0.1 + Math.random() * 0.45) * canvas.height;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = 80 + Math.floor(Math.random() * 60);
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const speed = 2 + Math.random() * 5;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
            size: 2 + Math.random() * 3,
          });
        }
      };

      // Launch immediately then every ~600ms
      launch();
      const launchInterval = setInterval(launch, 600);

      let animId: number;
      const draw = () => {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.07; // gravity
          p.vx *= 0.98;
          p.alpha -= 0.016;

          if (p.alpha <= 0) { particles.splice(i, 1); continue; }

          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        animId = requestAnimationFrame(draw);
      };
      animId = requestAnimationFrame(draw);

      // Stop launching after 5 seconds; let remaining particles fade out
      const stopTimeout = setTimeout(() => {
        clearInterval(launchInterval);
      }, 5000);

      return () => {
        window.removeEventListener('resize', resize);
        clearInterval(launchInterval);
        clearTimeout(stopTimeout);
        cancelAnimationFrame(animId);
      };
    }, []);
    // ---- End fireworks ----

    const pad = (n: number) => String(n).padStart(2, '0');

    return (
      <div style={{ position: 'relative', width: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Fireworks canvas – fills the entire viewport behind the card */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Congratulations card */}
        <div className="animate-scale-in completion-card" style={{ position: 'relative', zIndex: 1 }}>

          <div className="animate-float" style={{ marginBottom: '16px' }}>
            <Trophy size={80} color="white" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.7))' }} />
          </div>

          <h1 className="animate-shine completion-title">
            Gratulation!! 🎉
          </h1>

          <p className="completion-subtitle">
            Du hast alle Levels geschafft!
          </p>

          {/* Total time big display */}
          <div className="completion-time-hero">
            <span className="completion-time-value" style={{ color: 'white' }}>
              {days > 0 && <>{days}d&nbsp;</>}
              {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </span>
            <span className="completion-time-label">Gesamte Spielzeit</span>
          </div>

          {/* Time breakdown grid */}
          <div className="completion-grid">
            {[
              { label: 'Tage',  value: days    },
              { label: 'Std.',  value: hours   },
              { label: 'Min.',  value: minutes },
              { label: 'Sek.', value: seconds  },
            ].map((item, i) => (
              <div key={i} className="animate-fade-in-scale completion-cell"
                style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className="completion-cell-value" style={{ color: 'white' }}>{item.value}</div>
                <div className="completion-cell-label">{item.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <button
              className="completion-btn"
              onClick={() => { playClick(); setCurrentView('menu'); }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
            >
              Zurück zum Menü
            </button>

            <button
              className="reset-game-btn"
              onClick={handleResetGame}
            >
              Spiel komplett zurücksetzen
            </button>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="app-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      width: '100vw',
      backgroundImage: `url('/Bilder/${profile.background || 'Grün01.webp'}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundColor: 'var(--bg-color)'
    }}>
      <header className="app-header" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '40px' }}>
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)', 
            width: '3px', 
            height: '3px', 
            backgroundColor: 'white', 
            borderRadius: '50%', 
            opacity: 0.3,
            pointerEvents: 'none' 
          }} />
          <select 
            value={currentView === 'completion' ? 'completion' : currentLevelId} 
            onChange={(e) => { 
              if (e.target.value === 'completion') {
                setCurrentView('completion');
              } else {
                const id = parseInt(e.target.value);
                setCurrentLevelId(id);
                setCurrentView('game');
              }
              playClick();
            }}
            style={{ 
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 10
            }}
          >
            {levelsData.map(l => (
              <option key={l.id} value={l.id}>Level {l.id}</option>
            ))}
            <option value="completion">🎉 Congratulations</option>
          </select>
        </div>
        <h1 className="header-title">Ball Sort</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button 
            onClick={toggleFullscreen} 
            title="Vollbild" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--panel-bg)', padding: '8px', borderRadius: '50%', color: 'var(--text-color)', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid var(--tube-border)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--panel-bg)'}
          >
            <Maximize size={24} />
          </button>
          <button onClick={() => { playClick(); setCurrentView('menu'); }} aria-label="Menü" style={{ background: currentView === 'menu' ? 'var(--btn-bg)' : 'transparent', padding: '10px 15px', borderRadius: '12px', transition: 'background 0.2s' }}>
            Menü
          </button>
          <button 
            onClick={() => { playClick(); window.close(); }} 
            aria-label="Beenden" 
            title="Spiel Beenden" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 50, 50, 0.2)', padding: '8px', borderRadius: '50%', color: 'white', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid rgba(255, 50, 50, 0.5)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.6)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.2)'}
          >
            <X size={24} />
          </button>
        </div>
      </header>

      <main className="main-content">
        {currentView === 'menu' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '400px' }}>
            {profile.playerName ? (
              <div style={{ marginBottom: '10px' }}>
                <p style={{ fontSize: '1.1rem', opacity: 0.7, marginBottom: '4px' }}>Willkommen zurück</p>
                <h1 style={{ fontSize: '2.6rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Hallo {profile.playerName}! 👋</h1>
                <button
                  onClick={openNameDialog}
                  style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.5, textDecoration: 'underline', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer' }}
                >
                  Name ändern
                </button>
              </div>
            ) : (
              <h1 style={{ fontSize: '3rem', marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Hauptmenü</h1>
            )}

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '15px', 
              borderRadius: '16px', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '10px'
            }}>
              <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '4px' }}>Aktueller Fortschritt</p>
              <h2 style={{ fontSize: '1.8rem', color: 'white' }}>Level {profile.lastPlayedLevel || profile.highestLevel}</h2>
            </div>

            <button 
              onClick={() => { playClick(); setCurrentLevelId(profile.lastPlayedLevel || profile.highestLevel); setCurrentView('game'); }} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.5rem', padding: '20px', background: 'var(--btn-bg)', borderRadius: '16px', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', marginBottom: '10px' }}
            >
              <PlayCircle size={32} /> Jetzt Spielen
            </button>

            
            {profile.highestLevel > 1 && (
              <button 
                onClick={handleRestartFromZero} 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', padding: '15px', background: 'var(--panel-bg)', border: '2px solid var(--tube-border)', borderRadius: '12px', marginTop: '-10px' }}
              >
                <PlayCircle size={24} /> Von Level 1 beginnen
              </button>
            )}
            
            <button 
              onClick={() => { playClick(); setCurrentView('leaderboard'); }} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', padding: '15px', background: 'var(--panel-bg)', border: '2px solid var(--tube-border)', borderRadius: '12px' }}
            >
              <Trophy size={24} /> Rangliste
            </button>

            <button 
              onClick={() => { playClick(); setCurrentView('settings'); }} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', padding: '15px', background: 'var(--panel-bg)', border: '2px solid var(--tube-border)', borderRadius: '12px' }}
            >
              <Settings size={24} /> Einstellungen
            </button>

            {!profile.playerName && (
              <button 
                onClick={() => { playClick(); openNameDialog(); }} 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', padding: '15px', background: 'var(--panel-bg)', border: '2px solid var(--tube-border)', borderRadius: '12px' }}
              >
                <User size={24} /> Name eingeben
              </button>
            )}

          </div>
        )}

        {currentView === 'game' && currentLevel && (
          <GameBoard 
             key={currentLevelId}
             level={{
               ...currentLevel, 
               timeLimitSeconds: profile.gameMode === 'relaxed' ? undefined : currentLevel.timeLimitSeconds
             }} 
             onLevelComplete={handleLevelComplete} 
             onNextLevel={handleNextLevel} 
             onMove={playPour}
             onTubeComplete={playTubeComplete}
             onWin={playWin}
             onTimeUpdate={handleTimeUpdate}
             onExit={() => { playClick(); setCurrentView('menu'); }}
          />
        )}

        {currentView === 'leaderboard' && <LeaderboardView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'completion' && <CompletionView />}
      </main>
      {showNameDialog && <NameDialog />}
      <ConfirmDialog />
    </div>
  );
}

export default App;
