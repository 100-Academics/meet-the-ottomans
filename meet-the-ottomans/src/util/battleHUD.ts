import { Player } from '../player/player';
import { Gun } from '../player/weapon/gun';

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
      <div class="hud-row" id="hud-ammo-row" style="display: none;">
        <span class="hud-label">Ammo:</span>
        <span class="hud-value" id="hud-ammo">12</span>
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

export function updateBattleHUD(player: Player) {
  const weaponEl = document.getElementById('hud-weapon');
  const healthEl = document.getElementById('hud-health');
  const ammoRowEl = document.getElementById('hud-ammo-row');
  const ammoEl = document.getElementById('hud-ammo');

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

  // Get the equipped weapon and check if it's a Gun
  const equippedWeapon = (player as any).equippedWeapon;
  if (equippedWeapon instanceof Gun) {
    if (ammoRowEl) {
      ammoRowEl.style.display = 'flex';
    }
    if (ammoEl) {
      const ammo = equippedWeapon.getAmmo();
      ammoEl.textContent = ammo.toString();
      ammoEl.classList.remove('critical', 'warning');
      if (ammo === 0) {
        ammoEl.classList.add('critical');
      } else if (ammo <= 3) {
        ammoEl.classList.add('warning');
      }
    }
  } else {
    if (ammoRowEl) {
      ammoRowEl.style.display = 'none';
    }
  }
}
