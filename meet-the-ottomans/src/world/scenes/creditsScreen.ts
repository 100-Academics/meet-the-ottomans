/**
 * Credits screen — a full-overlay panel shown from the title screen.
 *
 * Follows the same conventions as victoryScreen.ts / deathScreen.ts:
 * module-level show/hide functions, an id-keyed DOM node appended to
 * document.body, and idempotent show().
 *
 * Content sections use placeholder text ('TBD') — the content owner will
 * fill these in later. Keep the structure: 1 Special Thanks entry,
 * 1 Maps & Geography Data credit, 4 Developer entries, 2 Bonus Thanks entries.
 */
export function showCreditsScreen(options?: { onClose?: () => void }) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('credits-screen')) return;

  const overlay = document.createElement('div');
  overlay.id = 'credits-screen';
  overlay.className = 'overlay absolute';
  overlay.style.pointerEvents = 'auto';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '10000';
  overlay.style.background = 'rgba(5, 5, 5, 0.97)';
  overlay.style.overflowY = 'auto';

  const card = document.createElement('div');
  card.className = 'credits-card';
  card.style.width = 'min(700px, 90vw)';
  card.style.margin = '4rem auto';
  card.style.pointerEvents = 'auto';
  card.style.textAlign = 'center';
  card.style.background = 'rgba(0, 0, 0, 0.35)';
  card.style.padding = '1.5rem 1.75rem 2rem';
  card.style.borderRadius = '12px';

  const title = document.createElement('h1');
  title.textContent = 'Credits';
  title.style.fontSize = '2.5rem';
  title.style.margin = '0.2rem 0 1rem 0';

  card.appendChild(title);

  const addSection = (heading: string, entries: string[]) => {
    const section = document.createElement('div');
    section.className = 'credits-section';
    section.style.margin = '1.25rem 0';

    const h = document.createElement('h2');
    h.textContent = heading;
    h.style.fontSize = '1.1rem';
    h.style.color = '#ffd700';
    h.style.textTransform = 'uppercase';
    h.style.letterSpacing = '0.08em';
    h.style.margin = '0 0 0.5rem 0';
    section.appendChild(h);

    for (const entry of entries) {
      const p = document.createElement('p');
      p.className = 'credits-entry';
      p.textContent = entry;
      p.style.color = '#ccc';
      p.style.margin = '0.25rem 0';
      section.appendChild(p);
    }

    card.appendChild(section);
  };

  addSection('Special Thanks', ['TBD']);
  addSection('Maps & Geography Data', ['Google Maps']);
  addSection('Developers', ['TBD', 'TBD', 'TBD', 'TBD']);
  addSection('Bonus Thanks', ['TBD', 'TBD']);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';
  btnRow.style.justifyContent = 'center';
  btnRow.style.marginTop = '1.5rem';

  const backBtn = document.createElement('button');
  backBtn.id = 'credits-back-btn';
  backBtn.className = 'btn';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => {
    hideCreditsScreen();
    if (options?.onClose) options.onClose();
  });

  btnRow.appendChild(backBtn);
  card.appendChild(btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

export function hideCreditsScreen() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('credits-screen');
  if (el) el.remove();
}

export default { showCreditsScreen, hideCreditsScreen };
