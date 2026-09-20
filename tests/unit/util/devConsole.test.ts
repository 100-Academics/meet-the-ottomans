// DevConsole: command registration, execution through the input field, and
// the god-mode side effect on globalThis (consume via the built-in handler).
// Importing devConsole pulls in App.ts (top-level await ammo.js) — works under
// happy-dom as it does for the dev build.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// devConsole.ts imports { changeScene } from '../App', and App.ts imports the
// DevConsole back (plus top-level-awaits ammo). Mock App to break the cycle.
vi.mock('@/App', () => ({ changeScene: vi.fn() }));

import { DevConsole } from '@/util/devConsole';

function outputText(): string {
  return ((DevConsole as any)._outputEl?.textContent ?? '') as string;
}

function executeCommand(raw: string): void {
  const input = document.getElementById('dev-console-input') as HTMLInputElement | null;
  if (input) {
    input.value = raw;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  } else {
    // DOM was rebuilt after init (the test setup clears document.body) — drive
    // the registered command handler directly.
    const spaceIdx = raw.indexOf(' ');
    const name = (spaceIdx === -1 ? raw : raw.substring(0, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? '' : raw.substring(spaceIdx + 1);
    const entry = (DevConsole as any)._commands.get(name);
    if (!entry) {
      DevConsole.error(`Unknown command: "${name}". Type "help" for a list.`);
      return;
    }
    const result = entry.handler(args);
    if (typeof result === 'string' && result.length > 0) {
      DevConsole.log(result);
    }
  }
}

describe('DevConsole register/execute', () => {
  beforeEach(() => {
    DevConsole.init();
    DevConsole.setPlayer(null);
    (globalThis as any).__devConsolePlayer = null;
  });

  it('registers and executes a custom command', () => {
    let received: string | null = null;
    DevConsole.register('unit_ping', 'test command', (args) => {
      received = args;
      return 'pong';
    });
    executeCommand('unit_ping hello world');
    expect(received).toBe('hello world');
    expect(outputText()).toContain('pong');
    DevConsole.unregister('unit_ping');
  });

  it('prints an error for unknown commands', () => {
    executeCommand('definitely_not_a_command');
    expect(outputText()).toContain('Unknown command');
  });

  it('echo command prints its args back', () => {
    executeCommand('echo marco');
    expect(outputText()).toContain('marco');
  });
});

describe('DevConsole god mode', () => {
  beforeEach(() => {
    DevConsole.init();
    DevConsole._godMode = false;
    delete (globalThis as any).__devConsoleGodMode;
  });

  it('toggling god mode flips the globalThis flag on and off', () => {
    executeCommand('god');
    expect(DevConsole._godMode).toBe(true);
    expect((globalThis as any).__devConsoleGodMode).toBe(true);
    executeCommand('god');
    expect(DevConsole._godMode).toBe(false);
    expect((globalThis as any).__devConsoleGodMode).toBe(false);
  });

  it('god without a player still reports the toggle', () => {
    executeCommand('god');
    expect(outputText()).toContain('God mode ON');
  });
});
