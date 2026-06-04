import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color, AppBase } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type WilliamAttackType = "charge" | "shieldBash" | "royalDash" | "shockwave" | "armorOfConquest";

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

interface RoyalDashState {
    endTimeSeconds: number;
    direction: Vec3;
    hasHit: boolean;
    trail?: Entity | null;
}

interface ShockwaveState {
    root: Entity;
    origin: Vec3;
    segments: Entity[];
    haloSegments: Entity[];
    startTimeSeconds: number;
    durationSeconds: number;
    maxRadius: number;
    lastRadius: number;
    hasHit: boolean;
}

export class WilliamTheConquerer extends Boss {
    // Charge attack: a cavalry-style rush forward.
    private readonly chargeSpeed = PLAYER_MOVE_SPEED * 2.6;
    // Royal dash: fast forward dash that freezes the player on hit.
    private readonly royalDashSpeed = PLAYER_MOVE_SPEED * 3.5;
    private readonly royalDashDurationSeconds = 0.4;
    private readonly royalDashRecoverSeconds = 0.3;
    private readonly royalDashCooldownSeconds = 6.0;
    private readonly royalDashFreezeMs = 3000;
    private nextRoyalDashAtSeconds = 0;
    // Shockwave: large area damage with knockback.
    private readonly shockwaveRadius = 20;
    private readonly shockwaveDamage = 22;
    private readonly shockwaveKnockback = 500;
    private readonly shockwaveCooldownSeconds = 8.0;
    private readonly shockwaveWindupSeconds = 0.7;
    private readonly shockwaveWaveSpeed = 54;
    private readonly shockwaveWaveThickness = 4.5;
    private readonly shockwaveWaveMinDuration = 1.4;
    private readonly shockwaveWaveMaxDuration = 4.8;
    private readonly shockwaveDefaultWaveRadius = 250;
    private readonly shockwaveWaveSegments = 34;
    private readonly shockwaveWaveSegmentScale = 0.95;
    private nextShockwaveAtSeconds = 0;
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
    private royalDashState: RoyalDashState | null = null;
    private shockwaveState: ShockwaveState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;
    private playerEntity?: Entity;

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
                "Big Willie had an oppsie."
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
        this.playerEntity = playerEntity ?? undefined;
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
        if (this.royalDashState) {
            this.updateRoyalDash(clampedDeltaTime, targetEntity, currentTimeSeconds, onAttack);
            return;
        }
        if (this.shockwaveState) {
            this.updateShockwave(clampedDeltaTime, targetEntity, currentTimeSeconds, onAttack);
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
        if (chosenAttack === "royalDash") {
            this.startRoyalDash(targetEntity, currentTimeSeconds);
            return;
        }
        if (chosenAttack === "shockwave") {
            this.startShockwave(currentTimeSeconds);
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
        const canRoyalDash = nowSeconds >= this.nextRoyalDashAtSeconds && distance <= this.chargeRangeMax;
        const canShockwave = nowSeconds >= this.nextShockwaveAtSeconds;
        if (canBash) {
            const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.shieldBashRange));
            choices.push({ type: "shieldBash", score: 1.0 + closeness });
        }
        if (canRoyalDash) {
            // Prefer royal dash when close enough and not recently used.
            const closeness = 1 - Math.min(1, distance / this.chargeRangeMax);
            choices.push({ type: "royalDash", score: 1.2 + closeness });
        }
        if (canShockwave) {
            // Shockwave is a powerful area attack.
            const distanceScore = distance <= this.shockwaveRadius ? 1.2 : 0.5;
            choices.push({ type: "shockwave", score: 0.9 + distanceScore });
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
        // Additional shockwave visual
        this.spawnRingEffect(this.getEntity().getPosition(), this.shockwaveRadius * 1.4, 800, this.shieldBashMaterial, "william shockwave-large", 0.3);
        }

