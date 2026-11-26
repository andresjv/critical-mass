// InputRouter — merges keyboard, gamepad and touch into one abstract input state.
// Stage code reads ONLY InputRouter.read(); it never touches raw keys, pointers or pads.

export interface InputState {
  moveX: number;   // -1 (left) to +1 (right)
  moveY: number;   // -1 (up/thrust) to +1 (down)
  fire: boolean;
  action: boolean;
  pause: boolean;
}

function zero(): InputState {
  return { moveX: 0, moveY: 0, fire: false, action: false, pause: false };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

class InputRouterSingleton {
  private kb: InputState = zero();
  private touch: InputState = zero();
  private pad: InputState = zero();

  setKeyboard(state: InputState): void {
    this.kb = state;
  }

  setTouch(state: InputState): void {
    this.touch = state;
  }

  setGamepad(state: InputState): void {
    this.pad = state;
  }

  read(): Readonly<InputState> {
    return {
      moveX: clamp(this.kb.moveX + this.touch.moveX + this.pad.moveX, -1, 1),
      moveY: clamp(this.kb.moveY + this.touch.moveY + this.pad.moveY, -1, 1),
      fire: this.kb.fire || this.touch.fire || this.pad.fire,
      action: this.kb.action || this.touch.action || this.pad.action,
      pause: this.kb.pause || this.touch.pause || this.pad.pause,
    };
  }
}

export const InputRouter = new InputRouterSingleton();
