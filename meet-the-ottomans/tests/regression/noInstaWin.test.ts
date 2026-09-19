// Regression test for the "instant victory" battle-scene bug.
//
// Two cooperating defects put a fresh battle straight onto the Victory
// screen the moment it was clicked from the globe map:
//
//  (1) Scenes bound their per-frame win check with a RAW app.on('update')
//      call. Battle scenes entered from the map never pass through
//      changeScene(), so nothing detached the old listener — and the
//      module-level flags it closed over were still warm from the
//      previous scene visit. The first frame then saw zero living foes
//      plus a stale "boss spawned" flag and fired triggerVictory.
//
//  (2) Boss spawn helpers set their "boss spawned" module flag even when
//      spawnSceneNpcs() produced ZERO foes (empty spawn lists like the
//      Wisliceny operation's, or foe spawns silently skipped because the
//      player stood within playerSafeRadius of the spawn point — every
//      boss that spawns at x:0,z:0 races this). The win branch then saw
//      zero living foes with the flag set and auto-victored with no boss
//      on the field.
//
// Fix: the shared checker in src/util/victoryCheck.ts binds via
// bindSceneListener (detaches on scene change, fires at most once), and
// boss flags may only be set through bossActuallySpawned(spawned), which
// requires at least one foe to have entered the world.
//
// These tests pin both: no scene may re-introduce a raw update binding
// for its win check, and no spawn path may mark a boss present when the
// spawn returned nothing.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bossActuallySpawned, bindVictoryCheck } from '../../src/util/victoryCheck';
import { bumpSceneGeneration } from '../../src/util/sceneCleanup';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = path.resolve(HERE, '../../src/world/scenes');

// Strip both comment styles so a regex can never match prose explaining
// the bug — only real code is scanned.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('no instant win', () => {
  it('no scene file binds its win-check with a raw app.on("update", ...) call', () => {
    const rawBinding = /app\.on\(\s*['"]update['"]\s*,\s*victoryCheck\s*\)/;
    const offenders: string[] = [];
    for (const file of readdirSync(SCENES_DIR)) {
      if (!file.endsWith('.ts')) continue;
      const source = stripComments(readFileSync(path.join(SCENES_DIR, file), 'utf8'));
      if (rawBinding.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('bossActuallySpawned refuses to mark a boss present when nothing spawned', () => {
    expect(bossActuallySpawned([])).toBe(false);
    expect(bossActuallySpawned([{}])).toBe(true);
  });

  it('every isBossSpawned=true assignment flows through the spawned-foes gate', () => {
    const offenders: string[] = [];
    for (const file of readdirSync(SCENES_DIR)) {
      if (!file.endsWith('.ts')) continue;
      const source = stripComments(readFileSync(path.join(SCENES_DIR, file), 'utf8'));
      // Flag flips are only acceptable when gated on an actual spawn result
      // (bossActuallySpawned(...)). Anything setting it unconditionally
      // recreates the auto-victory path.
      if (/isBossSpawned\s*=\s*true\s*;/.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('bindVictoryCheck only declares victory for zero foes after a spawned boss, and detaches on scene change', () => {
    const events = new Map<string, (dt: number) => void>();
    const app = {
      on(name: string, cb: (dt: number) => void) { events.set(name, cb); },
      off(name: string, cb: (dt: number) => void) { if (events.get(name) === cb) events.delete(name); },
    } as any;

    let remainingFoes = 5;
    let bossSpawned = false;
    let victories = 0;
    let spawnRequests = 0;

    bindVictoryCheck(app, {
      isDeathScreenVisible: () => false,
      getRemainingFoes: () => remainingFoes,
      isBossSpawned: () => bossSpawned,
      onVictory: () => { victories++; },
      spawnBoss: () => { spawnRequests++; },
    });

    const tick = () => events.get('update')?.(0.016);

    // Foes alive: nothing happens.
    tick();
    expect(victories).toBe(0);
    expect(spawnRequests).toBe(0);

    // Foes dead but no boss on the field: request the boss ONCE, no win.
    remainingFoes = 0;
    tick();
    tick();
    expect(victories).toBe(0);
    expect(spawnRequests).toBe(1);

    // Boss actually present and all foes dead: exactly one victory.
    bossSpawned = true;
    tick();
    tick();
    expect(victories).toBe(1);

    // Scene change detaches the listener entirely.
    bumpSceneGeneration();
    tick();
    expect(events.has('update')).toBe(false);
    expect(victories).toBe(1);
  });
});
