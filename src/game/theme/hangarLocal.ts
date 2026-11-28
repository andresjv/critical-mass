// Local flavour for the hangar on each level: how the ground crew dress, what the kit looks
// like, which extra props stand around, and what the crew chat about. Read via biome.hangar.local.
import type { LevelId } from '../../state/levels';

export type HangarStyle = 'base' | 'swamp' | 'desert' | 'arctic' | 'lunar';
export type Headgear = 'helmet' | 'boonie' | 'shemagh' | 'hood' | 'spacesuit';

export interface HangarLocal {
  style: HangarStyle;
  crew: {
    uniform: number; uniformDark: number; camo: number | null;
    headgear: Headgear; hat: number; hatTrim: number; skin: number;
    vest: number; vestStripe: number; pack: number;
    /** Faction shoulder patch (our side is blue). */
    patch: number;
  };
  kit: {
    crate: number; crateDark: number; strap: number;
    barrel: number; barrelRed: number; barrelTop: number;
    truck: number; truckTank: number; sandbag: number; sandbagDark: number;
    table: number; map: number;
    /** Style-specific prop colours (puddles, moss, netting, heaters, tanks…). */
    accent: number; accent2: number;
  };
  /** 'radio' voices are squelchy suit radios (Moon); 'room' are people in the hangar. */
  voice: 'room' | 'radio';
  /** Short exchanges between two crew members: lines alternate speaker A, B, A… */
  chatter: readonly (readonly string[])[];
}

const PATCH = 0x3a8fe0;

