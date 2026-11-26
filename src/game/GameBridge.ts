// GameBridge — typed event bus between React and Phaser.
// React never touches Phaser objects; it only calls methods here.
// Full implementation in T10 (React shell). This is a stub for T1–T9.

class GameBridgeClass {
  pause(): void {
    // TODO T10: forward pause to the active scene
  }

  resume(): void {
    // TODO T10: forward resume to the active scene
  }
}

export const GameBridge = new GameBridgeClass();
