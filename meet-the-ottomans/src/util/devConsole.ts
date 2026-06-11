/**
 * Dev Console — an in-game command line that works in every scene.
 *
 * USAGE (adding a new command):
 *   import { DevConsole } from '../util/devConsole';
 *   DevConsole.register('mycommand', 'Description of what it does', (args) => { ... });
 *   // Or with arg hints for auto-complete:
 *   DevConsole.register('mycommand', 'Does a thing', (args) => { ... }, '<required> [optional]');
 *
 * OPEN / CLOSE:  Tab key  (Shift+Tab also works)
 * NAVIGATE:      Up/Down  to scroll history,  Tab to auto-complete command names
 * SCROLL OUTPUT: PageUp / PageDown  or  mouse wheel
 */

import { AppBase } from 'playcanvas';
import { changeScene } from '../App';
import { Player } from '../player/player';
import { Boss } from '../world/npc/bosses/boss';
import { npc } from '../world/npc/npc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A command handler receives the raw arg string (empty string if none). Can be async. */
type CommandHandler = (args: string) => string | void | Promise<string | void>;

interface CommandEntry {
  name: string;
  description: string;
  handler: CommandHandler;
  argHint?: string;
}

// ---------------------------------------------------------------------------
// DevConsole singleton
// ---------------------------------------------------------------------------

export class DevConsole {
  // ---- public API (static) ------------------------------------------------

  /** Register a new command. Call this at module level or in scene init. */
  static register(
    name: string,
    description: string,
    handler: CommandHandler,
    argHint?: string,
  ): void {
    const key = name.toLowerCase();
    DevConsole._commands.set(key, { name: key, description, handler, argHint });
  }

  /** Unregister a command. */
  static unregister(name: string): void {
    DevConsole._commands.delete(name.toLowerCase());
  }

  /** Initialize the console UI and key listener. Call once at app startup. */
  static init(): void {
    if (DevConsole._initialized) return;
    DevConsole._initialized = true;
    DevConsole._buildUI();
    DevConsole._bindKeys();
    DevConsole._registerBuiltinCommands();
  }

  /** Show the console. */
  static open(): void {
    if (!DevConsole._initialized) DevConsole.init();
    DevConsole._visible = true;
    DevConsole._container.style.display = 'flex';
    DevConsole._inputEl.focus();
    DevConsole._scrollToBottom();
  }

  /** Hide the console. */
  static close(): void {
    DevConsole._visible = false;
    DevConsole._container.style.display = 'none';
    DevConsole._inputEl.blur();
  }

  /** Toggle the console. */
  static toggle(): void {
    if (DevConsole._visible) {
      DevConsole.close();
    } else {
      DevConsole.open();
    }
  }

  /** Whether the console is currently visible. */
  static get isOpen(): boolean {
    return DevConsole._visible;
  }

  /** Print a line to the console output (useful from commands). */
  static log(message: string): void {
    DevConsole._appendOutput(message, 'log');
  }

  /** Print an error line to the console output. */
  static error(message: string): void {
    DevConsole._appendOutput(message, 'error');
  }

  // ---- scene hooks (set by scenes) ----------------------------------------

  /** Set the current Player reference. Scenes call this after creating the player. */
  static setPlayer(player: Player | null): void {
  DevConsole._player = player;
  }

  /** Set the current NPC list reference. Scenes call this after spawning NPCs. */
  static setNpcs(npcs: npc[]): void {
  DevConsole._npcs = npcs;
  }

  /** Set the current AppBase reference. Scenes call this during setup. */
  static setApp(app: AppBase | null): void {
  DevConsole._app = app;
  }

  /** Get the current player — checks explicit ref first, then globalThis bridge from Player constructor. */
  private static getPlayer(): Player | null {
  return DevConsole._player ?? (globalThis as any).__devConsolePlayer ?? null;
  }

  // ---- internals ----------------------------------------------------------

