import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  NPC_TYPE_SPAWN_OVERRIDES,
  NPC_TYPE_MODEL_PATHS,
  AIR_LADIN_BOSS_SPAWN_OVERRIDES,
  DEFAULT_BATTLE_NPC_SPAWN_OPTIONS,
} from '../../../src/world/npc/sceneNpcPresets';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_PATH = path.resolve(HERE, '../../../src/world/npc/sceneNpcPresets.ts');
const source = readFileSync(PRESETS_PATH, 'utf8');

// NPC_MODEL_PATHS isn't exported — extract its keys from source.
function npcModelPathKeys(): string[] {
  const match = source.match(/const NPC_MODEL_PATHS\s*=\s*\{([\s\S]*?)\};/);
  if (!match) return [];
  return [...match[1].matchAll(/^\s*(\w+):\s*"/gm)].map((m) => m[1]);
}

describe('sceneNpcPresets — spawn overrides sanity', () => {
  it('every override with an explicit hitboxRadius has hitboxRadius > 0', () => {
    for (const [key, override] of Object.entries(NPC_TYPE_SPAWN_OVERRIDES)) {
      if (override.hitboxRadius !== undefined) {
        expect(override.hitboxRadius, `${key}.hitboxRadius`).toBeGreaterThan(0);
      }
    }
  });

  it('AIR_LADIN_BOSS_SPAWN_OVERRIDES has a positive hitboxRadius', () => {
    expect(AIR_LADIN_BOSS_SPAWN_OVERRIDES.hitboxRadius).toBeGreaterThan(0);
  });

  it('every override with an explicit modelScale has nonzero scale on all axes', () => {
    for (const [key, override] of Object.entries(NPC_TYPE_SPAWN_OVERRIDES)) {
      if (override.modelScale) {
        expect(override.modelScale.x, `${key}.modelScale.x`).not.toBe(0);
        expect(override.modelScale.y, `${key}.modelScale.y`).not.toBe(0);
        expect(override.modelScale.z, `${key}.modelScale.z`).not.toBe(0);
      }
    }
  });

  it('shared battle spawn options expose type model paths and overrides', () => {
    expect(DEFAULT_BATTLE_NPC_SPAWN_OPTIONS.typeModelPaths).toBeTruthy();
    expect(DEFAULT_BATTLE_NPC_SPAWN_OPTIONS.typeSpawnOverrides).toBeTruthy();
  });
});

describe('sceneNpcPresets — key alignment', () => {
  it('every NPC_TYPE_SPAWN_OVERRIDES key resolves a model path or has one in its overrides', () => {
    for (const [key, override] of Object.entries(NPC_TYPE_SPAWN_OVERRIDES)) {
      const hasPath = Boolean(NPC_TYPE_MODEL_PATHS[key] || override.modelPath);
      expect(hasPath, `spawn override "${key}" has no model path`).toBe(true);
    }
  });

  it('no dangling NPC_MODEL_PATHS keys: every key maps to a non-empty .glb path', () => {
    const pathsSection = source.match(/const NPC_MODEL_PATHS\s*=\s*\{([\s\S]*?)\};/);
    expect(pathsSection).toBeTruthy();
    const entries = [...pathsSection![1].matchAll(/(\w+):\s*"([^"]+)"/g)];
    expect(entries.length).toBeGreaterThan(0);
    for (const [, key, value] of entries) {
      expect(value.length, key).toBeGreaterThan(0);
      expect(value.endsWith('.glb'), key).toBe(true);
    }
  });

  it('boss model keys exist in NPC_MODEL_PATHS', () => {
    const keys = npcModelPathKeys();
    for (const expected of ['airLadin', 'binLadin', 'genghisKhan', 'towerBoss', 'nineTailedFox', 'moses']) {
      expect(keys, expected).toContain(expected);
    }
  });

  it('NPC_TYPE_MODEL_PATHS values are non-empty strings', () => {
    for (const [type, modelPath] of Object.entries(NPC_TYPE_MODEL_PATHS)) {
      expect(typeof modelPath, type).toBe('string');
      expect(modelPath.length, type).toBeGreaterThan(0);
    }
  });

  it('every spawn override key exists in NPC_TYPE_MODEL_PATHS or supplies its own modelPath', () => {
    for (const key of Object.keys(NPC_TYPE_SPAWN_OVERRIDES)) {
      expect(
        key in NPC_TYPE_MODEL_PATHS || Boolean(NPC_TYPE_SPAWN_OVERRIDES[key].modelPath),
        `orphan override: ${key}`
      ).toBe(true);
    }
  });
});
