import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type WashingtonAttackType = "throwTea" | "buildMonument" | "giantSword";

interface ThrowTeaState {
    endTimeSeconds: number;
    hasThrown: boolean;
}

interface BuildMonumentState {
    endTimeSeconds: number;
    hasBuilt: boolean;
}

interface GiantSwordState {
    endTimeSeconds: number;
    phase: "windup" | "swing";
    hasHit: boolean;
}

export class GeorgeWashington extends Boss {
    // Throw tea
    private readonly teaDamage = 12;
    private readonly teaCooldownSeconds = 4.0;
    private readonly teaRange = 18;
    private readonly teaHitRadius = 3.5;
    private nextTeaAtSeconds = 0;

    // Build monument
    private readonly monumentDamage = 10;
    private readonly monumentCooldownSeconds = 8.0;
    private readonly monumentRange = 15;
    private nextMonumentAtSeconds = 0;

    // Giant sword
    private readonly swordDamage = 20;
    private readonly swordCooldownSeconds = 6.0;
    private readonly swordRange = 8;
    private readonly swordHitRadius = 5.0;
    private nextSwordAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: WashingtonAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private teaState: ThrowTeaState | null = null;
    private monumentState: BuildMonumentState | null = null;
    private swordState: GiantSwordState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials
    private readonly teaMaterial = this.createEffectMaterial(
        new Color(0.5, 0.35, 0.15), new Color(0.7, 0.5, 0.2), 2.5, 0.8
    );
    private readonly monumentMaterial = this.createEffectMaterial(
        new Color(0.85, 0.85, 0.8), new Color(1, 1, 0.95), 2.0, 0.7
    );
    private readonly swordMaterial = this.createEffectMaterial(
        new Color(0.9, 0.85, 0.6), new Color(1, 0.95, 0.7), 4.0, 0.9
    );
    private readonly swordRingMaterial = this.createEffectMaterial(
        new Color(0.8, 0.75, 0.4), new Color(1, 0.9, 0.5), 3.0, 0.6
    );
    private readonly teaSplashMaterial = this.createEffectMaterial(
        new Color(0.6, 0.4, 0.15), new Color(0.8, 0.55, 0.2), 2.0, 0.6
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("George Washington")) {
        super(id, maxHealth, entity, "George Washington");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

        this.setIntroTaunt("I shall defend my country!", "I shall defend my country!");
        this.setIntroNameTranslation("George Washington", "George Washington");
        this.setTauntSet({
            highHealth: [
                "You face the father of a nation.",
                "Liberty shall not fall to the likes of you.",
                "Stand down, for I shall not yield."
            ],
            bossLowPlayerHigh: [
                "A nation born in fire does not extinguish so easily!",
                "I have endured worse winters than this.",
                "You underestimate the resolve of a revolutionary."
            ],
            playerLowBossHigh: [
                "Surrender now, and I may show mercy.",
                "Your cause is lost.",
                "The tide of battle has turned."
            ],
            bothLow: [
                "Only one of us walks away from this field.",
                "To the very last breath."
            ],
            death: [
                "I regret I have but one life to give…",
                "The fight goes on without me."
            ],
            bossDeath: [
                "Freedom… endures.",
                "My nation… will carry on."
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

        if (this.teaState) { this.updateTea(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.monumentState) { this.updateMonument(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.swordState) { this.updateSword(dt, targetEntity, currentTimeSeconds, onAttack); return; }

        if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "throwTea") { this.startTea(targetEntity, currentTimeSeconds); return; }
        if (chosen === "buildMonument") { this.startMonument(targetEntity, currentTimeSeconds); return; }
        if (chosen === "giantSword") { this.startSword(targetEntity, currentTimeSeconds); return; }

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
        return { ...base, attackDamage: this.swordDamage, attackRange: this.swordRange, attackCooldown: this.swordCooldownSeconds, detectionRange: Number.MAX_VALUE };
    }

    // ── Attack selection ──
    private pickNextAttack(distance: number, now: number): WashingtonAttackType | null {
        const choices: Array<{ type: WashingtonAttackType; score: number }> = [];
        if (now >= this.nextTeaAtSeconds && distance <= this.teaRange) {
            choices.push({ type: "throwTea", score: 1.2 });
        }
        if (now >= this.nextMonumentAtSeconds && distance <= this.monumentRange) {
            choices.push({ type: "buildMonument", score: 1.0 });
        }
        if (now >= this.nextSwordAtSeconds && distance <= this.swordRange) {
            choices.push({ type: "giantSword", score: 1.4 });
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

    // ── Throw tea ──
    private startTea(target: Entity, now: number): void {
        this.lastAttackType = "throwTea"; this.lastAttackAtSeconds = now;
        this.teaState = { endTimeSeconds: now + 0.8, hasThrown: false };
        this.attackLockUntilSeconds = this.teaState.endTimeSeconds;
    }

    private updateTea(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.teaState; if (!state) return;
        this.faceTarget(target, dt);
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();

        if (!state.hasThrown) {
            state.hasThrown = true;
            const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();

            // Tea crate projectile
            const teaCrate = new Entity("washington-tea");
            teaCrate.addComponent("render", { type: "box", material: this.teaMaterial });
            teaCrate.setLocalScale(1.2, 1.2, 1.2);
            const startPos = new Vec3(myPos.x + dir.x * 2, myPos.y + 1.5, myPos.z + dir.z * 2);
            teaCrate.setPosition(startPos.x, startPos.y, startPos.z);
            const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
            teaCrate.setLocalEulerAngles(0, yaw, 0);
            this.getEntity().parent?.addChild(teaCrate) ?? this.getEntity().addChild(teaCrate);
            this.activeEffects.add(teaCrate);

            const endPos = new Vec3(myPos.x + dir.x * 16, myPos.y + 1.5, myPos.z + dir.z * 16);
            const startMs = Date.now(); const durationMs = 600;
            const tick = () => {
                const elapsed = Date.now() - startMs;
                const t = Math.min(1, elapsed / durationMs);
                const arcHeight = 3 * Math.sin(t * Math.PI);
                teaCrate.setPosition(
                    startPos.x + (endPos.x - startPos.x) * t,
                    startPos.y + arcHeight,
                    startPos.z + (endPos.z - startPos.z) * t
                );
                teaCrate.setLocalEulerAngles(0, yaw, elapsed * 0.5);
                if (elapsed >= durationMs) {
                    const splashPos = teaCrate.getPosition();
                    this.spawnRingEffect(new Vec3(splashPos.x, myPos.y, splashPos.z), this.teaHitRadius, 500, this.teaSplashMaterial, "tea-splash", 0.7);
                    const dx = targetPos.x - splashPos.x;
                    const dz = targetPos.z - splashPos.z;
                    if (Math.sqrt(dx * dx + dz * dz) <= this.teaHitRadius) {
                        this.applyDamage(this.teaDamage, onAttack);
                    }
                    this.destroyEffect(teaCrate);
                    return;
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        if (now >= state.endTimeSeconds) {
            this.teaState = null;
            this.nextTeaAtSeconds = now + this.teaCooldownSeconds;
        }
    }

    // ── Build monument ──
    private startMonument(target: Entity, now: number): void {
        this.lastAttackType = "buildMonument"; this.lastAttackAtSeconds = now;
        this.monumentState = { endTimeSeconds: now + 1.5, hasBuilt: false };
        this.attackLockUntilSeconds = this.monumentState.endTimeSeconds;
    }

    private updateMonument(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.monumentState; if (!state) return;
        this.faceTarget(target, dt);
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();

        if (!state.hasBuilt) {
            state.hasBuilt = true;
            const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
            const monumentBase = new Vec3(
                myPos.x + dir.x * 5,
                myPos.y,
                myPos.z + dir.z * 5
            );

            const monument = new Entity("washington-monument");
            monument.addComponent("render", { type: "box", material: this.monumentMaterial });
            monument.setLocalScale(1.5, 8, 1.5);
            monument.setPosition(monumentBase.x, monumentBase.y - 8, monumentBase.z);
            this.getEntity().parent?.addChild(monument) ?? this.getEntity().addChild(monument);
            this.activeEffects.add(monument);

            const startMs = Date.now(); const riseMs = 800; const totalMs = 2000;
            const tick = () => {
                const elapsed = Date.now() - startMs;
                if (elapsed < riseMs) {
                    const t = elapsed / riseMs;
                    monument.setPosition(monumentBase.x, monumentBase.y - 8 + 12 * t, monumentBase.z);
                }
                if (elapsed >= totalMs) { this.destroyEffect(monument); return; }
                const mat = monument.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
                if (mat && elapsed > totalMs * 0.6) {
                    mat.opacity = 0.7 * (1 - (elapsed - totalMs * 0.6) / (totalMs * 0.4));
                    mat.update();
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);

            const dx = targetPos.x - monumentBase.x;
            const dz = targetPos.z - monumentBase.z;
            if (Math.sqrt(dx * dx + dz * dz) <= 4) {
                this.applyDamage(this.monumentDamage, onAttack);
            }
        }

        if (now >= state.endTimeSeconds) {
            this.monumentState = null;
            this.nextMonumentAtSeconds = now + this.monumentCooldownSeconds;
        }
    }

    // ── Giant sword ──
    private startSword(target: Entity, now: number): void {
        this.lastAttackType = "giantSword"; this.lastAttackAtSeconds = now;
        this.swordState = { endTimeSeconds: now + 1.4, phase: "windup", hasHit: false };
        this.attackLockUntilSeconds = this.swordState.endTimeSeconds;
    }

    private updateSword(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.swordState; if (!state) return;
        this.faceTarget(target, dt);
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();

        if (state.phase === "windup" && (now >= state.endTimeSeconds - 0.6)) {
            state.phase = "swing";
            this.spawnRingEffect(myPos, this.swordHitRadius, 400, this.swordRingMaterial, "sword-telegraph", 0.5);
        }

        if (state.phase === "swing" && !state.hasHit) {
            state.hasHit = true;
            const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
            const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;

            const blade = new Entity("washington-sword");
            blade.addComponent("render", { type: "box", material: this.swordMaterial });
            blade.setLocalScale(0.4, 6, 3);
            blade.setPosition(myPos.x + dir.x * 3, myPos.y + 3, myPos.z + dir.z * 3);
            blade.setLocalEulerAngles(-30, yaw, 0);
            this.getEntity().parent?.addChild(blade) ?? this.getEntity().addChild(blade);
            this.activeEffects.add(blade);

            const startMs = Date.now(); const durationMs = 500;
            const tick = () => {
                const elapsed = Date.now() - startMs;
                const t = Math.min(1, elapsed / durationMs);
                blade.setLocalEulerAngles(-30 + 60 * t, yaw + 90 * t, 0);
                const mat = blade.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
                if (mat) { mat.opacity = 0.9 * (1 - t * 0.5); mat.update(); }
                if (elapsed >= durationMs) { this.destroyEffect(blade); return; }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);

            if (this.getFlatDistanceTo(target) <= this.swordHitRadius) {
                this.applyDamage(this.swordDamage, onAttack);
            }
        }

        if (now >= state.endTimeSeconds) {
            this.swordState = null;
            this.nextSwordAtSeconds = now + this.swordCooldownSeconds;
        }
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
            const mat = ring.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = opacity * (1 - elapsed / durationMs); mat.update(); }
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
        this.activeEffects.clear(); this.teaState = null; this.monumentState = null; this.swordState = null;
    }
}
