import { AppBase } from 'playcanvas';

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
  if (typeof document === 'undefined') return;
  if (document.getElementById('death-screen')) return; // already shown

  const { onRestart, onMainMenu, message = 'You have died' } = options ?? {};

  const overlay = document.createElement('div');
  overlay.id = 'death-screen';
  overlay.className = 'overlay absolute';
  overlay.style.pointerEvents = 'auto';

  const card = document.createElement('div');
  card.style.width = 'min(700px, 90vw)';
  card.style.margin = '2rem auto';
  card.style.pointerEvents = 'auto';
  card.style.textAlign = 'center';
  card.style.backdropFilter = 'blur(4px)';

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
}

export default { showDeathScreen, hideDeathScreen };
