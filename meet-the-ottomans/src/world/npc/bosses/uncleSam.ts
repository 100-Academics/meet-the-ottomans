import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";
import { loadModel, type Model, type LoadModelOptions } from "../../../util/loadModel";

type UncleSamAttackType = "throwMoney" | "fireworks" | "airstrike";

interface MoneyState {
 endTimeSeconds: number;
 nextThrowAtSeconds: number;
 throwsFired: number;
}

interface FireworksState {
 endTimeSeconds: number;
 nextShotAtSeconds: number;
 shotsFired: number;
}

interface AirstrikeState {
 endTimeSeconds: number;
 nextBombAtSeconds: number;
 bombsDropped: number;
 bombPositions: Vec3[];
}

export class UncleSam extends Boss {
 // Throws money
 private readonly moneyDamage = 7;
 private readonly moneyCount = 4;
 private readonly moneyIntervalSeconds = 0.3;
 private readonly moneyCooldownSeconds = 4.0;
 private readonly moneyRange = 22;
 private nextMoneyAtSeconds = 0;

 // Firework projectiles
 private readonly fireworksDamage = 12;
 private readonly fireworksCount = 3;
 private readonly fireworksIntervalSeconds = 0.4;
 private readonly fireworksCooldownSeconds = 5.5;
 private readonly fireworksRange = 30;
 private nextFireworksAtSeconds = 0;

 // Air strike
 private readonly airstrikeDamage = 18;
 private readonly airstrikeCount = 4;
 private readonly airstrikeIntervalSeconds = 0.5;
 private readonly airstrikeCooldownSeconds = 10.0;
 private readonly airstrikeRange = 35;
 private readonly airstrikeHitRadius = 4.0;
 private nextAirstrikeAtSeconds = 0;

 // Runtime state
 private attackLockUntilSeconds = 0;
 private lastAttackType: UncleSamAttackType | null = null;
 private lastAttackAtSeconds = -Infinity;
 private moneyState: MoneyState | null = null;
 private fireworksState: FireworksState | null = null;
 private airstrikeState: AirstrikeState | null = null;
 private onPlayerAttack?: (attacker: npc, damage: number) => void;

 // VFX materials
 private readonly moneyMaterial = this.createEffectMaterial(
 new Color(0.2, 0.7, 0.2), new Color(0.3, 0.9, 0.3), 2.5, 0.8
 );
 private readonly fireworksMaterial = this.createEffectMaterial(
 new Color(1, 0.3, 0.1), new Color(1, 0.5, 0.2), 4.0, 0.9
 );
 private readonly airstrikeMaterial = this.createEffectMaterial(
 new Color(1, 0.8, 0.2), new Color(1, 0.9, 0.4), 5.0, 0.85
 );
 private readonly airstrikeRingMaterial = this.createEffectMaterial(
 new Color(1, 0.5, 0.1), new Color(1, 0.6, 0.2), 3.5, 0.7
 );

 private readonly activeEffects = new Set<Entity>();

 // Weapon model templates (preloaded GLB, cloned per projectile)
 private moneyBillTemplate: Entity | null = null;
 private fireworkRocketTemplate: Entity | null = null;
 private bombTemplate: Entity | null = null;

 constructor(id: number, maxHealth: number, entity: Entity = new Entity("Uncle Sam")) {
 super(id, maxHealth, entity, "Uncle Sam");
 this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
 this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

 this.setIntroTaunt("I WANT YOU!", "I WANT YOU!");
 this.setIntroNameTranslation("Uncle Sam", "Uncle Sam");
 this.setIntroSkipTranslation(true);
 this.setTauntSet({
 highHealth: [
 "I want YOU… to surrender!",
 "Freedom isn't free, and neither is your defeat.",
 "Pay up, or pay the price!"
 ],
 bossLowPlayerHigh: [
 "The land of the free fights back!",
 "Don't tread on me!",
 "Liberty or death!"
 ],
 playerLowBossHigh: [
 "Your debt to freedom is past due.",
 "You can't afford to fight me.",
 "The price of defeat is steep."
 ],
 bothLow: [
 "For liberty, I give my all!",
 "One nation, under fire!"
 ],
 death: [
 "Freedom… carries a heavy cost.",
 "The dream… lives on."
 ],
 bossDeath: [
 "I gave… my all for liberty.",
 "Old Glory… still waves."
 ]
 });

 this.preloadWeaponTemplates();
 }

