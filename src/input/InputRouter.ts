// InputRouter — merges keyboard, gamepad and touch into one abstract input state.
// Stage code reads ONLY InputRouter.read(); it never touches raw keys, pointers or pads.

export interface InputState {
  moveX: number;   // -1 (left) to +1 (right)
  moveY: number;   // -1 (up/thrust) to +1 (down)
  fire: boolean;
  action: boolean;
  pause: boolean;
  /** Held: weapon wheel open (H / gamepad Y / touch bag button). */
  inventory: boolean;
  /** Weapon slot picked directly this frame (1–4 keys), 0 = none. */
  slot: number;
  /** Interact (T / gamepad X / tapping the on-screen prompt): press buttons, board the plane. */
  interact: boolean;
  /** Use the side item (J / gamepad RB / touch ITEM): grenade, firebomb, medkit. */
  item: boolean;
  /** Switch to the next side item this frame (Q / gamepad LB / tapping the item icon). */
  itemNext: boolean;
}

/** What a device reports; the wheel fields are optional for devices that lack them. */
export type DeviceInput = Omit<InputState, 'inventory' | 'slot' | 'interact' | 'item' | 'itemNext'> & Partial<Pick<InputState, 'inventory' | 'slot' | 'interact' | 'item' | 'itemNext'>>;

function zero(): InputState {
  return { moveX: 0, moveY: 0, fire: false, action: false, pause: false, inventory: false, slot: 0, interact: false, item: false, itemNext: false };
}

function full(d: DeviceInput): InputState {
  return { ...d, inventory: d.inventory ?? false, slot: d.slot ?? 0, interact: d.interact ?? false, item: d.item ?? false, itemNext: d.itemNext ?? false };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

class InputRouterSingleton {
  private kb: InputState = zero();
  private touch: InputState = zero();
  private pad: InputState = zero();
  /** Set by tapping the on-screen interact prompt; read once. */
  private tapLatch = false;
  /** Set by tapping the on-screen item icon; read once. */
  private itemLatch = false;

  /** The player tapped the item icon (touch): switch item. */
  tapItemNext(): void {
    this.itemLatch = true;
  }

  /** The player tapped the on-screen interact prompt (touch). */
  tapInteract(): void {
    this.tapLatch = true;
  }

  setKeyboard(state: DeviceInput): void {
    this.kb = full(state);
  }

  setTouch(state: DeviceInput): void {
    this.touch = full(state);
  }

  setGamepad(state: DeviceInput): void {
    this.pad = full(state);
  }

  read(): Readonly<InputState> {
    const tap = this.tapLatch, nextTap = this.itemLatch;
    this.tapLatch = false;
    this.itemLatch = false;
    return {
      moveX: clamp(this.kb.moveX + this.touch.moveX + this.pad.moveX, -1, 1),
      moveY: clamp(this.kb.moveY + this.touch.moveY + this.pad.moveY, -1, 1),
      fire: this.kb.fire || this.touch.fire || this.pad.fire,
      action: this.kb.action || this.touch.action || this.pad.action,
      pause: this.kb.pause || this.touch.pause || this.pad.pause,
      inventory: this.kb.inventory || this.touch.inventory || this.pad.inventory,
      slot: this.kb.slot || this.touch.slot || this.pad.slot,
      interact: tap || this.kb.interact || this.touch.interact || this.pad.interact,
      item: this.kb.item || this.touch.item || this.pad.item,
      itemNext: nextTap || this.kb.itemNext || this.touch.itemNext || this.pad.itemNext,
    };
  }
}

export const InputRouter = new InputRouterSingleton();
