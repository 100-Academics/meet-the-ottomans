import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type KingGeorgeAttackType = "royalGuardWall" | "crownBoomerang" | "iceDash";

interface RoyalGuardWallState {
    endTimeSeconds: number;
    hasSpawned: boolean;
}

interface CrownBoomerangState {
    endTimeSeconds: number;
    phase: "throwing" | "returning";
    hasHitOut: boolean;
    hasHitReturn: boolean;
    crown?: Entity | null;
    targetPos: Vec3;
}

interface IceDashState {
    endTimeSeconds: number;
    direction: Vec3;
    hasHit: boolean;
    freezeDurationSeconds: number;
}

export class KingGeorgeIII extends Boss {
    // Royal guard wall
    private readonly guardWallDamage = 10;
    private readonly guardWallCooldownSeconds = 8.0;
    private readonly guardWallRange = 20;
    private readonly guardWallCount = 4;
    private nextGuardWallAtSeconds = 0;

    // Crown boomerang
    private readonly crownDamage = 14;
    private readonly crownCooldownSeconds = 5.0;
    private readonly crownRange = 25;
    private readonly crownHitRadius = 2.5;
    private nextCrownAtSeconds = 0;

    // Ice Dash
    private readonly iceDashSpeed = PLAYER_MOVE_SPEED * 2.8;
    private readonly iceDashDurationSeconds = 0.45;
    private readonly iceDashDamage = 14;
    private readonly iceDashCooldownSeconds = 5.0;
    private readonly iceDashRangeMin = 6;
    private readonly iceDashRangeMax = 24;
    private readonly iceDashHitRadius = 3.5;
    private readonly iceFreezeDurationSeconds = 1.8;
    private nextIceDashAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: KingGeorgeAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private guardWallState: RoyalGuardWallState | null = null;
    private crownState: CrownBoomerangState | null = null;
    private iceDashState: IceDashState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials
    private readonly guardMaterial = this.createEffectMaterial(
        new Color(0.8, 0.7, 0.2), new Color(1, 0.85, 0.3), 2.5, 0.7
    );
    private readonly crownMaterial = this.createEffectMaterial(
        new Color(1, 0.85, 0.1), new Color(1, 0.95, 0.3), 4.0, 0.9
    );
    private readonly iceDashTrailMaterial = this.createEffectMaterial(
        new Color(0.4, 0.75, 0.95), new Color(0.6, 0.85, 1.0), 3.5, 0.8
    );
    private readonly iceFreezeMaterial = this.createEffectMaterial(
        new Color(0.5, 0.8, 1.0), new Color(0.7, 0.9, 1.0), 2.0, 0.6
    );
    private readonly guardRingMaterial = this.createEffectMaterial(
        new Color(0.6, 0.5, 0.15), new Color(0.8, 0.7, 0.2), 2.0, 0.5
    );
    private readonly iceBurstMaterial = this.createEffectMaterial(
        new Color(0.6, 0.85, 1.0), new Color(0.8, 0.95, 1.0), 4.0, 0.7
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("King George III")) {
        super(id, maxHealth, entity, "King George III");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

    this.setIntroTaunt("The King's word is law!", "The King's word is law!");
    this.setIntroNameTranslation("Rex Georgius III", "King George III");
    this.setIntroSkipTranslation(true);
    this.setTauntSet({
            highHealth: [
                "By royal decree, you shall fall.",
                "The Crown does not negotiate with rebels.",
                "God save the King!"
            ],
            bossLowPlayerHigh: [
                "The empire strikes back!",
                "I shall not lose the colonies!",
                "The redcoats will have their day!"
            ],
            playerLowBossHigh: [
                "Yield to the Crown, colonial.",
                "Your rebellion ends here.",
                "The King's justice is absolute."
            ],
            bothLow: [
                "For King and country!",
                "The Crown shall endure!"
            ],
            death: [
                "The kingdom… crumbles…",
                "I was a good king…"
            ],
            bossDeath: [
                "The Crown… passes.",
                "God save… the next King."
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

        if (this.guardWallState) { this.updateGuardWall(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.crownState) { this.updateCrown(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.iceDashState) { this.updateIceDash(dt, targetEntity, currentTimeSeconds, onAttack); return; }

        if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "royalGuardWall") { this.startGuardWall(targetEntity, currentTimeSeconds); return; }
        if (chosen === "crownBoomerang") { this.startCrown(targetEntity, currentTimeSeconds); return; }
        if (chosen === "iceDash") { this.startIceDash(targetEntity, currentTimeSeconds); return; }

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
        return { ...base, attackDamage: this.crownDamage, attackRange: this.crownRange, attackCooldown: this.crownCooldownSeconds, detectionRange: Number.MAX_VALUE };
    }

    // ── Attack selection ──
    private pickNextAttack(distance: number, now: number): KingGeorgeAttackType | null {
        const choices: Array<{ type: KingGeorgeAttackType; score: number }> = [];
        if (now >= this.nextGuardWallAtSeconds && distance <= this.guardWallRange) {
            choices.push({ type: "royalGuardWall", score: 1.1 });
        }
        if (now >= this.nextCrownAtSeconds && distance <= this.crownRange) {
            choices.push({ type: "crownBoomerang", score: 1.2 + (distance / Math.max(0.001, this.crownRange)) });
        }
        if (now >= this.nextIceDashAtSeconds && distance >= this.iceDashRangeMin && distance <= this.iceDashRangeMax) {
            choices.push({ type: "iceDash", score: 1.3 });
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

    // ── Royal guard wall ──
    private startGuardWall(_target: Entity, now: number): void {
        this.lastAttackType = "royalGuardWall"; this.lastAttackAtSeconds = now;
        this.guardWallState = { endTimeSeconds: now + 1.0, hasSpawned: false };
        this.attackLockUntilSeconds = this.guardWallState.endTimeSeconds;
    }

    private updateGuardWall(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
    	const state = this.guardWallState; if (!state) return;
    	{
    		const myPos = this.getEntity().getPosition();
    		const targetPos = target.getPosition();
    		this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
    	}
        if (!state.hasSpawned) {
            state.hasSpawned = true;
            const myPos = this.getEntity().getPosition();
            const targetPos = target.getPosition();
            const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();

            for (let i = 0; i < this.guardWallCount; i++) {
                const lateralOffset = (i - (this.guardWallCount - 1) / 2) * 2.5;
                const guardPos = new Vec3(
                    myPos.x + dir.x * 5 + (-dir.z) * lateralOffset,
                    myPos.y,
                    myPos.z + dir.z * 5 + dir.x * lateralOffset
                );

                const guard = new Entity("kinggeorge-guard");
                guard.addComponent("render", { type: "box", material: this.guardMaterial });
                guard.setLocalScale(1.2, 3.5, 0.5);
                guard.setPosition(guardPos.x, guardPos.y + 1.75, guardPos.z);
                const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
                guard.setLocalEulerAngles(0, yaw, 0);
                this.getEntity().parent?.addChild(guard) ?? this.getEntity().addChild(guard);
                this.activeEffects.add(guard);

                // Telegraph ring
                this.spawnRingEffect(guardPos, 2, 600, this.guardRingMaterial, "kinggeorge-guard-ring", 0.5);

                const startMs = Date.now(); const durationMs = 1500;
                const tick = () => {
                    const elapsed = Date.now() - startMs;
                    if (elapsed >= durationMs) { this.destroyEffect(guard); return; }
                    const mat = guard.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
                    if (mat) { mat.opacity = 0.7 * (1 - elapsed / durationMs); mat.update(); }
                    requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }

            // Check if player is near any guard
            if (this.getFlatDistanceTo(target) <= this.guardWallRange) {
                this.applyDamage(this.guardWallDamage, onAttack);
            }
        }
        if (now >= state.endTimeSeconds) { this.guardWallState = null; this.nextGuardWallAtSeconds = now + this.guardWallCooldownSeconds; }
    }

    // ── Crown boomerang ──
    private startCrown(target: Entity, now: number): void {
        this.lastAttackType = "crownBoomerang"; this.lastAttackAtSeconds = now;
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const crown = new Entity("kinggeorge-crown");
        crown.addComponent("render", { type: "torus", material: this.crownMaterial });
        crown.setLocalScale(1.5, 1.5 * 0.3, 1.5);
        crown.setPosition(myPos.x, myPos.y + 1.5, myPos.z);
        this.getEntity().parent?.addChild(crown) ?? this.getEntity().addChild(crown);
        this.activeEffects.add(crown);

        this.crownState = {
            endTimeSeconds: now + 1.6,
            phase: "throwing",
            hasHitOut: false,
            hasHitReturn: false,
            crown,
            targetPos: targetPos.clone()
        };
        this.attackLockUntilSeconds = this.crownState.endTimeSeconds;
    }

    private updateCrown(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
    	const state = this.crownState; if (!state) return;
    	{
    		const myPos = this.getEntity().getPosition();
    		const targetPos = target.getPosition();
    		this.moveToward(targetPos.x - myPos.x, targetPos.z - myPos.z, this.aiConfig.chaseMoveSpeed, dt);
    	}
    	const myPos = this.getEntity().getPosition();
        const elapsed = state.endTimeSeconds - now;
        const totalDuration = 1.6;
        const progress = 1 - (elapsed / totalDuration);

        if (state.crown) {
            if (progress < 0.5) {
                // Throwing outward
                const t = progress / 0.5;
                state.crown.setPosition(
                    myPos.x + (state.targetPos.x - myPos.x) * t,
                    myPos.y + 1.5 + Math.sin(t * Math.PI) * 2,
                    myPos.z + (state.targetPos.z - myPos.z) * t
                );
                state.crown.setLocalEulerAngles(0, progress * 720, 0);

                if (!state.hasHitOut) {
                    const crownPos = state.crown.getPosition();
                    const targetPos = target.getPosition();
                    const dx = targetPos.x - crownPos.x;
                    const dz = targetPos.z - crownPos.z;
                    if (Math.sqrt(dx * dx + dz * dz) <= this.crownHitRadius) {
                        state.hasHitOut = true;
                        this.applyDamage(this.crownDamage, onAttack);
                    }
                }
            } else {
                // Returning
                state.phase = "returning";
                const t = (progress - 0.5) / 0.5;
                state.crown.setPosition(
                    state.targetPos.x + (myPos.x - state.targetPos.x) * t,
                    myPos.y + 1.5 + Math.sin(t * Math.PI) * 2,
                    state.targetPos.z + (myPos.z - state.targetPos.z) * t
                );
                state.crown.setLocalEulerAngles(0, progress * 720, 0);

                if (!state.hasHitReturn) {
                    const crownPos = state.crown.getPosition();
                    const targetPos = target.getPosition();
                    const dx = targetPos.x - crownPos.x;
                    const dz = targetPos.z - crownPos.z;
                    if (Math.sqrt(dx * dx + dz * dz) <= this.crownHitRadius) {
                        state.hasHitReturn = true;
                        this.applyDamage(Math.floor(this.crownDamage * 0.7), onAttack);
                    }
                }
            }
        }

        if (now >= state.endTimeSeconds) {
            this.destroyEffect(state.crown);
            this.crownState = null;
            this.nextCrownAtSeconds = now + this.crownCooldownSeconds;
        }
    }

    // ── Ice Dash (freezes player on hit) ──
    private startIceDash(target: Entity, now: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) return; dir.normalize();
        this.lastAttackType = "iceDash"; this.lastAttackAtSeconds = now;
        this.iceDashState = { 
            endTimeSeconds: now + this.iceDashDurationSeconds, 
            direction: dir, 
            hasHit: false,
            freezeDurationSeconds: this.iceFreezeDurationSeconds
        };
        this.attackLockUntilSeconds = this.iceDashState.endTimeSeconds + 0.4;
        
        // Ice burst telegraph at start position
        this.spawnRingEffect(myPos, 2.5, 300, this.iceBurstMaterial, "kinggeorge-ice-burst", 0.8);
    }

    private updateIceDash(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.iceDashState; if (!state) return;
        this.moveToward(state.direction.x, state.direction.z, this.iceDashSpeed, dt);

        // Ice trail VFX
        const myPos = this.getEntity().getPosition();
        const iceCrystal = new Entity("kinggeorge-ice-crystal");
        iceCrystal.addComponent("render", { type: "box", material: this.iceDashTrailMaterial });
        iceCrystal.setLocalScale(0.8, 0.3, 0.8);
        iceCrystal.setPosition(myPos.x, myPos.y + 0.15, myPos.z);
        iceCrystal.setLocalEulerAngles(0, Math.random() * 360, 0);
        this.getEntity().parent?.addChild(iceCrystal) ?? this.getEntity().addChild(iceCrystal);
        this.activeEffects.add(iceCrystal);
        
        const startMs = Date.now(); const durationMs = 600;
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= durationMs) { this.destroyEffect(iceCrystal); return; }
            const mat = iceCrystal.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = 0.8 * (1 - elapsed / durationMs); mat.update(); }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        if (!state.hasHit && this.getFlatDistanceTo(target) <= this.iceDashHitRadius) {
            state.hasHit = true;
            this.applyDamage(this.iceDashDamage, onAttack);
            this.applyFreezeEffect(target, state.freezeDurationSeconds);
        }

        if (now >= state.endTimeSeconds) {
            this.iceDashState = null;
            this.nextIceDashAtSeconds = now + this.iceDashCooldownSeconds;
        }
    }

    private applyFreezeEffect(targetEntity: Entity, durationSeconds: number): void {
        // Create ice shell around player
        const playerPos = targetEntity.getPosition();
        const iceShell = new Entity("player-ice-shell");
        iceShell.addComponent("render", { type: "sphere", material: this.iceFreezeMaterial });
        iceShell.setLocalScale(2.2, 2.2, 2.2);
        iceShell.setPosition(playerPos.x, playerPos.y + 1.0, playerPos.z);
        this.getEntity().parent?.addChild(iceShell) ?? this.getEntity().addChild(iceShell);
        this.activeEffects.add(iceShell);

        // Freeze player movement by disabling camera controls
        const controller = (targetEntity as any)?.script?.FirstPersonCamera
            ?? (targetEntity as any)?.script?.firstPersonCamera;
        if (controller) {
            const originalMoveSpeed = controller.moveSpeed;
            const originalJumpHeight = controller.jumpHeight;
            controller.moveSpeed = 0;
            controller.jumpHeight = 0;
            
            // Unfreeze after duration
            window.setTimeout(() => {
                this.destroyEffect(iceShell);
                if (controller && controller.parent) {
                    controller.moveSpeed = originalMoveSpeed;
                    controller.jumpHeight = originalJumpHeight;
                }
            }, durationSeconds * 1000);
        } else {
            window.setTimeout(() => {
                this.destroyEffect(iceShell);
            }, durationSeconds * 1000);
        }

        // Show freeze status text
        this.showStatusText("Frozen!", Math.min(1500, durationSeconds * 1000));
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
        this.activeEffects.clear(); this.guardWallState = null; this.crownState = null; this.iceDashState = null;
    }
}
