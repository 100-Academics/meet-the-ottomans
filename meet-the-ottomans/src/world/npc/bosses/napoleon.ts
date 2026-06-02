import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type NapoleonAttackType = "cannon" | "cavalier" | "wine";

interface CannonState {
    endTimeSeconds: number;
    hasFired: boolean;
    glow?: Entity | null;
}

interface CavalierState {
    endTimeSeconds: number;
    hasCharged: boolean;
    direction: Vec3;
}

interface WineState {
    endTimeSeconds: number;
    hasThrown: boolean;
}

export class Napoleon extends Boss {
    // Cannon fire
    private readonly cannonDamage = 22;
    private readonly cannonCooldownSeconds = 6.0;
    private readonly cannonRange = 35;
    private readonly cannonHitRadius = 4.0;
    private nextCannonAtSeconds = 0;

    // Small cavalier attacker (dash)
    private readonly cavalierSpeed = PLAYER_MOVE_SPEED * 2.5;
    private readonly cavalierDurationSeconds = 0.5;
    private readonly cavalierDamage = 14;
    private readonly cavalierCooldownSeconds = 5.0;
    private readonly cavalierRangeMin = 5;
    private readonly cavalierRangeMax = 25;
    private readonly cavalierHitRadius = 3.0;
    private nextCavalierAtSeconds = 0;

    // Throws red wine
    private readonly wineDamage = 8;
    private readonly wineCooldownSeconds = 3.5;
    private readonly wineRange = 20;
    private nextWineAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: NapoleonAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private cannonState: CannonState | null = null;
    private cavalierState: CavalierState | null = null;
    private wineState: WineState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials
    private readonly cannonMaterial = this.createEffectMaterial(
        new Color(0.9, 0.4, 0.1), new Color(1, 0.5, 0.15), 4.0, 0.85
    );
    