export const HANGAR_LOCAL: Record<LevelId, HangarLocal> = {
  coldfront: {
    style: 'base',
    crew: { uniform: 0x4a5634, uniformDark: 0x323a22, camo: 0x2a301c, headgear: 'helmet', hat: 0x3c4630, hatTrim: 0x2a301c,
      skin: 0xd9a77c, vest: 0xff8a1e, vestStripe: 0xfff2a0, pack: 0x3a4a3a, patch: PATCH },
    kit: { crate: 0x6b5a36, crateDark: 0x4c3f24, strap: 0x2e2616, barrel: 0x3e5a3a, barrelRed: 0x8a2a22, barrelTop: 0x5c7a56,
      truck: 0x4a5a36, truckTank: 0x8c9496, sandbag: 0x9a8a62, sandbagDark: 0x7a6c48, table: 0x5a4a34, map: 0xd8d0b0,
      accent: 0x6f9cc4, accent2: 0x3a4652 },
    voice: 'room',
    chatter: [
      ["Rain's not letting up tonight.", 'Good. Harder for them to see us coming.'],
      ['Who left their coffee on the wing?', "Wasn't me.", "It's always 'wasn't me'."],
      ["Fuel's topped off.", 'Copy. Pull the chocks when she rolls.'],
      ['You hear what radar picked up?', 'Yeah. Four launch sites. Maybe more.'],
      ['You still owe me ten bucks.', "Win the war first. Then we'll talk."],
      ['Tower says the storm hits in an hour.', "Then let's get her out before it does."],
      ['Is that the new pilot?', "Yep. Looks nervous.", "We all did, first time."],
    ],
  },
  swamp: {
    style: 'swamp',
    crew: { uniform: 0x4a5a32, uniformDark: 0x323e22, camo: 0x6b7a44, headgear: 'boonie', hat: 0x5a6a3a, hatTrim: 0x3a4626,
      skin: 0xb98a62, vest: 0xff8a1e, vestStripe: 0xfff2a0, pack: 0x3a3424, patch: PATCH },
    kit: { crate: 0x5a4a2e, crateDark: 0x3c301c, strap: 0x2a2214, barrel: 0x4a4a2a, barrelRed: 0x7a3a22, barrelTop: 0x6a6a3a,
      truck: 0x3e4a2a, truckTank: 0x6a6e5a, sandbag: 0x7a6e4a, sandbagDark: 0x5a5034, table: 0x4a3c26, map: 0xc8c0a0,
      accent: 0x2a3424, accent2: 0x4e6a34 },
    voice: 'room',
    chatter: [
      ["Mud's in the intake again.", 'Course it is. Grab the brush.'],
      ['Something just moved in the water.', "It's a log.", "Logs don't blink, Miller."],
      ['These mosquitoes are bigger than the drones.', "Spray's in the green crate."],
      ['Your boots still wet from yesterday?', 'Since Tuesday, actually.'],
      ["Pilot's coming. Look busy.", "I am busy. Busy being damp."],
      ["Generator's acting up again.", 'Kick it twice. Works every time.'],
      ['Smell that?', "That's the swamp, man. It always smells like that."],
    ],
  },
  desert: {
    style: 'desert',
    crew: { uniform: 0xb8996a, uniformDark: 0x8a704a, camo: 0xa4855a, headgear: 'shemagh', hat: 0xd8c8a0, hatTrim: 0x2a2a2a,
      skin: 0xa8774e, vest: 0xff8a1e, vestStripe: 0xfff2a0, pack: 0x7a6440, patch: PATCH },
    kit: { crate: 0x8a7246, crateDark: 0x6a5634, strap: 0x3a2e1a, barrel: 0x6a6a4a, barrelRed: 0x9a3a24, barrelTop: 0x8a8a62,
      truck: 0xa88a5a, truckTank: 0xb0a890, sandbag: 0xc9b07a, sandbagDark: 0xa08a5a, table: 0x7a6040, map: 0xe8dcc0,
      accent: 0x6a7a4a, accent2: 0x4a6a3a },
    voice: 'room',
    chatter: [
      ['Sand in the canopy rails again.', 'Blow it out. And check the filters.'],
      ['A hundred and ten in the shade.', 'What shade?'],
      ['Drink some water, Reyes.', "I'm fine.", "That's what the last guy said."],
      ["Sandstorm's coming off the ridge.", 'Then she launches before it gets here.'],
      ['Who parked the truck in the sun?', '...Nobody. It parked itself.'],
      ['Scouts saw tanks past the mesa.', "Bombs are loaded. She's ready."],
      ['I miss rain.', 'Say that again in the swamp.'],
    ],
  },
  snow: {
    style: 'arctic',
    crew: { uniform: 0xe4ebf1, uniformDark: 0xb4c0cc, camo: null, headgear: 'hood', hat: 0xe4ebf1, hatTrim: 0x8a7a66,
      skin: 0xe0b090, vest: 0xff8a1e, vestStripe: 0xfff2a0, pack: 0x8a96a2, patch: PATCH },
    kit: { crate: 0x6a5a40, crateDark: 0x4a3e2a, strap: 0x2e2616, barrel: 0x5a6a7a, barrelRed: 0x9a2a22, barrelTop: 0x8a9aaa,
      truck: 0xd8dee4, truckTank: 0x9aa6b2, sandbag: 0xdfe8f0, sandbagDark: 0xb8c4d0, table: 0x5a4a34, map: 0xe8e4d8,
      accent: 0xbfe0ff, accent2: 0xff7a2a },
    voice: 'room',
    chatter: [
      ["Can't feel my fingers.", 'Keep them on the heater, not on the jet.'],
      ['Ice on the wing roots again.', "De-icer's on the cart. Spray all of it."],
      ['My coffee froze.', 'So eat it like a popsicle.'],
      ["Blizzard's getting worse.", "He won't see past the nose out there.", "Good thing the instruments can."],
      ['Who left the door open?', "Close it! We're losing all the heat!"],
      ['Engines take forever to warm up in this.', "Give her two minutes. She'll purr."],
      ["What's for dinner?", 'Same as yesterday. Frozen.'],
    ],
  },
  moon: {
    style: 'lunar',
    crew: { uniform: 0xeef0f4, uniformDark: 0xb8bcc4, camo: null, headgear: 'spacesuit', hat: 0xf4f6f8, hatTrim: 0xe8b83c,
      skin: 0xd9a77c, vest: 0xff7a1a, vestStripe: 0xfff2a0, pack: 0xc8ccd4, patch: PATCH },
    kit: { crate: 0x8a8f99, crateDark: 0x5a606a, strap: 0xe8b83c, barrel: 0xd8dce2, barrelRed: 0xc8322a, barrelTop: 0x66ddff,
      truck: 0xc8ccd4, truckTank: 0x8a8f99, sandbag: 0x8a8e96, sandbagDark: 0x6a6e76, table: 0x4c525c, map: 0x66ddff,
      accent: 0x66ddff, accent2: 0x3a404a },
    voice: 'radio',
    chatter: [
      ['Check your seals before you go near the bay.', 'Seals are green. Oxygen at ninety.'],
      ['Base, hangar two. Bird is fuelled.', 'Copy, hangar two. Clear the pad.'],
      ["Don't drop that wrench.", "It's low gravity, not zero.", 'Just... hold onto it.'],
      ['Earth looks nice tonight.', "Focus. Launch window's in five."],
      ['Dust in the airlock again.', 'Run the cycler twice.'],
      ["Power's back on line three.", 'Good. Start the pre-flight.'],
      ['Ever think about going home?', 'Every day. After this one.'],
    ],
  },
};
