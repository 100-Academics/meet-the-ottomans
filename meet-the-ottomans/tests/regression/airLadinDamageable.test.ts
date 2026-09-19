// Regression test: Air Ladin (and any other NPC type spawned through
// sceneNpcSystem) must be spawned WITH a collision body, otherwise the
// physics-based click-to-hit code in `Weapon.getClickedNpcInRange`
// (player/weapon/weapon.ts) can never hit them — the raycast just sails
// past and the bow's radius-fallback misses because Air Ladin floats
// above the ground.
//
// This used to live in sceneNpcSystem.ts as a hard-coded
// `if (spawn.type === "AirLadin") loadOptions.autoCollision = false;`
// special case. The test pins the regression so that bug cannot come back.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SYSTEM_PATH = path.resolve(HERE, '../../src/world/npc/sceneNpcSystem.ts');

describe('Air Ladin spawn keeps collision enabled', () => {
  it('sceneNpcSystem does not strip collision bodies from any spawn type', () => {
    const source = readFileSync(SYSTEM_PATH, 'utf8');

    // No "type === 'XYZ'" × "autoCollision = false" sample anywhere in the
    // spawn pipeline. If someone reintroduces a per-type collision-off
    // branch, this test catches it at the source level.
    const offenders = /if\s*\(\s*spawn\.type\s*===\s*['"][^"']+['"]\s*\)\s*\{[\s\S]{0,200}?autoCollision\s*=\s*false/;

    expect(source).not.toMatch(offenders);
  });

  it('"AirLadin" never appears as a special-case that opts out of collision', () => {
    const source = readFileSync(SYSTEM_PATH, 'utf8');

    // The string 'autoCollision' may legitimately appear elsewhere in the
    // file (as a passthrough into LoadModelOptions) — we only forbid the
    // specific "AirLadin" + "false" combination that caused the bug.
    const airLadin = /AirLadin[^"]{0,100}autoCollision\s*=\s*false/;
    expect(source).not.toMatch(airLadin);
  });
});