    private readonly wineMaterial = this.createEffectMaterial(
        new Color(0.7, 0.05, 0.05), new Color(0.9, 0.1, 0.1), 2.5, 0.75
    );
    private readonly cannonGlowMaterial = this.createEffectMaterial(
        new Color(1, 0.6, 0.2), new Color(1, 0.7, 0.3), 5.0, 0.9
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Napoleon")) {
        super(id, maxHealth, entity, "Napoleon Bonaparte");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.15;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

        this.setIntroTaunt("Vive la France!", "Long live France!");
        this.setIntroNameTranslation("Napoléon Bonaparte", "Napoleon Bonaparte");
        this.setTauntSet({
            highHealth: [
                "You face the Emperor of the French.",
                "My Grande Armée has conquered nations.",
                "Impossible is a word found only in the dictionary of fools."
            ],
            bossLowPlayerHigh: [
                "A hundred days shall be enough to turn the tide!",
                "Waterloo was but a setback!",
                "The eagle of France does not perish!"
            ],
            playerLowBossHigh: [
                "Surrender, and I shall be magnanimous.",
                "Your resistance is futile.",
                "Every soldier carries a marshal's baton—except you."
            ],
            bothLow: [
                "From the heights of Austerlitz to the depths…",
                "France demands one more victory!"
            ],
            death: [
                "France… army… Joséphine…",
                "I die on the field of honor."
            ],
            bossDeath: [
                "The eagle… falls.",
                "My empire… crumbles."
            ]
        });
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

        if (this.cannonState) { this.updateCannon(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.cavalierState) { this.updateCavalier(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.wineState) { this.updateWine(dt, targetEntity, currentTimeSeconds, onAttack); return; }

        if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "cannon") { this.startCannon(targetEntity, currentTimeSeconds); return; }
        if (chosen === "cavalier") { this.startCavalier(targetEntity, currentTimeSeconds); return; }
        if (chosen === "wine") { this.startWine(currentTimeSeconds); return; }

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
        return { ...base, attackDamage: this.cannonDamage, attackRange: this.cannonRange, attackCooldown: this.cannonCooldownSeconds, detectionRange: Number.MAX_VALUE };
    }

    // ── Attack selection ──
    private pickNextAttack(distance: number, now: number): NapoleonAttackType | null {
        const choices: Array<{ type: NapoleonAttackType; score: number }> = [];
        if (now >= this.nextCannonAtSeconds && distance <= this.cannonRange) {
            choices.push({ type: "cannon", score: 1.3 + (distance / Math.max(0.001, this.cannonRange)) });
        }
        if (now >= this.nextCavalierAtSeconds && distance >= this.cavalierRangeMin && distance <= this.cavalierRangeMax) {
            choices.push({ type: "cavalier", score: 1.1 });
        }
        if (now >= this.nextWineAtSeconds && distance <= this.wineRange) {
            const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.wineRange));
            choices.push({ type: "wine", score: 0.9 + closeness });
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

    // ── Cannon ──
    private startCannon(_target: Entity, now: number): void {
        this.lastAttackType = "cannon"; this.lastAttackAtSeconds = now;
        // Create glow telegraph
        const glow = new Entity("napoleon-cannon-glow");
        glow.addComponent("render", { type: "sphere", material: this.cannonGlowMaterial });
        glow.setLocalScale(2, 2, 2);
        const myPos = this.getEntity().getPosition();
        glow.setPosition(myPos.x, myPos.y + 1, myPos.z);
        this.getEntity().addChild(glow);
        this.activeEffects.add(glow);

        this.cannonState = { endTimeSeconds: now + 0.8, hasFired: false, glow };
        this.attackLockUntilSeconds = this.cannonState.endTimeSeconds + 0.4;
    }

    private updateCannon(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.cannonState; if (!state) return;
        this.faceTarget(target, dt);

        if (!state.hasFired && now >= state.endTimeSeconds - 0.1) {
            state.hasFired = true;
            this.destroyEffect(state.glow);
            // Fire cannonball projectile
            this.spawnCannonball(target);
            const dist = this.getFlatDistanceTo(target);
            if (dist <= this.cannonHitRadius) {
                this.applyDamage(this.cannonDamage, onAttack);
            } else if (dist <= this.cannonRange) {
                // Near-miss: half damage
                this.applyDamage(Math.floor(this.cannonDamage * 0.5), onAttack);
            }
        }

        if (now >= state.endTimeSeconds) {
            this.cannonState = null;
            this.nextCannonAtSeconds = now + this.cannonCooldownSeconds;
        }
    }

    private spawnCannonball(target: Entity): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const ball = new Entity("napoleon-cannonball");
        ball.addComponent("render", { type: "sphere", material: this.cannonMaterial });
        ball.setLocalScale(1.5, 1.5, 1.5);
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
        ball.setPosition(myPos.x + dir.x * 2, myPos.y + 1, myPos.z + dir.z * 2);
        this.getEntity().parent?.addChild(ball) ?? this.getEntity().addChild(ball);
        this.activeEffects.add(ball);
        const startPos = ball.getPosition().clone();
        const speed = 30; const startMs = Date.now(); const maxMs = 2000;
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= maxMs || !ball.parent) { this.destroyEffect(ball); return; }
            const t = elapsed / 1000;
            ball.setPosition(startPos.x + dir.x * speed * t, startPos.y + Math.sin(t * 3) * 0.5, startPos.z + dir.z * speed * t);
            const mat = ball.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = 0.85 * (1 - elapsed / maxMs); mat.update(); }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // ── Cavalier charge ──
    private startCavalier(target: Entity, now: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) return; dir.normalize();
        this.lastAttackType = "cavalier"; this.lastAttackAtSeconds = now;
        this.cavalierState = { endTimeSeconds: now + this.cavalierDurationSeconds, hasCharged: false, direction: dir };
        this.attackLockUntilSeconds = this.cavalierState.endTimeSeconds + 0.35;
    }

    private updateCavalier(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.cavalierState; if (!state) return;
        this.moveToward(state.direction.x, state.direction.z, this.cavalierSpeed, dt);
        if (!state.hasCharged && this.getFlatDistanceTo(target) <= this.cavalierHitRadius) {
            state.hasCharged = true;
            this.applyDamage(this.cavalierDamage, onAttack);
        }
        if (now >= state.endTimeSeconds) {
            this.cavalierState = null;
            this.nextCavalierAtSeconds = now + this.cavalierCooldownSeconds;
        }
    }

    // ── Wine throw ──
    private startWine(now: number): void {
        this.lastAttackType = "wine"; this.lastAttackAtSeconds = now;
        this.wineState = { endTimeSeconds: now + 0.5, hasThrown: false };
        this.attackLockUntilSeconds = this.wineState.endTimeSeconds;
    }

    private updateWine(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.wineState; if (!state) return;
        this.faceTarget(target, dt);
        if (!state.hasThrown) {
            state.hasThrown = true;
            this.spawnWineSplash(target);
            if (this.getFlatDistanceTo(target) <= this.wineRange) {
                this.applyDamage(this.wineDamage, onAttack);
            }
        }
        if (now >= state.endTimeSeconds) {
            this.wineState = null;
            this.nextWineAtSeconds = now + this.wineCooldownSeconds;
        }
    }

    private spawnWineSplash(target: Entity): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
        const splash = new Entity("napoleon-wine");
        splash.addComponent("render", { type: "sphere", material: this.wineMaterial });
        splash.setLocalScale(1.2, 1.2, 1.2);
        splash.setPosition(myPos.x + dir.x * 2, myPos.y + 1.5, myPos.z + dir.z * 2);
        this.getEntity().parent?.addChild(splash) ?? this.getEntity().addChild(splash);
        this.activeEffects.add(splash);
        const startPos = splash.getPosition().clone();
        const speed = 25; const startMs = Date.now(); const maxMs = 1000;
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= maxMs || !splash.parent) { this.destroyEffect(splash); return; }
            const t = elapsed / 1000;
            const arc = Math.sin(t * Math.PI) * 3;
            splash.setPosition(startPos.x + dir.x * speed * t, startPos.y + arc, startPos.z + dir.z * speed * t);
            const mat = splash.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = 0.75 * (1 - elapsed / maxMs); mat.update(); }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // ── Helpers ──
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

    private destroyEffect(entity: Entity | null | undefined): void {
        if (!entity) return; this.activeEffects.delete(entity);
        if (entity.parent) entity.parent.removeChild(entity); entity.destroy();
    }

    private cleanupEffects(): void {
        for (const effect of this.activeEffects) { try { if (effect.parent) effect.parent.removeChild(effect); effect.destroy(); } catch { /* */ } }
        this.activeEffects.clear(); this.cannonState = null; this.cavalierState = null; this.wineState = null;
    }
}