 // ── Weapon template preloading ──
 private preloadWeaponTemplates(): void {
 const loadOpts: LoadModelOptions = {
 autoCollision: false,
 scale: new Vec3(1, 1, 1),
 rotation: new Vec3(0, 0, 0),
 position: new Vec3(0, -9999, 0) // offscreen until needed
 };

 loadModel("models/npc/boss/UncleSamJunk/one_dollar_bill.glb", undefined, { ...loadOpts })
 .then((m: Model) => {
 this.moneyBillTemplate = m.modelEntity;
 m.modelEntity.enabled = false; // hide template
 })
 .catch((e: unknown) => { console.warn("[UncleSam] Failed to load dollar bill model:", e); });

 loadModel("models/npc/boss/UncleSamJunk/firework_red_rocket.glb", undefined, { ...loadOpts })
 .then((m: Model) => {
 this.fireworkRocketTemplate = m.modelEntity;
 m.modelEntity.enabled = false; // hide template
 })
 .catch((e: unknown) => { console.warn("[UncleSam] Failed to load firework rocket model:", e); });

 loadModel("models/npc/boss/UncleSamJunk/bomb.glb", undefined, { ...loadOpts })
 .then((m: Model) => {
 this.bombTemplate = m.modelEntity;
 m.modelEntity.enabled = false; // hide template
 })
 .catch((e: unknown) => { console.warn("[UncleSam] Failed to load bomb model:", e); });
 }

 public override updateCombatAI(
 deltaTime: number, currentTimeSeconds: number, allNpcs: npc[],
 onNpcAttack?: (attacker: npc, target: npc, damage: number) => void,
 playerEntity?: Entity | null,
 onPlayerAttack?: (attacker: npc, damage: number) => void
 ): void {
 this.onPlayerAttack = onPlayerAttack;
 super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
 }

 public override updateAI(
 deltaTime: number, targetEntity: Entity | null, currentTimeSeconds: number,
 onAttack?: (attacker: npc) => void,
 profileOverride?: { attackDamage: number; attackRange: number; attackCooldown: number; detectionRange: number; }
 ): void {
 if (!this.isAlive()) return;
 const dt = Math.max(0, Math.min(deltaTime, 0.05));
 if (!targetEntity) { super.updateAI(dt, targetEntity, currentTimeSeconds, onAttack, profileOverride); return; }

 if (this.moneyState) { this.updateMoney(dt, targetEntity, currentTimeSeconds, onAttack); return; }
 if (this.fireworksState) { this.updateFireworks(dt, targetEntity, currentTimeSeconds, onAttack); return; }
 if (this.airstrikeState) { this.updateAirstrike(dt, targetEntity, currentTimeSeconds, onAttack); return; }

 if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

 const distance = this.getFlatDistanceTo(targetEntity);
 const chosen = this.pickNextAttack(distance, currentTimeSeconds);
 if (chosen === "throwMoney") { this.startMoney(currentTimeSeconds); return; }
 if (chosen === "fireworks") { this.startFireworks(currentTimeSeconds); return; }
 if (chosen === "airstrike") { this.startAirstrike(targetEntity, currentTimeSeconds); return; }

 const myPos = this.getEntity().getPosition();
 const targetPos = targetEntity.getPosition();
 this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
 }

 public override kill(): boolean {
 const didKill = super.kill();
 if (didKill) this.cleanupEffects();
 return didKill;
 }