        if (nowSeconds >= state.endTimeSeconds) {
            this.shieldBashState = null;
            this.nextShieldBashAtSeconds = nowSeconds + this.shieldBashCooldownSeconds;
        }
    }

    // ── Royal Dash attack �n
    private startRoyalDash(targetEntity: Entity, nowSeconds: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) {
            return;
        }
        dir.normalize();
        this.lastAttackType = "royalDash";
        this.lastAttackAtSeconds = nowSeconds;
        this.royalDashState = {
            endTimeSeconds: nowSeconds + this.royalDashDurationSeconds,
            direction: dir,
            hasHit: false,
            trail: this.createChargeTrail()
        };
        this.attackLockUntilSeconds = this.royalDashState.endTimeSeconds + this.royalDashRecoverSeconds;
    }

    private updateRoyalDash(
        deltaTime: number,
        targetEntity: Entity,
        nowSeconds: number,
        onAttack?: (attacker: npc) => void
    ): void {
        const state = this.royalDashState;
        if (!state) {
            return;
        }
        this.moveToward(state.direction.x, state.direction.z, this.royalDashSpeed, deltaTime);
        if (state.trail) {
            this.updateChargeTrail(state.trail, state.direction);
        }
        if (!state.hasHit && this.getFlatDistanceTo(targetEntity) <= this.chargeHitRadius) {
            state.hasHit = true;
            this.applyDamage(this.chargeDamage, onAttack);
            // Freeze player
            const controller = (targetEntity as any)?.script?.FirstPersonCamera ?? (targetEntity as any)?.script?.firstPersonCamera;
            if (controller) {
                const lockFn: any = controller.setMovementLocked ?? ((locked: boolean) => { controller.movementLocked = locked; });
                lockFn(true);
                setTimeout(() => {
                    lockFn(false);
                }, this.royalDashFreezeMs);
                // Dash impact visual effect
                this.spawnRingEffect(this.getEntity().getPosition(), 2, 300, this.shieldBashMaterial, "william-royal-dash-impact", 0.5);
            }
        }
        if (nowSeconds >= state.endTimeSeconds) {
            this.destroyEffect(state.trail);
            this.royalDashState = null;
            this.nextRoyalDashAtSeconds = nowSeconds + this.royalDashCooldownSeconds;
        }
    }

    // ── Shockwave attack ──

    private startShockwave(nowSeconds: number): void {
        this.lastAttackType = "shockwave";
        this.lastAttackAtSeconds = nowSeconds;
        const origin = this.getEntity().getPosition();

        this.spawnRingEffect(origin, this.shockwaveRadius * 0.9, 260, this.shieldBashMaterial, "william shockwave-telegraph", 0.55);
        this.spawnRingEffect(origin, this.shockwaveRadius * 1.35, 520, this.shieldBashMaterial, "william shockwave-ripple-a", 0.38);
        this.spawnRingEffect(origin, this.shockwaveRadius * 1.85, 760, this.shieldBashMaterial, "william shockwave-ripple-b", 0.24);

        const wave = this.createShockwaveWaveEffect(origin, this.shockwaveWaveSegments);
        if (!wave) {
            this.nextShockwaveAtSeconds = nowSeconds + this.shockwaveCooldownSeconds;
            this.attackLockUntilSeconds = nowSeconds + 0.2;
            return;
        }

        const maxRadius = this.getShockwaveMaxRadius(origin);
        const durationSeconds = this.getShockwaveDuration(maxRadius);
        this.shockwaveState = {
            root: wave.root,
            origin,
            segments: wave.segments,
            haloSegments: wave.haloSegments,
            startTimeSeconds: nowSeconds + this.shockwaveWindupSeconds,
            durationSeconds,
            maxRadius,
            lastRadius: 0,
            hasHit: false
        };
        this.attackLockUntilSeconds = Math.max(this.attackLockUntilSeconds, this.shockwaveState.startTimeSeconds + durationSeconds);
    }

    private updateShockwave(
        deltaTime: number,
        targetEntity: Entity,
        nowSeconds: number,
        onAttack?: (attacker: npc) => void
    ): void {
        const state = this.shockwaveState;
        if (!state) {
            return;
        }

        this.faceTarget(targetEntity, deltaTime);

        if (nowSeconds < state.startTimeSeconds) {
            return;
        }

        const elapsed = nowSeconds - state.startTimeSeconds;
        const progress = Math.min(1, Math.max(0, elapsed / state.durationSeconds));
        const currentRadius = state.maxRadius * progress;

        this.updateShockwaveVisual(state, currentRadius);
        this.checkShockwaveHit(state, targetEntity, currentRadius, onAttack);
        state.lastRadius = currentRadius;

        if (progress >= 1) {
            this.destroyEffect(state.root);
            this.shockwaveState = null;
            this.nextShockwaveAtSeconds = nowSeconds + this.shockwaveCooldownSeconds;
            this.attackLockUntilSeconds = nowSeconds + 0.25;
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
        this.getEntity().parent?.addChild(ring) ?? this.getEntity().addChild(ring);
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
        this.shockwaveState = null;
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

    private resolveSceneApp(targetEntity?: Entity): AppBase | undefined {
        const selfEntity = this.getEntity() as any;
        const selfApp = (selfEntity?.app ?? selfEntity?._app) as AppBase | undefined;
        if (selfApp?.root) return selfApp;
        const targetAny = targetEntity as any;
        const targetApp = (targetAny?.app ?? targetAny?._app) as AppBase | undefined;
        if (targetApp?.root) return targetApp;
        const globalApp = (globalThis as any)?.app as AppBase | undefined;
        if (globalApp?.root) return globalApp;
        return undefined;
    }

    private updateShockwaveVisual(state: ShockwaveState, radius: number): void {
        const baseScale = Math.max(0.35, this.shockwaveWaveSegmentScale);
        const haloRadius = radius + (this.shockwaveWaveThickness * 0.6);
        const count = state.segments.length;
        const angleStep = (Math.PI * 2) / Math.max(1, count);

        for (let i = 0; i < count; i += 1) {
            const angle = angleStep * i;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const segment = state.segments[i];
            segment.setLocalPosition(x, 0.15, z);
            segment.setLocalScale(baseScale, baseScale, baseScale);

            const halo = state.haloSegments[i];
            if (halo) {
                const hx = Math.cos(angle) * haloRadius;
                const hz = Math.sin(angle) * haloRadius;
                const haloScale = Math.max(0.28, baseScale * 0.72);
                halo.setLocalPosition(hx, 0.08, hz);
                halo.setLocalScale(haloScale, haloScale, haloScale);
            }
        }
    }

    private checkShockwaveHit(
        state: ShockwaveState,
        targetEntity: Entity,
        radius: number,
        onAttack?: (attacker: npc) => void
    ): void {
        if (state.hasHit) {
            return;
        }

        const distance = this.getFlatDistanceTo(targetEntity);
        const band = this.shockwaveWaveThickness;
        const minR = Math.max(0, Math.min(state.lastRadius, radius) - band);
        const maxR = Math.max(state.lastRadius, radius) + band;

        if (distance < minR || distance > maxR) {
            return;
        }

        state.hasHit = true;
        this.applyDamage(this.shockwaveDamage, onAttack);
        this.applyShockwaveKnockback(targetEntity, state.origin);
    }

    private getShockwaveDuration(maxRadius: number): number {
        const duration = maxRadius / Math.max(1, this.shockwaveWaveSpeed);
        return Math.min(this.shockwaveWaveMaxDuration, Math.max(this.shockwaveWaveMinDuration, duration));
    }

    private getShockwaveMaxRadius(origin: Vec3): number {
        const player = this.playerEntity;
        if (!player) {
            return Math.max(this.shockwaveRadius * 2, this.shockwaveDefaultWaveRadius);
        }

        const targetPos = player.getPosition();
        const dx = targetPos.x - origin.x;
        const dz = targetPos.z - origin.z;
        const distance = Math.sqrt((dx * dx) + (dz * dz));
        return Math.max(this.shockwaveRadius * 2, distance + 18);
    }

    private createShockwaveWaveEffect(origin: Vec3, segmentCount: number): { root: Entity; segments: Entity[]; haloSegments: Entity[] } | null {
        const sceneApp = this.resolveSceneApp();
        if (!sceneApp?.root) {
            return null;
        }

        const root = new Entity("william shockwave wave");
        const segments: Entity[] = [];
        const haloSegments: Entity[] = [];
        const count = Math.max(8, segmentCount);

        for (let i = 0; i < count; i += 1) {
            const segment = new Entity(`william shockwave segment ${i}`);
            segment.addComponent("render", { type: "sphere" } as any);
            segment.setLocalScale(this.shockwaveWaveSegmentScale, this.shockwaveWaveSegmentScale, this.shockwaveWaveSegmentScale);
            if (segment.render?.meshInstances?.length) {
                segment.render.meshInstances[0].material = this.shieldBashMaterial;
            }
            root.addChild(segment);
            segments.push(segment);

            const halo = new Entity(`william shockwave halo ${i}`);
            halo.addComponent("render", { type: "sphere" } as any);
            const haloScale = Math.max(0.35, this.shockwaveWaveSegmentScale * 0.72);
            halo.setLocalScale(haloScale, haloScale, haloScale);
            if (halo.render?.meshInstances?.length) {
                halo.render.meshInstances[0].material = this.shieldBashMaterial;
            }
            root.addChild(halo);
            haloSegments.push(halo);
        }

        root.setPosition(origin.x, origin.y + 0.08, origin.z);
        sceneApp.root.addChild(root);
        this.activeEffects.add(root);
        return { root, segments, haloSegments };
    }



    private applyShockwaveKnockback(playerEntity: Entity, origin: Vec3): void {
        const controller = (playerEntity as any)?.script?.FirstPersonCamera ?? (playerEntity as any)?.script?.firstPersonCamera;
        const playerPos = playerEntity.getPosition().clone();
        const pushDir = playerPos.sub(origin);
        pushDir.y = 0;

        if (pushDir.lengthSq() <= 0.0001) {
            pushDir.set(0, 0, 1);
        } else {
            pushDir.normalize();
        }

        const knockback = this.shockwaveKnockback;
        const lift = Math.max(2.5, knockback * 0.22);

        if (controller) {
            if (controller.velocity) {
                controller.velocity.x += pushDir.x * knockback;
                controller.velocity.z += pushDir.z * knockback;
                controller.velocity.y = Math.max(controller.velocity.y, lift);
            }
            if (typeof controller.setMovementLocked === "function") {
                controller.setMovementLocked(false);
            }
        }

        const launchedPos = playerEntity.getPosition().clone();
        launchedPos.x += pushDir.x * knockback * 0.45;
        launchedPos.z += pushDir.z * knockback * 0.45;
        launchedPos.y += lift * 0.15;
        playerEntity.setPosition(launchedPos);
    }
}