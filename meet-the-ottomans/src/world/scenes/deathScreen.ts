import { AppBase } from 'playcanvas';
import { unloadAll } from '../../util/unloadall';

/**
 * Simple "You Died" overlay utilities.
 * - `showDeathScreen` adds a full-screen overlay with Restart/Main Menu buttons.
 * - `hideDeathScreen` removes the overlay.
 */

export function showDeathScreen(options?: {
  app?: AppBase;
  onRestart?: () => void;
  onMainMenu?: () => void;
  message?: string;
}) {

  if (options?.app) {
    unloadAll(options.app);
    options.app.mouse?.off();
    options.app.keyboard?.off();
    options.app.touch?.off();
    const canvas = options.app.graphicsDevice?.canvas as HTMLCanvasElement | undefined;
    if (canvas) {
      canvas.style.display = 'none';
    }
  }
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.overlay').forEach((el) => {
    if ((el as HTMLElement).id !== 'death-screen') {
      el.remove();
    }
  });
  const hoverLabel = document.getElementById('battle-hover-label');
  if (hoverLabel) {
    hoverLabel.remove();
  }
  if (document.getElementById('death-screen')) return; // already shown

  const { onRestart, onMainMenu, message = 'You have died' } = options ?? {};

  const overlay = document.createElement('div');
  overlay.id = 'death-screen';
  overlay.className = 'overlay absolute';
  overlay.style.pointerEvents = 'auto';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '9999';
  overlay.style.background = '#050505';

  const card = document.createElement('div');
  card.style.width = 'min(700px, 90vw)';
  card.style.margin = '2rem auto';
  card.style.pointerEvents = 'auto';
  card.style.textAlign = 'center';
  card.style.backdropFilter = 'blur(4px)';
  card.style.background = 'rgba(0, 0, 0, 0.35)';
  card.style.padding = '1.25rem 1.5rem';
  card.style.borderRadius = '12px';

  const title = document.createElement('h1');
  title.textContent = 'You Died!';
  title.style.fontSize = '3rem';
  title.style.margin = '0.2rem 0 0.4rem 0';

  const desc = document.createElement('p');
  desc.textContent = message;
  desc.style.color = '#ccc';
  desc.style.margin = '0 0 1rem 0';

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.style.justifyContent = 'center';

  const restart = document.createElement('button');
  restart.className = 'btn';
  restart.textContent = 'Restart';
  restart.addEventListener('click', () => {
    try {
      hideDeathScreen();
      if (onRestart) return onRestart();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  });

  const menu = document.createElement('button');
  menu.className = 'btn';
  menu.textContent = 'Main Menu';
  menu.addEventListener('click', () => {
    if (onMainMenu) return onMainMenu();
    // fallback: navigate to root
    window.location.href = '/';
  });

  btnRow.appendChild(restart);
  btnRow.appendChild(menu);

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(btnRow);

  // center vertically
  const topGap = document.createElement('div');
  topGap.className = 'grow';
  const botGap = document.createElement('div');
  botGap.className = 'grow';

  overlay.appendChild(topGap);
  overlay.appendChild(card);
  overlay.appendChild(botGap);

  document.body.appendChild(overlay);
}

export function hideDeathScreen() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('death-screen');
  if (el) el.remove();
  const canvas = document.querySelector('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    canvas.style.display = '';
  }
}

export default { showDeathScreen, hideDeathScreen };
