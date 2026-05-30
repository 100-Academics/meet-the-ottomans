import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type WilliamAttackType = "charge" | "shieldBash";

interface ChargeState {
    endTimeSeconds: number;
    direction: Vec3;
    hasHit: boolean;
    trail?: Entity | null;
}

interface ShieldBashState {
    impactTimeSeconds: number;
    endTimeSeconds: number;
    hasHit: boolean;
}

export class WilliamTheConquerer extends Boss {
    // Charge attack: a cavalry-style rush forward.
    private readonly chargeSpeed = PLAYER_MOVE_SPEED * 2.6;
    private readonly chargeDurationSeconds = 0.6;
    private readonly chargeRecoverSeconds = 0.4;
    private readonly chargeCooldownSeconds = 5.0;
    private readonly chargeRangeMin = 8;
    private readonly chargeRangeMax = 35;
    private readonly chargeHitRadius = 3.6;
    private readonly chargeDamage = 18;
    private nextChargeAtSeconds = 0;

    // Shield bash: a close-range slam.
    private readonly shieldBashRange = 5;
    private readonly shieldBashDamage = 14;
    private readonly shieldBashWindupSeconds = 0.6;
    private readonly shieldBashRecoverSeconds = 0.5;
    private readonly shieldBashCooldownSeconds = 3.5;
    private readonly shieldBashRadius = 5.5;
    private nextShieldBashAtSeconds = 0;

    // Runtime state.
    private attackLockUntilSeconds = 0;
    private lastAttackType: WilliamAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private chargeState: ChargeState | null = null;
    private shieldBashState: ShieldBashState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials.
    private readonly chargeTrailMaterial = this.createEffectMaterial(
        new Color(0.85, 0.7, 0.3),
        new Color(1, 0.85, 0.4),
        3.8,
        0.8
    );
    private readonly shieldBashMaterial = this.createEffectMaterial(
        new Color(0.9, 0.78, 0.35),
        new Color(1, 0.9, 0.5),
        4.0,
        0.75
    );

