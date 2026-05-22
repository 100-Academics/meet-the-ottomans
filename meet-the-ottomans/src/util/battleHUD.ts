import { Player } from '../player/player';

export function createBattleHUD() {
  if (document.getElementById('battle-hud')) {
    return; // HUD already exists
  }

  const hud = document.createElement('div');
  hud.id = 'battle-hud';
  hud.innerHTML = `
    <div id="battle-hud-content">
      <div class="hud-row">
        <span class="hud-label">Weapon:</span>
        <span class="hud-value" id="hud-weapon">Sword</span>
      </div>
      <div class="hud-row">
        <span class="hud-label">Health:</span>
        <span class="hud-value" id="hud-health">100/100</span>
      </div>
      <div class="hud-row">
        <span class="hud-label">NPCs left:</span>
        <span class="hud-value" id="hud-npcs">--</span>
      </div>
    </div>
  `;
  document.body.appendChild(hud);

  if (!document.getElementById('battle-crosshair')) {
    const crosshair = document.createElement('div');
    crosshair.id = 'battle-crosshair';
    document.body.appendChild(crosshair);
  }
}

export function removeBattleHUD() {
  const hud = document.getElementById('battle-hud');
  if (hud) {
    hud.remove();
  }

  const crosshair = document.getElementById('battle-crosshair');
  if (crosshair) {
    crosshair.remove();
  }
}

export function updateBattleHUD(player: Player, remainingNpcs?: number) {
  const weaponEl = document.getElementById('hud-weapon');
  const healthEl = document.getElementById('hud-health');
  const npcCountEl = document.getElementById('hud-npcs');

  if (weaponEl) {
    weaponEl.textContent = player.getEquippedWeaponName();
  }

  if (healthEl) {
    const health = player.getHealth();
    const maxHealth = 100;
    
    // Remove all status classes
    healthEl.classList.remove('critical', 'warning');
    
    // Add status class based on health
    if (health <= 25) {
      healthEl.classList.add('critical');
    } else if (health <= 50) {
      healthEl.classList.add('warning');
    }
    
    healthEl.textContent = `${health}/${maxHealth}`;
  }

      if (npcCountEl && typeof remainingNpcs === 'number' && Number.isFinite(remainingNpcs)) {
        npcCountEl.textContent = `${Math.max(0, Math.floor(remainingNpcs))}`;
      }
}