  private static _initialized = false;
  private static _visible = false;
  private static _commands = new Map<string, CommandEntry>();
  private static _history: string[] = [];
  private static _historyIndex = -1;
  private static _player: Player | null = null;
  private static _npcs: npc[] = [];
  private static _app: AppBase | null = null;

  // DOM refs
  private static _container: HTMLDivElement;
  private static _outputEl: HTMLDivElement;
  private static _inputEl: HTMLInputElement;

  private static _buildUI(): void {
    // Container
    const container = document.createElement('div');
    container.id = 'dev-console';
    container.style.display = 'none';
    DevConsole._container = container;

    // Output area
    const output = document.createElement('div');
    output.id = 'dev-console-output';
    DevConsole._outputEl = output;

    // Input row
    const inputRow = document.createElement('div');
    inputRow.id = 'dev-console-input-row';

    const prompt = document.createElement('span');
    prompt.id = 'dev-console-prompt';
    prompt.textContent = '>';
    inputRow.appendChild(prompt);

    const input = document.createElement('input');
    input.id = 'dev-console-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    DevConsole._inputEl = input;
    inputRow.appendChild(input);

    container.appendChild(output);
    container.appendChild(inputRow);
    document.body.appendChild(container);

    // Input event handlers
    input.addEventListener('keydown', (e) => DevConsole._onInputKeyDown(e));

    // Scroll output with mouse wheel even when pointer is over the output area
    output.addEventListener('wheel', (e) => {
      e.stopPropagation();
    });
  }

