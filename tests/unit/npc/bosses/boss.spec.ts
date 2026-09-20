import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Entity } from 'playcanvas';
import { Boss } from '../../../../src/world/npc/bosses/boss';
function makeBoss(title = 'Test Boss', health = 500) {
  const entity = new Entity('boss-entity');
  entity.setPosition(0, 0, 0);
  return new Boss(99, health, entity, title);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => { });
  Boss.setActiveBoss(null);
});

afterEach(() => {
  document.getElementById('boss-health-bar')?.remove();
  Boss.consumeLastBossDeathTaunt();
  Boss.setActiveBoss(null);
});

describe('Boss active-instance management', () => {
  it('getActiveBoss is null when unset', () => {
    expect(Boss.getActiveBoss()).toBeNull();
  });

  it('setActiveBoss/getActiveBoss round-trip', () => {
    const boss = makeBoss();
    Boss.setActiveBoss(boss);
    expect(Boss.getActiveBoss()).toBe(boss);
  });

  it('killing the active boss clears the active slot', () => {
    const boss = makeBoss();
    Boss.setActiveBoss(boss);
    boss.takeDamage(9999);
    expect(Boss.getActiveBoss()).toBeNull();
  });
});

describe('Boss death taunts', () => {
  it('consumeLastBossDeathTaunt returns the taunt set by the killing blow, exactly once', () => {
    const boss = makeBoss();
    boss.setBossDeathTaunts(['Farewell, cruel world.']);
    boss.takeDamage(9999);
    expect(Boss.consumeLastBossDeathTaunt()).toBe('Farewell, cruel world.');
    expect(Boss.consumeLastBossDeathTaunt()).toBeNull();
  });

  it('getActivePlayerDeathTaunt is null without an active boss', () => {
    expect(Boss.getActivePlayerDeathTaunt()).toBeNull();
  });

  it('getActivePlayerDeathTaunt returns the active boss player-death taunt', () => {
    const boss = makeBoss();
    boss.setDeathTaunts(['Pathetic.']);
    Boss.setActiveBoss(boss);
    expect(Boss.getActivePlayerDeathTaunt()).toBe('Pathetic.');
  });

  it('player death taunt differs from boss death taunt', () => {
    const boss = makeBoss();
    boss.setDeathTaunts(['You die!']);
    boss.setBossDeathTaunts(['I die!']);
    Boss.setActiveBoss(boss);
    expect(Boss.getActivePlayerDeathTaunt()).toBe('You die!');
    expect(Boss.getActiveDeathTaunt()).toBe('I die!');
  });
});

describe('Boss title', () => {
  it('uses the provided title', () => {
    expect(makeBoss('Genghis Khan').getTitle()).toBe('Genghis Khan');
  });

  it('falls back to "Boss" when title is blank', () => {
    expect(makeBoss('   ').getTitle()).toBe('Boss');
  });

  it('setTitle updates the title and ignores blanks', () => {
    const boss = makeBoss();
    boss.setTitle('New Title');
    expect(boss.getTitle()).toBe('New Title');
    boss.setTitle('  ');
    expect(boss.getTitle()).toBe('New Title');
  });
});

describe('Boss health bar DOM', () => {
  it('drawHealthBar creates a #boss-health-bar element with a fill', () => {
    const boss = makeBoss();
    boss.drawHealthBar();
    const bar = document.getElementById('boss-health-bar');
    expect(bar).not.toBeNull();
    expect(bar!.querySelector('.boss-health-fill')).not.toBeNull();
    expect(bar!.querySelector('.boss-health-title')!.textContent).toBe('Test Boss');
  });

  it('updateHealthBar reflects current health percentage in the fill width', () => {
    const boss = makeBoss('Test Boss', 200);
    boss.drawHealthBar();
    boss.takeDamage(100); // 50% health
    boss.updateHealthBar();
    const fill = document.querySelector<HTMLElement>('#boss-health-bar .boss-health-fill');
    expect(fill!.style.width).toBe('50%');
  });

  it('updateHealthBar never renders negative width', () => {
    const boss = makeBoss();
    boss.drawHealthBar();
    boss.takeDamage(99999);
    boss.updateHealthBar();
    const fill = document.querySelector<HTMLElement>('#boss-health-bar .boss-health-fill');
    expect(fill!.style.width).toBe('0%');
  });

  it('removeHealthBar removes the element from the DOM', () => {
    const boss = makeBoss();
    Boss.setActiveBoss(null);
    boss.drawHealthBar();
    expect(document.getElementById('boss-health-bar')).not.toBeNull();
    boss.removeHealthBar();
    expect(document.getElementById('boss-health-bar')).toBeNull();
  });
});

describe('Boss combat profile', () => {
  it('detection range is effectively unbounded', () => {
    const boss = makeBoss();
    boss.drawHealthBar();
    // A foe boss should chase a player entity even from far away.
    const player = new Entity('player');
    player.setPosition(100000, 0, 0);
    const onPlayerAttack = vi.fn();
    boss.updateCombatAI(0.016, 0, [], undefined, player, onPlayerAttack);
    expect(boss.getAiState()).toBe('chase');
  });

  it('boss is a foe team npc', () => {
    expect(makeBoss().getTeam()).toBe('foe');
  });
});
