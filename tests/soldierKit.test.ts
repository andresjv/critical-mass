import { describe, it, expect, beforeEach } from 'vitest';
import { chooseArmor, kit, resetKit, setCharacter, setTool, toolLoadout, ARMORS, CHARACTERS, TOOLS } from '../src/state/soldierKit';
import { armory, addCredits, resetArmory } from '../src/state/armory';
import { KIT } from '../src/state/tuning';

describe('soldier kit', () => {
  beforeEach(() => { resetKit(); resetArmory(); });

  it('starts with frag, firebomb and medkit, the first character and no armor', () => {
    expect(kit.tools).toEqual(['frag', 'molotov', 'medkit']);
    expect(kit.armor).toBe('none');
    expect(kit.character).toBe(CHARACTERS[0].id);
    expect(toolLoadout()).toEqual([
      { id: 'frag', count: KIT.toolCount.frag }, { id: 'molotov', count: KIT.toolCount.molotov }, { id: 'medkit', count: KIT.toolCount.medkit },
    ]);
  });

  it('every tool and armor has a count or price', () => {
    for (const t of TOOLS) expect(KIT.toolCount[t.id]).toBeGreaterThan(0);
    for (const a of ARMORS) expect(KIT.armorPrice[a.id]).toBeGreaterThanOrEqual(0);
  });

  it('a tool sits in one slot only (moving swaps)', () => {
    setTool(2, 'smoke');
    expect(kit.tools).toEqual(['frag', 'molotov', 'smoke']);
    setTool(0, 'smoke');
    expect(kit.tools).toEqual(['smoke', 'molotov', 'frag']);
    setTool(1, null);
    expect(toolLoadout().map(t => t.id)).toEqual(['smoke', 'frag']);
  });

  it('armor is bought once with credits, then free to switch', () => {
    armory.credits = 0;
    expect(chooseArmor('light')).toBe('poor');
    expect(kit.armor).toBe('none');
    addCredits(KIT.armorPrice.light);
    expect(chooseArmor('light')).toBe('ok');
    expect(armory.credits).toBe(0);
    expect(chooseArmor('none')).toBe('ok');
    expect(chooseArmor('light')).toBe('ok');
    expect(armory.credits).toBe(0);
  });

  it('character can be changed', () => {
    setCharacter('mara');
    expect(kit.character).toBe('mara');
  });
});