    // Track spawned entities for cleanup.
    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("William the Conqueror")) {
        super(id, maxHealth, entity, "William the Conqueror");

        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.15;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

        // Old English intro only; taunts are in normal English.
        this.setIntroTaunt(
            "Ic eom Willelm, se þe þine forðfære bringeþ!",
            "I am William, he who conquered your land!"
        );
        this.setIntroNameTranslation(
            "Willelm se Gemanna",
            "William the Conqueror"
        );

        this.setTauntSet({
            highHealth: [
                "You stand before a king. Kneel.",
                "I have conquered greater foes than you.",
                "England is mine. Its power is my hand."
            ],
            bossLowPlayerHigh: [
                "A conqueror does not yield!",
                "I crossed the Channel once. I will cross again.",
                "You think me beaten? Think harder."
            ],
            playerLowBossHigh: [
                "Yield now and I may show mercy.",
                "Your resistance ends here.",
                "Every kingdom falls before me eventually."
            ],
            bothLow: [
                "Only one of us walks off this field.",
                "We are both wounded. Let us finish this.",
                "A conqueror fights to the last breath."
            ],
            death: [
                "I expected more from a warrior so grand.",
                "What more did you expect, challenging the man who conquered England by the hand of God."
            ],
            bossDeath: [
                "So falls the Conqueror",
                "The Norman sun sets."
            ]
        });
    }

    public override updateCombatAI(
        deltaTime: number,
        currentTimeSeconds: number,
        allNpcs: npc[],
        onNpcAttack?: (attacker: npc, target: npc, damage: number) => void,
        playerEntity?: Entity | null,
        onPlayerAttack?: (attacker: npc, damage: number) => void
    ): void {
        this.onPlayerAttack = onPlayerAttack;
        super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
    }

    public override updateAI(
        deltaTime: number,
        targetEntity: Entity | null,
        currentTimeSeconds: number,
        onAttack?: (attacker: npc) => void,
        profileOverride?: { attackDamage: number; attackRange: number; attackCooldown: number; detectionRange: number; }
    ): void {
        if (!this.isAlive()) {
            return;
        }
        const clampedDeltaTime = Math.max(0, Math.min(deltaTime, 0.05));

        if (!targetEntity) {
            super.updateAI(clampedDeltaTime, targetEntity, currentTimeSeconds, onAttack, profileOverride);
            return;
        }

        if (this.chargeState) {
            this.updateCharge(clampedDeltaTime, targetEntity, currentTimeSeconds, onAttack);
            return;
        }
        if (this.shieldBashState) {
            this.updateShieldBash(clampedDeltaTime, targetEntity, currentTimeSeconds, onAttack);
            return;
        }
        if (currentTimeSeconds < this.attackLockUntilSeconds) {
            this.faceTarget(targetEntity, clampedDeltaTime);
            return;
        }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosenAttack = this.pickNextAttack(distance, currentTimeSeconds);

        if (chosenAttack === "charge") {
            this.startCharge(targetEntity, currentTimeSeconds);
            return;
        }
        if (chosenAttack === "shieldBash") {
            this.startShieldBash(currentTimeSeconds);
            return;
        }

        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        this.moveToward(
            targetPos.x - myPos.x,
            targetPos.z - myPos.z,
            this.aiConfig.chaseMoveSpeed,
            clampedDeltaTime
        );
    }

    public override kill(): boolean {
        const didKill = super.kill();
        if (didKill) {
            this.cleanupEffects();
        }
        return didKill;
    }

    protected override getCombatProfile() {
        const base = super.getCombatProfile();
        return {
            ...base,
            attackDamage: this.chargeDamage,
            attackRange: Math.max(this.chargeRangeMax, this.shieldBashRange),
            attackCooldown: Math.min(this.chargeCooldownSeconds, this.shieldBashCooldownSeconds),
            detectionRange: Number.MAX_VALUE
        };
    }

    // ── Attack selection ──

    private pickNextAttack(distance: number, nowSeconds: number): WilliamAttackType | null {
        const choices: Array<{ type: WilliamAttackType; score: number }> = [];

        const canCharge = nowSeconds >= this.nextChargeAtSeconds
            && distance >= this.chargeRangeMin
            && distance <= this.chargeRangeMax;
        if (canCharge) {
            const mid = (this.chargeRangeMin + this.chargeRangeMax) * 0.5;
            const halfSpan = Math.max(0.001, (this.chargeRangeMax - this.chargeRangeMin) * 0.5);
            const centered = 1 - Math.min(1, Math.abs(distance - mid) / halfSpan);
            choices.push({ type: "charge", score: 1.1 + centered });
        }

        const canBash = nowSeconds >= this.nextShieldBashAtSeconds
            && distance <= this.shieldBashRange;
        if (canBash) {
            const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.shieldBashRange));
            choices.push({ type: "shieldBash", score: 1.0 + closeness });
        }

        if (choices.length === 0) {
            return null;
        }

        const recentWindowSeconds = 1.8;
        if (this.lastAttackType && (nowSeconds - this.lastAttackAtSeconds) < recentWindowSeconds) {
            for (const choice of choices) {
                if (choice.type === this.lastAttackType) {
                    choice.score *= 0.55;
                }
            }
        }

        let best = choices[0];
        for (let i = 1; i < choices.length; i += 1) {
            if (choices[i].score > best.score) {
                best = choices[i];
            }
        }
        const tied = choices.filter((c) => Math.abs(c.score - best.score) < 0.05);
        if (tied.length > 1) {
            return tied[Math.floor(Math.random() * tied.length)].type;
        }
        return best.type;
    }

    // ── Charge attack ──

    private startCharge(targetEntity: Entity, nowSeconds: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) {
            return;
        }
        dir.normalize();

        this.lastAttackType = "charge";
        this.lastAttackAtSeconds = nowSeconds;
        this.chargeState = {
            endTimeSeconds: nowSeconds + this.chargeDurationSeconds,
            direction: dir,
            hasHit: false,
            trail: this.createChargeTrail()
        };
        this.attackLockUntilSeconds = this.chargeState.endTimeSeconds + this.chargeRecoverSeconds;
    }

    private updateCharge(
        deltaTime: number,
        targetEntity: Entity,
        nowSeconds: number,
        onAttack?: (attacker: npc) => void
    ): void {
        const state = this.chargeState;
        if (!state) {
            return;
        }
        this.moveToward(state.direction.x, state.direction.z, this.chargeSpeed, deltaTime);

        if (state.trail) {
            this.updateChargeTrail(state.trail, state.direction);
        }

        if (!state.hasHit && this.getFlatDistanceTo(targetEntity) <= this.chargeHitRadius) {
            state.hasHit = true;
            this.applyDamage(this.chargeDamage, onAttack);
        }

        if (nowSeconds >= state.endTimeSeconds) {
            this.destroyEffect(state.trail);
            this.chargeState = null;
            this.nextChargeAtSeconds = nowSeconds + this.chargeCooldownSeconds;
        }
    }

    private createChargeTrail(): Entity | null {
        const trail = new Entity("william-charge-trail");
        trail.addComponent("render", {
            type: "box",
            material: this.chargeTrailMaterial
        });
        trail.setLocalScale(0.6, 0.3, 2.5);
        this.getEntity().addChild(trail);
        this.activeEffects.add(trail);
        return trail;
    }

    private updateChargeTrail(trail: Entity, _direction: Vec3): void {
        const pos = this.getEntity().getPosition();
        trail.setPosition(pos.x, pos.y - 0.5, pos.z);
    }

    // ── Shield bash attack ──

    private startShieldBash(nowSeconds: number): void {
        this.lastAttackType = "shieldBash";
        this.lastAttackAtSeconds = nowSeconds;
        const impactTimeSeconds = nowSeconds + this.shieldBashWindupSeconds;
        this.shieldBashState = {
            impactTimeSeconds,
            endTimeSeconds: impactTimeSeconds + this.shieldBashRecoverSeconds,
            hasHit: false
        };
        this.attackLockUntilSeconds = this.shieldBashState.endTimeSeconds;

        this.spawnRingEffect(
            this.getEntity().getPosition(),
            this.shieldBashRadius,
            this.shieldBashWindupSeconds * 1000,
            this.shieldBashMaterial,
            "william shield bash telegraph",
            0.2
        );
    }

    private updateShieldBash(
        deltaTime: number,
        targetEntity: Entity,
        nowSeconds: number,
        onAttack?: (attacker: npc) => void
    ): void {
        const state = this.shieldBashState;
        if (!state) {
            return;
        }
        this.faceTarget(targetEntity, deltaTime);

        if (!state.hasHit && nowSeconds >= state.impactTimeSeconds) {
            state.hasHit = true;
            if (this.getFlatDistanceTo(targetEntity) <= this.shieldBashRadius) {
                this.applyDamage(this.shieldBashDamage, onAttack);
            }
            this.spawnRingEffect(
                this.getEntity().getPosition(),
                this.shieldBashRadius * 1.3,
                400,
                this.shieldBashMaterial,
                "william shield bash shockwave",
                0.25
            );
        }

        if (nowSeconds >= state.endTimeSeconds) {
            this.shieldBashState = null;
            this.nextShieldBashAtSeconds = nowSeconds + this.shieldBashCooldownSeconds;
        }
    }

    // ── VFX helpers ──

    private createEffectMaterial(
        emissiveColor: Color,
        diffuseColor: Color,
        emissiveIntensity: number,
        opacity: number
    ): StandardMaterial {
        const mat = new StandardMaterial();
        mat.emissive = emissiveColor;
        mat.emissiveIntensity = emissiveIntensity;
        mat.diffuse = diffuseColor;
        mat.opacity = opacity;
        mat.blendType = BLEND_ADDITIVE;
        mat.cull = CULLFACE_NONE;
        mat.depthWrite = false;
        mat.update();
        return mat;
    }

    private spawnRingEffect(
        origin: Vec3,
        radius: number,
        durationMs: number,
        material: StandardMaterial,
        name: string,
        opacity: number
    ): void {
        const ring = new Entity(name);
        ring.addComponent("render", {
            type: "torus",
            material
        });
        ring.setPosition(origin.x, origin.y + 0.1, origin.z);
        ring.setLocalScale(radius, radius * 0.15, radius);
        this.getEntity().getParent()?.addChild(ring) ?? this.getEntity().addChild(ring);
        this.activeEffects.add(ring);

        const startMs = Date.now();
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= durationMs) {
                this.destroyEffect(ring);
                return;
            }
            const t = elapsed / durationMs;
            const mat = ring.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) {
                mat.opacity = opacity * (1 - t);
                mat.update();
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    private destroyEffect(entity: Entity | null | undefined): void {
        if (!entity) {
            return;
        }
        this.activeEffects.delete(entity);
        if (entity.parent) {
            entity.parent.removeChild(entity);
        }
        entity.destroy();
    }

    private cleanupEffects(): void {
        for (const effect of this.activeEffects) {
            try {
                if (effect.parent) {
                    effect.parent.removeChild(effect);
                }
                effect.destroy();
            } catch {
                // Swallow — scene teardown may have already destroyed the entity.
            }
        }
        this.activeEffects.clear();
        this.chargeState = null;
        this.shieldBashState = null;
    }

    // ── Utility methods (same pattern as GenghisKhan) ──

    private faceTarget(targetEntity: Entity, deltaTime: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, 0, deltaTime);
    }

    private getFlatDistanceTo(targetEntity: Entity): number {
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dx = targetPos.x - myPos.x;
        const dz = targetPos.z - myPos.z;
        return Math.sqrt((dx * dx) + (dz * dz));
    }

    private applyDamage(damage: number, onAttack?: (attacker: npc) => void): void {
        if (this.onPlayerAttack) {
            this.onPlayerAttack(this, damage);
            return;
        }
        if (onAttack) {
            onAttack(this);
        }
    }
}