 protected override getCombatProfile() {
 const base = super.getCombatProfile();
 return { ...base, attackDamage: this.airstrikeDamage, attackRange: this.airstrikeRange, attackCooldown: this.airstrikeCooldownSeconds, detectionRange: Number.MAX_VALUE };
 }

 // ── Attack selection ──
 private pickNextAttack(distance: number, now: number): UncleSamAttackType | null {
 const choices: Array<{ type: UncleSamAttackType; score: number }> = [];
 if (now >= this.nextMoneyAtSeconds && distance <= this.moneyRange) {
 const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.moneyRange));
 choices.push({ type: "throwMoney", score: 0.9 + closeness });
 }
 if (now >= this.nextFireworksAtSeconds && distance <= this.fireworksRange) {
 choices.push({ type: "fireworks", score: 1.1 + (distance / Math.max(0.001, this.fireworksRange)) });
 }
 if (now >= this.nextAirstrikeAtSeconds && distance <= this.airstrikeRange) {
 choices.push({ type: "airstrike", score: 1.3 });
 }
 if (choices.length === 0) return null;
 if (this.lastAttackType && (now - this.lastAttackAtSeconds) < 1.8) {
 for (const c of choices) { if (c.type === this.lastAttackType) c.score *= 0.55; }
 }
 let best = choices[0];
 for (let i = 1; i < choices.length; i++) { if (choices[i].score > best.score) best = choices[i]; }
 const tied = choices.filter(c => Math.abs(c.score - best.score) < 0.05);
 if (tied.length > 1) return tied[Math.floor(Math.random() * tied.length)].type;
 return best.type;
 }

 // ── Throw money ──
 private startMoney(now: number): void {
 this.lastAttackType = "throwMoney"; this.lastAttackAtSeconds = now;
 this.moneyState = { endTimeSeconds: now + this.moneyCount * this.moneyIntervalSeconds + 0.2, nextThrowAtSeconds: now, throwsFired: 0 };
 this.attackLockUntilSeconds = this.moneyState.endTimeSeconds;
 }

 private updateMoney(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
 const state = this.moneyState; if (!state) return;
 {
 const myPos = this.getEntity().getPosition();
 const targetPos = target.getPosition();
 this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
 }
 if (state.throwsFired < this.moneyCount && now >= state.nextThrowAtSeconds) {
 state.throwsFired++; state.nextThrowAtSeconds = now + this.moneyIntervalSeconds;
 this.spawnMoneyProjectile(target);
 if (this.getFlatDistanceTo(target) <= this.moneyRange) this.applyDamage(this.moneyDamage, onAttack);
 }
 if (now >= state.endTimeSeconds) { this.moneyState = null; this.nextMoneyAtSeconds = now + this.moneyCooldownSeconds; }
 }

 private spawnMoneyProjectile(target: Entity): void {
 const myPos = this.getEntity().getPosition();
 const targetPos = target.getPosition();
 const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();

 const { entity: projectile, isGLB } = this.cloneWeaponTemplate(this.moneyBillTemplate, "uncle-sam-coin", 0.5);
 if (!isGLB) {
 // Fallback: green cylinder
 projectile.addComponent("render", { type: "cylinder", material: this.moneyMaterial });
 projectile.setLocalScale(0.5, 0.1, 0.5);
 } else {
 // Prepare GLB dollar bill materials for fading
 this.prepareGlbMaterialsForFade(projectile, this.moneyMaterial);
 }

 projectile.setPosition(myPos.x + dir.x * 1.5, myPos.y + 1.5, myPos.z + dir.z * 1.5);
 this.getEntity().parent?.addChild(projectile) ?? this.getEntity().addChild(projectile);
 this.activeEffects.add(projectile);
 const startPos = projectile.getPosition().clone();
 const speed = 28; const startMs = Date.now(); const maxMs = 1200;
 const tick = () => {
 const elapsed = Date.now() - startMs;
 if (elapsed >= maxMs || !projectile.parent) { this.destroyEffect(projectile); return; }
 const t = elapsed / 1000;
 const arc = Math.sin(t * Math.PI) * 2.5;
 projectile.setPosition(startPos.x + dir.x * speed * t, startPos.y + arc, startPos.z + dir.z * speed * t);
 // Spin the dollar bill with a tumbling animation for GLB
 projectile.setLocalEulerAngles(elapsed * 0.3, elapsed * 2, elapsed * 0.15);
 this.fadeAllMeshMaterials(projectile, 0.8 * (1 - elapsed / maxMs));
 requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
 }

 // ── Fireworks ──
 private startFireworks(now: number): void {
 this.lastAttackType = "fireworks"; this.lastAttackAtSeconds = now;
 this.fireworksState = { endTimeSeconds: now + this.fireworksCount * this.fireworksIntervalSeconds + 0.3, nextShotAtSeconds: now, shotsFired: 0 };
 this.attackLockUntilSeconds = this.fireworksState.endTimeSeconds;
 }

 private updateFireworks(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
 const state = this.fireworksState; if (!state) return;
 {
 const myPos = this.getEntity().getPosition();
 const targetPos = target.getPosition();
 this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
 }
 if (state.shotsFired < this.fireworksCount && now >= state.nextShotAtSeconds) {
 state.shotsFired++; state.nextShotAtSeconds = now + this.fireworksIntervalSeconds;
 this.spawnFirework(target);
 if (this.getFlatDistanceTo(target) <= this.fireworksRange) this.applyDamage(this.fireworksDamage, onAttack);
 }
 if (now >= state.endTimeSeconds) { this.fireworksState = null; this.nextFireworksAtSeconds = now + this.fireworksCooldownSeconds; }
 }

 private spawnFirework(target: Entity): void {
 const myPos = this.getEntity().getPosition();
 const targetPos = target.getPosition();
 const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();

 const { entity: projectile, isGLB } = this.cloneWeaponTemplate(this.fireworkRocketTemplate, "uncle-sam-firework", 0.4);
 if (!isGLB) {
 // Fallback: red cone
 projectile.addComponent("render", { type: "cone", material: this.fireworksMaterial });
 projectile.setLocalScale(0.3, 0.3, 1.5);
 }

 const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
 if (isGLB) {
 // GLB rocket model: orient so the rocket nose points along flight direction
 projectile.setLocalEulerAngles(0, yaw, 0);
 this.prepareGlbMaterialsForFade(projectile, this.fireworksMaterial);
 } else {
 projectile.setLocalEulerAngles(-90, yaw, 0);
 }
 projectile.setPosition(myPos.x + dir.x * 1.5, myPos.y + 1, myPos.z + dir.z * 1.5);
 this.getEntity().parent?.addChild(projectile) ?? this.getEntity().addChild(projectile);
 this.activeEffects.add(projectile);
 const startPos = projectile.getPosition().clone();
 const speed = 50; const startMs = Date.now(); const maxMs = 800;
 const tick = () => {
 const elapsed = Date.now() - startMs;
 if (elapsed >= maxMs || !projectile.parent) { this.destroyEffect(projectile); return; }
 const t = elapsed / 1000;
 projectile.setPosition(startPos.x + dir.x * speed * t, startPos.y + Math.sin(t * 5) * 0.3, startPos.z + dir.z * speed * t);
 this.fadeAllMeshMaterials(projectile, 0.9 * (1 - elapsed / maxMs));
 requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
 }

 // ── Air strike ──
 private startAirstrike(target: Entity, now: number): void {
 this.lastAttackType = "airstrike"; this.lastAttackAtSeconds = now;
 const targetPos = target.getPosition();
 const bombPositions: Vec3[] = [];
 for (let i = 0; i < this.airstrikeCount; i++) {
 const offsetX = (Math.random() - 0.5) * 8;
 const offsetZ = (Math.random() - 0.5) * 8;
 bombPositions.push(new Vec3(targetPos.x + offsetX, targetPos.y + 20, targetPos.z + offsetZ));
 }
 this.airstrikeState = { endTimeSeconds: now + this.airstrikeCount * this.airstrikeIntervalSeconds + 0.5, nextBombAtSeconds: now, bombsDropped: 0, bombPositions };
 this.attackLockUntilSeconds = this.airstrikeState.endTimeSeconds;
 }

 private updateAirstrike(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
 const state = this.airstrikeState; if (!state) return;
 {
 const myPos = this.getEntity().getPosition();
 const targetPos = target.getPosition();
 this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
 }

 if (state.bombsDropped < this.airstrikeCount && now >= state.nextBombAtSeconds) {
 const pos = state.bombPositions[state.bombsDropped];
 state.bombsDropped++; state.nextBombAtSeconds = now + this.airstrikeIntervalSeconds;

 // Telegraph ring at impact point
 this.spawnRingEffect(new Vec3(pos.x, pos.y - 20 + 0.1, pos.z), this.airstrikeHitRadius, 600, this.airstrikeRingMaterial, "uncle-sam-airstrike-ring", 0.6);

 // Bomb falling VFX
 const { entity: projectile, isGLB } = this.cloneWeaponTemplate(this.bombTemplate, "uncle-sam-bomb", 0.8);
 if (!isGLB) {
 // Fallback: yellow sphere
 projectile.addComponent("render", { type: "sphere", material: this.airstrikeMaterial });
 projectile.setLocalScale(0.8, 0.8, 0.8);
 } else {
 // Prepare GLB bomb materials for fading
 this.prepareGlbMaterialsForFade(projectile, this.airstrikeMaterial);
 }

 projectile.setPosition(pos.x, pos.y, pos.z);
 this.getEntity().parent?.addChild(projectile) ?? this.getEntity().addChild(projectile);
 this.activeEffects.add(projectile);
 const startMs = Date.now(); const fallMs = 500;
 const tick = () => {
 const elapsed = Date.now() - startMs;
 if (elapsed >= fallMs || !projectile.parent) { this.destroyEffect(projectile); return; }
 const t = elapsed / fallMs;
 projectile.setPosition(pos.x, pos.y - 20 * t, pos.z);
 // Spin the GLB bomb as it falls
 if (isGLB) {
 projectile.setLocalEulerAngles(elapsed * 0.5, elapsed * 1.2, 0);
 }
 this.fadeAllMeshMaterials(projectile, 0.85);
 requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);

 // Check hit after delay
 const targetPos = target.getPosition();
 const dx = targetPos.x - pos.x;
 const dz = targetPos.z - pos.z;
 if (Math.sqrt(dx * dx + dz * dz) <= this.airstrikeHitRadius) {
 this.applyDamage(this.airstrikeDamage, onAttack);
 }
 }

 if (now >= state.endTimeSeconds) {
 this.airstrikeState = null;
 this.nextAirstrikeAtSeconds = now + this.airstrikeCooldownSeconds;
 }
 }

 // ── Helpers ──

 /**
 * Clone a preloaded weapon GLB template, or create a bare Entity fallback.
 * Returns { entity, isGLB } so callers know whether to add primitive geometry.
 */
 private cloneWeaponTemplate(template: Entity | null, name: string, scale: number): { entity: Entity; isGLB: boolean } {
 if (template) {
 const clone = template.clone();
 clone.name = name;
 clone.setLocalScale(scale, scale, scale);
 clone.enabled = true; // clones of disabled templates should be visible
 // Detach from any parent the template may have so we can re-parent to the scene
 if (clone.parent) clone.parent.removeChild(clone);
 return { entity: clone, isGLB: true };
 }
 return { entity: new Entity(name), isGLB: false };
 }

 /**
 * Prepare GLB model materials for fade-out by enabling blending and depth-write
 * on all mesh instances. This must be called once after cloning a GLB template.
 */
 private prepareGlbMaterialsForFade(entity: Entity, fallbackTint: StandardMaterial): void {
 const render = entity.render;
 if (!render) return;
 for (const mi of render.meshInstances) {
 const mat = mi.material as StandardMaterial | undefined;
 if (mat && mat instanceof StandardMaterial) {
 // Enable transparency so opacity fading works
 mat.blendType = BLEND_ADDITIVE;
 mat.cull = CULLFACE_NONE;
 mat.depthWrite = false;
 // Tint the emissive to give the projectile a glow matching the attack type
 if (fallbackTint.emissive) {
 mat.emissive = fallbackTint.emissive;
 mat.emissiveIntensity = Math.max(mat.emissiveIntensity, fallbackTint.emissiveIntensity * 0.5);
 }
 mat.update();
 }
 }
 }

 /**
 * Fade all mesh instance materials on an entity to the given opacity.
 * Works for both GLB-loaded models and primitive fallbacks.
 */
 private fadeAllMeshMaterials(entity: Entity, opacity: number): void {
 const render = entity.render;
 if (!render) return;
 for (const mi of render.meshInstances) {
 const mat = mi.material as StandardMaterial | undefined;
 if (mat && typeof (mat as any).opacity === "number") {
 mat.opacity = opacity;
 mat.update();
 }
 }
 }

 private faceTarget(target: Entity, dt: number): void {
 const myPos = this.getEntity().getPosition(); const targetPos = target.getPosition();
 this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, 0, dt);
 }

 private getFlatDistanceTo(target: Entity): number {
 const myPos = this.getEntity().getPosition(); const targetPos = target.getPosition();
 const dx = targetPos.x - myPos.x; const dz = targetPos.z - myPos.z;
 return Math.sqrt(dx * dx + dz * dz);
 }

 private applyDamage(damage: number, onAttack?: (attacker: npc) => void): void {
 if (this.onPlayerAttack) this.onPlayerAttack(this, damage);
 if (onAttack) onAttack(this);
 }

 private createEffectMaterial(emissiveColor: Color, diffuseColor: Color, emissiveIntensity: number, opacity: number): StandardMaterial {
 const mat = new StandardMaterial();
 mat.emissive = emissiveColor; mat.emissiveIntensity = emissiveIntensity;
 mat.diffuse = diffuseColor; mat.opacity = opacity;
 mat.blendType = BLEND_ADDITIVE; mat.cull = CULLFACE_NONE; mat.depthWrite = false;
 mat.update(); return mat;
 }

 private spawnRingEffect(origin: Vec3, radius: number, durationMs: number, material: StandardMaterial, name: string, opacity: number): void {
 const ring = new Entity(name);
 ring.addComponent("render", { type: "torus", material });
 ring.setPosition(origin.x, origin.y + 0.1, origin.z);
 ring.setLocalScale(radius, radius * 0.15, radius);
 this.getEntity().parent?.addChild(ring) ?? this.getEntity().addChild(ring);
 this.activeEffects.add(ring);
 const startMs = Date.now();
 const tick = () => {
 const elapsed = Date.now() - startMs;
 if (elapsed >= durationMs) { this.destroyEffect(ring); return; }
 this.fadeAllMeshMaterials(ring, opacity * (1 - elapsed / durationMs));
 requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
 }

 private destroyEffect(entity: Entity | null | undefined): void {
 if (!entity) return; this.activeEffects.delete(entity);
 if (entity.parent) entity.parent.removeChild(entity); entity.destroy();
 }

 private cleanupEffects(): void {
 for (const effect of this.activeEffects) { try { if (effect.parent) effect.parent.removeChild(effect); effect.destroy(); } catch { /* */ } }
 this.activeEffects.clear(); this.moneyState = null; this.fireworksState = null; this.airstrikeState = null;
 }
}
