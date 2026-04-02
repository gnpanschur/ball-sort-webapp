import { useState, useEffect } from 'react';
import levelsData from './levels/levels.json';
import type { LevelData, UserProfile, ThemeType, GameMode } from './types/game';
import { storageService } from './services/storageService';
import { useAudio } from './hooks/useAudio';
import { GameBoard } from './components/GameBoard';
import { Settings, Trophy, PlayCircle, Power, X, Maximize } from 'lucide-react';

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
  const [currentView, setCurrentView] = useState<'menu' | 'game' | 'leaderboard' | 'settings'>('menu');

  const { playClick, playWin, playPour } = useAudio(profile);

  // Sync profile to storage and DOM
  useEffect(() => {
    storageService.saveProfile(profile);
    document.documentElement.setAttribute('data-theme', profile.theme);
  }, [profile]);

  const currentLevel = levelsData.find((l) => l.id === currentLevelId) as LevelData;

  const handleLevelComplete = (moves: number, time: number) => {
    playWin();
    
    // Submit score
    storageService.submitScore('Spieler1', currentLevelId, time, moves); 

    setProfile(p => {
      const isNewBestTime = !p.bestTimes[currentLevelId] || p.bestTimes[currentLevelId] > time;
      const isNewBestMoves = !p.bestMoves[currentLevelId] || p.bestMoves[currentLevelId] > moves;
      
      const newHighest = Math.max(p.highestLevel, currentLevelId + 1 > levelsData.length ? levelsData.length : currentLevelId + 1);
      
      return {
        ...p,
        highestLevel: newHighest,
        completedLevels: Array.from(new Set([...p.completedLevels, currentLevelId])),
        bestTimes: isNewBestTime ? { ...p.bestTimes, [currentLevelId]: time } : p.bestTimes,
        bestMoves: isNewBestMoves ? { ...p.bestMoves, [currentLevelId]: moves } : p.bestMoves
      };
    });
  };

  const handleNextLevel = () => {
    playClick();
    if (currentLevelId < levelsData.length) {
      setCurrentLevelId(currentLevelId + 1);
    } else {
      setCurrentView('menu'); // Game Finished basically
    }
  };

  const LeaderboardView = () => {
    const records = storageService.getLeaderboard().filter(r => r.levelId === currentLevelId);
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', background: 'var(--panel-bg)', borderRadius: '16px' }}>
        <h2>Rangliste (Level {currentLevelId})</h2>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px' }}>
          {Array.from({length: levelsData.length}).map((_, i) => (
             <button key={i} onClick={() => { playClick(); setCurrentLevelId(i+1); }} style={{ padding: '5px 15px', background: currentLevelId === i + 1 ? 'var(--btn-bg-hover)' : 'var(--btn-bg)', borderRadius: '8px' }}>
               L{i+1}
             </button>
          ))}
        </div>
        {records.length > 0 ? (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid gray' }}>
                 <th>Spieler</th><th>Zeit</th><th>Züge</th><th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 20).map((r, i) => (
                <tr key={i}>
                  <td>{r.playerName}</td><td>{r.time}s</td><td>{r.moves}</td><td>{new Date(r.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Noch keine Einträge für dieses Level.</p>}
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
    </div>
  );

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <header className="app-header">
        <h1 className="header-title">Ball Sort</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 50, 50, 0.2)', padding: '8px', borderRadius: '50%', color: '#ff3366', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid rgba(255, 50, 50, 0.5)' }}
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
            <h1 style={{ fontSize: '3rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Hauptmenü</h1>
            
            <button 
              onClick={() => { playClick(); setCurrentLevelId(profile.highestLevel); setCurrentView('game'); }} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.5rem', padding: '20px', background: 'var(--btn-bg)', borderRadius: '16px', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
            >
              <PlayCircle size={32} /> {profile.highestLevel > 1 ? `Weiter mit Level ${profile.highestLevel}` : 'Starte Level 1'}
            </button>
            
            {profile.highestLevel > 1 && (
              <button 
                onClick={() => { playClick(); setCurrentLevelId(1); setCurrentView('game'); }} 
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

            <button 
              onClick={() => { playClick(); window.close(); }} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.2rem', padding: '15px', background: 'rgba(255, 50, 50, 0.2)', border: '2px solid rgba(255, 50, 50, 0.5)', borderRadius: '12px', marginTop: '10px', transition: 'background 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.4)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 50, 50, 0.2)'}
            >
              <Power size={24} color="#ff3366" /> <span style={{ color: '#ff3366' }}>Beenden</span>
            </button>
          </div>
        )}

        {currentView === 'game' && currentLevel && (
          <GameBoard 
             level={{
               ...currentLevel, 
               timeLimitSeconds: profile.gameMode === 'relaxed' ? undefined : currentLevel.timeLimitSeconds
             }} 
             onLevelComplete={handleLevelComplete} 
             onNextLevel={handleNextLevel} 
             onMove={playPour}
          />
        )}

        {currentView === 'leaderboard' && <LeaderboardView />}
        {currentView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default App;
