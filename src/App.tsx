import GameCanvas from './game/GameCanvas';
import { GameOverlay } from './ui/GameOverlay';

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <GameCanvas />
      <GameOverlay />
    </div>
  );
}