  private static _bindKeys(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Toggle on Tab (Shift+Tab also works)
      if (e.key === 'Tab') {
        // Don't toggle if user is typing in a different text input
        const active = document.activeElement;
        const isOtherInput =
          active instanceof HTMLInputElement &&
          active.id !== 'dev-console-input';
        if (isOtherInput) return;

        e.preventDefault();
        DevConsole.toggle();
        return;
      }

      // If console is open, prevent game key bindings from firing
      if (DevConsole._visible) {
        // Allow: Tab (handled above), Enter, Backspace, Arrow keys, Home, End,
        // PageUp, PageDown, Shift, Control, Alt, Meta, all printable chars
        // Block: letters that would be captured by game controls (W/A/S/D, etc.)
        // We block the event propagation so the game doesn't process it
        const gameKeys = new Set([
          'w', 'a', 's', 'd', ' ', 'Shift', 'Control',
          '1', '2', '3', '4',
        ]);
        if (gameKeys.has(e.key) && !(e.ctrlKey || e.metaKey)) {
          e.stopPropagation();
        }
      }
    }, true); // capture phase — runs before PlayCanvas handlers
  }

  private static _onInputKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      DevConsole._executeCurrentLine();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      DevConsole._navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      DevConsole._navigateHistory(1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      DevConsole._autoComplete();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      DevConsole.close();
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      DevConsole._outputEl.scrollBy(0, -200);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      DevConsole._outputEl.scrollBy(0, 200);
    }
  }

  private static _executeCurrentLine(): void {
    const raw = DevConsole._inputEl.value.trim();
    DevConsole._inputEl.value = '';

    if (!raw) return;

    // Add to history
    DevConsole._history.push(raw);
    DevConsole._historyIndex = DevConsole._history.length;

    // Echo the command
    DevConsole._appendOutput(`> ${raw}`, 'input');

    // Parse: first token is command name, rest is args string
    const spaceIdx = raw.indexOf(' ');
    const cmdName = (spaceIdx === -1 ? raw : raw.substring(0, spaceIdx)).toLowerCase();
    const args = spaceIdx === -1 ? '' : raw.substring(spaceIdx + 1);

    const entry = DevConsole._commands.get(cmdName);
    if (!entry) {
      DevConsole.error(`Unknown command: "${cmdName}". Type "help" for a list.`);
      return;
    }

    try {
      const result = entry.handler(args);
      // Handle both sync and async command handlers
      if (result instanceof Promise) {
        void result.then((val) => {
          if (typeof val === 'string' && val.length > 0) {
            DevConsole.log(val);
            DevConsole._scrollToBottom();
          }
        }).catch((err) => {
          DevConsole.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        });
      } else if (typeof result === 'string' && result.length > 0) {
        DevConsole.log(result);
      }
    } catch (err) {
      DevConsole.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    DevConsole._scrollToBottom();
  }

  private static _navigateHistory(direction: -1 | 1): void {
    if (DevConsole._history.length === 0) return;

    const newIndex = DevConsole._historyIndex + direction;
    if (newIndex < 0 || newIndex > DevConsole._history.length) return;

    DevConsole._historyIndex = newIndex;

    if (newIndex === DevConsole._history.length) {
      DevConsole._inputEl.value = '';
    } else {
      DevConsole._inputEl.value = DevConsole._history[newIndex] ?? '';
    }
  }

  private static _autoComplete(): void {
    const value = DevConsole._inputEl.value.toLowerCase().trim();
    if (!value) return;

    // Only auto-complete the command name portion (before first space)
    const spaceIdx = value.indexOf(' ');
    const partial = spaceIdx === -1 ? value : value.substring(0, spaceIdx);

    const matches = [...DevConsole._commands.keys()].filter((name) =>
      name.startsWith(partial),
    );

    if (matches.length === 0) return;

    if (matches.length === 1) {
      const entry = DevConsole._commands.get(matches[0])!;
      let completion = matches[0];
      if (entry.argHint) {
        completion += ' ' + entry.argHint;
      }
      DevConsole._inputEl.value = completion;
    } else {
      // Multiple matches — print them and keep input unchanged
      DevConsole.log(matches.join('  '));
      DevConsole._scrollToBottom();
    }
  }

  private static _appendOutput(text: string, type: 'log' | 'error' | 'input'): void {
    const line = document.createElement('div');
    line.className = `dev-console-line dev-console-${type}`;
    line.textContent = text;
    DevConsole._outputEl.appendChild(line);

    // Cap at 500 lines to prevent unbounded growth
    while (DevConsole._outputEl.childElementCount > 500) {
      DevConsole._outputEl.firstChild!.remove();
    }
  }

  private static _scrollToBottom(): void {
    DevConsole._outputEl.scrollTop = DevConsole._outputEl.scrollHeight;
  }

  // -----------------------------------------------------------------------
  // Built-in commands
  // -----------------------------------------------------------------------

  private static _registerBuiltinCommands(): void {
    // ---- help ----
    DevConsole.register('help', 'List all commands, or get help on one command', (args) => {
      if (args) {
        const entry = DevConsole._commands.get(args.toLowerCase());
        if (!entry) return `Unknown command: "${args}"`;
        let text = `  ${entry.name}`;
        if (entry.argHint) text += ` ${entry.argHint}`;
        text += `\n    ${entry.description}`;
        return text;
      }
      const lines: string[] = ['Available commands:', ''];
      const sorted = [...DevConsole._commands.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      for (const cmd of sorted) {
        let line = `  ${cmd.name}`;
        if (cmd.argHint) line += ` ${cmd.argHint}`;
        line += `  — ${cmd.description}`;
        lines.push(line);
      }
      lines.push('');
      lines.push('Use Tab to auto-complete. Up/Down for history. Esc to close.');
      return lines.join('\n');
    }, '[command]');

    // ---- clear ----
    DevConsole.register('clear', 'Clear the console output', () => {
      DevConsole._outputEl.replaceChildren();
    });

    // ---- god ----
    DevConsole.register('god', 'Toggle god mode (invincibility)', () => {
    DevConsole._godMode = !DevConsole._godMode;
    // Keep globalThis in sync so Player.takeDamage can read it without importing DevConsole
    (globalThis as any).__devConsoleGodMode = DevConsole._godMode;
    return DevConsole._godMode ? 'God mode ON' : 'God mode OFF';
    });

    // ---- heal ----
    DevConsole.register('heal', 'Fully heal the player', () => {
      const player = DevConsole.getPlayer();
      if (!player) return 'No player in current scene';
      // Player has no public setHealth, but we can use revive
      player.revive(player.getPosition());
      return `Player healed to full`;
    });

    // ---- scene ----
    DevConsole.register('scene', 'Change scene: -2=title, 0=globe, 666=death, 777=victory, or any battle ID', (args) => {
      const num = parseInt(args, 10);
      if (!Number.isFinite(num)) {
        return 'Usage: scene <number>  (-2=title, 0=globe, 666=death, 777=victory)';
      }
      const canvas = DevConsole._app?.graphicsDevice.canvas as HTMLCanvasElement | undefined;
      if (!canvas || !DevConsole._app) {
        return 'No app reference available';
      }
      void changeScene(canvas, DevConsole._app, num);
      return `Changing to scene ${num}...`;
    }, '<sceneNumber>');

    // ---- pos ----
    DevConsole.register('pos', 'Print player position and camera direction', () => {
      const player = DevConsole.getPlayer();
      if (!player) return 'No player in current scene';
      const state = player.getDebugState();
      return `pos: (${state.position.x.toFixed(2)}, ${state.position.y.toFixed(2)}, ${state.position.z.toFixed(2)})\nfwd: (${state.forward.x.toFixed(2)}, ${state.forward.y.toFixed(2)}, ${state.forward.z.toFixed(2)})\nhealth: ${state.health}/${state.maxHealth}\nweapon: ${state.weapon}`;
    });

    // ---- npcs ----
    DevConsole.register('npcs', 'List NPCs and their health state', () => {
      const npcs = DevConsole._npcs;
      if (npcs.length === 0) return 'No NPCs registered in current scene';
      const lines: string[] = [`${npcs.length} NPC(s):`];
      for (const n of npcs) {
        const pos = n.getEntity().getPosition();
        const alive = n.isAlive();
        lines.push(
          `  #${n.getId()} [${n.getTeam()}] ${alive ? 'ALIVE' : 'DEAD'} hp=${n.getHealth()}/${n.getMaxHealth()} pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`,
        );
      }
      return lines.join('\n');
    });

    // ---- killall ----
    DevConsole.register('killall', 'Kill all enemy NPCs (foes)', () => {
      const foes = DevConsole._npcs.filter((n) => n.getTeam() === 'foe' && n.isAlive());
      for (const foe of foes) {
        foe.takeDamage(foe.getMaxHealth());
      }
      return `Killed ${foes.length} enemy NPC(s)`;
    });

    // ---- weapon ----
    DevConsole.register('weapon', 'Equip a weapon: 1=sword, 2=gun, 3=bow, 4=old gun', (args) => {
      const player = DevConsole.getPlayer();
      if (!player) return 'No player in current scene';
      const slot = parseInt(args, 10) as 1 | 2 | 3 | 4;
      if (slot < 1 || slot > 4 || !Number.isFinite(slot)) {
        return 'Usage: weapon <1|2|3|4>  (1=sword, 2=gun, 3=bow, 4=old gun)';
      }
      player.equipWeapon(slot);
      return `Equipped ${player.getEquippedWeaponName()}`;
    }, '<1|2|3|4>');

    // ---- boss ----
    DevConsole.register('boss', 'Show active boss info or damage the boss', (args) => {
      const boss = Boss.getActiveBoss();
      if (!boss) return 'No active boss in current scene';
      if (!args) {
        const pos = boss.getEntity().getPosition();
        return `Boss: "${boss.getTitle()}"\nHP: ${boss.getHealth()}/${boss.getMaxHealth()}\nState: ${boss.isAlive() ? 'ALIVE' : 'DEAD'}\nPos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
      }
      const dmg = parseInt(args, 10);
      if (!Number.isFinite(dmg) || dmg <= 0) return 'Usage: boss [damage]  — leave empty for info, or pass a damage number';
      boss.takeDamage(dmg);
      return `Dealt ${dmg} damage to "${boss.getTitle()}" (HP: ${boss.getHealth()}/${boss.getMaxHealth()})`;
    }, '[damage]');

    // ---- fly ----
    DevConsole.register('fly', 'Toggle fly mode (disable gravity, move freely with Space/Shift)', () => {
    const player = DevConsole.getPlayer();
    if (!player) return 'No player in current scene';
    const controller = player.getCameraController();
    if (!controller) return 'No camera controller available';
    DevConsole._flyMode = !DevConsole._flyMode;
    if ('devFlyMode' in controller) {
    (controller as unknown as Record<string, unknown>).devFlyMode = DevConsole._flyMode;
    }
    return DevConsole._flyMode ? 'Fly mode ON (Space=up, Shift=down)' : 'Fly mode OFF';
    });

    // ---- timescale ----
    DevConsole.register('timescale', 'Set the app time scale (1=normal, 0.5=half, 2=double)', (args) => {
      const app = DevConsole._app;
      if (!app) return 'No app reference available';
      const scale = parseFloat(args);
      if (!Number.isFinite(scale) || scale <= 0) {
        return `Usage: timescale <number>  (current: ${app.timeScale})`;
      }
      app.timeScale = scale;
      return `Time scale set to ${scale}`;
    }, '<scale>');

    // ---- echo ----
    DevConsole.register('echo', 'Print text back to the console', (args) => {
      return args || '';
    }, '<text>');

    // ---- exec ----
    DevConsole.register('exec', 'Run arbitrary JavaScript (dangerous)', (args) => {
      if (!args) return 'Usage: exec <javascript expression>';
      try {
        const result = new Function(`return (${args})`)();
        return String(result);
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    }, '<expression>');

    // ---- noclip ----
    DevConsole.register('noclip', 'Toggle noclip (alias for fly mode — disable gravity, move freely)', () => {
    DevConsole._flyMode = !DevConsole._flyMode;
    const player = DevConsole.getPlayer();
    if (player) {
    const controller = player.getCameraController();
    if (controller && 'devFlyMode' in controller) {
    (controller as unknown as Record<string, unknown>).devFlyMode = DevConsole._flyMode;
    }
    }
    return DevConsole._flyMode ? 'Noclip ON (Space=up, Shift=down)' : 'Noclip OFF';
    });

    // ---- kill ----
    DevConsole.register('kill', 'Kill the player (deal lethal damage)', () => {
      const player = DevConsole.getPlayer();
      if (!player) return 'No player reference available';
      player.takeDamage(player.getHealth());
      return 'Player killed';
    });

    // ---- give ----
    DevConsole.register('give', 'Give/equip a weapon: sword=1, gun=2, bow=3, old gun=4', (args) => {
      const player = DevConsole.getPlayer();
      if (!player) return 'No player reference available';
      const nameMap: Record<string, 1 | 2 | 3 | 4> = {
        sword: 1, gun: 2, bow: 3, 'old gun': 4,
      };
      const slot = nameMap[args.trim().toLowerCase()];
      if (!slot) return 'Usage: give <weapon>  (sword, gun, bow, old gun)';
      player.equipWeapon(slot);
      return `Equipped weapon slot ${slot}`;
    }, '<weaponName>');

    DevConsole.register('lockround', 'Prevent a level from ending', () => {
      if (DevConsole._roundLock) {
        DevConsole._roundLock = false;
        return 'Round end prevention DISABLED';
      } else {
        DevConsole._roundLock = true;
        return 'Round end prevention ENABLED';
      }
    });

    // ---- exit ----
    DevConsole.register('exit', 'Close the dev console', () => {
      DevConsole.toggle();
      return '';
    });
  }

  /** God mode flag — checked by damage handlers. */
  static _godMode = false;

  /** Fly mode flag — checked by FirstPersonCamera. */
  static _flyMode = false;

  static _roundLock = false; // flag to prevent the round from ending
}

// Expose on window for quick browser-console access: DevConsole.toggle()
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['DevConsole'] = DevConsole;
}
