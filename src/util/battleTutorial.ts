import type { AppBase } from 'playcanvas';
import { bindSceneListener, registerSceneCleanup } from './sceneCleanup';

/**
 * In-battle tutorial stepper for the first level (Battle of Legnica).
 * Advances one instruction at a time, only when the action is performed:
 *   1. Move (WASD) — detected by camera position delta
 *   2. Equip bow (key 2)
 *   3. Re-equip sword (key 1)
 *   4. Attack (left mouse)
 * Then a brief "wipe them out" message and it self-removes.
 */
interface TutorialPlayer {
  getPosition(): { x: number; y: number; z: number };
  getEquippedWeaponName(): string;
}
interface Step { html: string; done: () => boolean }

export function startBattleTutorial(app: AppBase, player: TutorialPlayer): void {
  if (typeof document === 'undefined') return;
  const card = document.createElement('div');
  card.id = 'battle-tutorial-card';
  Object.assign(card.style, {
    position: 'fixed', top: '14px', left: '50%', transform: 'translateX(-50%)',
    zIndex: '1200', background: 'rgba(0,0,0,0.75)',
    border: '2px solid rgba(255,215,0,0.65)', borderRadius: '10px',
    padding: '10px 18px', color: '#f0e6c8', fontSize: '0.95rem',
    textAlign: 'center', pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  } as CSSStyleDeclaration);
  document.body.appendChild(card);

  const startPos = player.getPosition();
  let moved = false, bowEquipped = false, swordReequipped = false, attacked = false;
  const onAttack = () => { attacked = true; };
  app.mouse?.on('mousedown', onAttack);
  const weaponIs = (frag: string) => player.getEquippedWeaponName().toLowerCase().includes(frag);

  const steps: Step[] = [
    { html: 'Tutorial 1/4 — Move with <b>W A S D</b>',
      done: () => { if (moved) return true; const p = player.getPosition();
        const dx = p.x - startPos.x, dz = p.z - startPos.z;
        if (dx * dx + dz * dz > 1.0) { moved = true; return true; } return false; } },
    { html: 'Tutorial 2/4 — Press <b>2</b> to equip the bow',
      done: () => { if (bowEquipped) return true; if (weaponIs('bow')) { bowEquipped = true; return true; } return false; } },
    { html: 'Tutorial 3/4 — Press <b>1</b> to switch back to the sword',
      done: () => { if (swordReequipped) return true; if (weaponIs('sword')) { swordReequipped = true; return true; } return false; } },
    { html: 'Tutorial 4/4 — <b>Left-click</b> to attack. Defeat every Mongol!',
      done: () => attacked },
  ];

  let stepIndex = 0, finished = false, finishAt = 0;
  const detach = bindSceneListener(app, 'update', () => {
    if (finished) {
      if (Date.now() >= finishAt) { try { card.remove(); } catch { /* noop */ } detach(); }
      return;
    }
    card.innerHTML = steps[stepIndex].html;
    if (steps[stepIndex].done()) {
      stepIndex += 1;
      if (stepIndex >= steps.length) {
        finished = true; finishAt = Date.now() + 4000;
        card.innerHTML = '<span style="color:#8fe388;font-weight:bold">Tutorial complete — wipe them out!</span>';
      }
    }
  });

  registerSceneCleanup(app, () => {
    try { card.remove(); } catch { /* noop */ }
    try { app.mouse?.off('mousedown', onAttack); } catch { /* noop */ }
  });
}
