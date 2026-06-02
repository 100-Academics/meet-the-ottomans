import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

type BaybarsAttackType = "dash" | "arrows" | "dustStorm" | "groundSpikes";

interface DashState {
    endTimeSeconds: number;
    direction: Vec3;
    hasHit: boolean;
    trail?: Entity | null;
}

interface ArrowsState {
    endTimeSeconds: number;
    nextShotAtSeconds: number;
    shotsFired: number;
}

interface DustStormState {
    endTimeSeconds: number;
    hasBlinded: boolean;
    cloud?: Entity | null;
}

interface GroundSpikesState {
    endTimeSeconds: number;
    nextSpikeAtSeconds: number;
    spikesSpawned: number;
    spikePositions: Vec3[];
}

export class Baybars extends Boss {
    // Dash attack: rapid charge across arena
    private readonly dashSpeed = PLAYER_MOVE_SPEED * 2.8;
    private readonly dashDurationSeconds = 0.55;
    private readonly dashRecoverSeconds = 0.35;
    private readonly dashCooldownSeconds = 5.0;
    private readonly dashRangeMin = 8;
    private readonly dashRangeMax = 40;
    private readonly dashHitRadius = 3.2;
    private readonly dashDamage = 16;
    private nextDashAtSeconds = 0;

    // Arrow volley: fires multiple arrows at player
    private readonly arrowDamage = 8;
    private readonly arrowCount = 5;
    private readonly arrowIntervalSeconds = 0.25;
    private readonly arrowCooldownSeconds = 4.0;
    private readonly arrowRange = 30;
    private nextArrowsAtSeconds = 0;

    // Dust storm: blinds player temporarily
    private readonly dustStormDurationSeconds = 2.5;
    private readonly dustStormCooldownSeconds = 12.0;
    private readonly dustStormRange = 15;
    private readonly dustStormDamage = 5;
    private nextDustStormAtSeconds = 0;

    // Ground spikes: evoker fangs rising from ground
    private readonly spikeDamage = 12;
    private readonly spikeCount = 6;
    private readonly spikeIntervalSeconds = 0.18;
    private readonly spikeCooldownSeconds = 7.0;
    private readonly spikeRange = 20;
    private readonly spikeHitRadius = 2.0;
    private nextSpikesAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: BaybarsAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private dashState: DashState | null = null;
    private arrowsState: ArrowsState | null = null;
    private dustStormState: DustStormState | null = null;
    private groundSpikesState: GroundSpikesState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials
    private readonly dashTrailMaterial = this.createEffectMaterial(
        new Color(0.8, 0.65, 0.25), new Color(1, 0.8, 0.3), 3.5, 0.7
    );
    private readonly dustStormMaterial = this.createEffectMaterial(
        new Color(0.7, 0.6, 0.4), new Color(0.85, 0.75, 0.5), 2.0, 0.5
    );
    private readonly spikeMaterial = this.createEffectMaterial(
        new Color(0.6, 0.35, 0.15), new Color(0.8, 0.5, 0.2), 4.0, 0.85
    );
    private readonly arrowGlowMaterial = this.createEffectMaterial(
        new Color(0.9, 0.7, 0.2), new Color(1, 0.85, 0.3), 3.0, 0.6
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Baybars")) {
        super(id, maxHealth, entity, "Sultan Baybars");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.2;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

        this.setIntroTaunt(
            "أنا بيبرس، سلطان مصر والشام!",
            "I am Baybars, Sultan of Egypt and Syria!"
        );
        this.setIntroNameTranslation("السلطان بيبرس", "Sultan Baybars");
        this.setTauntSet({
            highHealth: [
                "The Mamluk sultanate bows to no one.",
                "Your crusade ends here, in the sands of Ridaniya.",
                "I have broken greater armies than yours."
            ],
            bossLowPlayerHigh: [
                "A sultan does not kneel!",
                "The desert feeds my fury!",
                "You cannot conquer what God has protected."
            ],
            playerLowBossHigh: [
                "Yield, and I may spare your life.",
                "The sands will swallow your remains.",
                "Your strength fades like a mirage."
            ],
            bothLow: [
                "Only one of us leaves this desert alive.",
                "To the last breath, I fight."
            ],
            death: [
                "The desert claims another fool.",
                "You were brave, but foolish."
            ],
            bossDeath: [
                "My sultanate… endures beyond me.",
                "The Mamluks will avenge me."
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

        if (this.dashState) { this.updateDash(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.arrowsState) { this.updateArrows(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.dustStormState) { this.updateDustStorm(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.groundSpikesState) { this.updateGroundSpikes(dt, targetEntity, currentTimeSeconds, onAttack); return; }

        if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "dash") { this.startDash(targetEntity, currentTimeSeconds); return; }
        if (chosen === "arrows") { this.startArrows(currentTimeSeconds); return; }
        if (chosen === "dustStorm") { this.startDustStorm(currentTimeSeconds); return; }
        if (chosen === "groundSpikes") { this.startGroundSpikes(targetEntity, currentTimeSeconds); return; }

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
        return { ...base, attackDamage: this.dashDamage, attackRange: this.dashRangeMax, attackCooldown: Math.min(this.dashCooldownSeconds, this.arrowCooldownSeconds), detectionRange: Number.MAX_VALUE };
    }

    // ── Attack selection ──
    private pickNextAttack(distance: number, now: number): BaybarsAttackType | null {
        const choices: Array<{ type: BaybarsAttackType; score: number }> = [];
        if (now >= this.nextDashAtSeconds && distance >= this.dashRangeMin && distance <= this.dashRangeMax) {
            const mid = (this.dashRangeMin + this.dashRangeMax) * 0.5;
            const halfSpan = Math.max(0.001, (this.dashRangeMax - this.dashRangeMin) * 0.5);
            choices.push({ type: "dash", score: 1.2 + (1 - Math.min(1, Math.abs(distance - mid) / halfSpan)) });
        }
        if (now >= this.nextArrowsAtSeconds && distance <= this.arrowRange) {
            choices.push({ type: "arrows", score: 1.0 + (distance / Math.max(0.001, this.arrowRange)) });
        }
        if (now >= this.nextDustStormAtSeconds && distance <= this.dustStormRange) {
            choices.push({ type: "dustStorm", score: 0.9 + (1 - Math.min(1, distance / Math.max(0.001, this.dustStormRange))) });
        }
        if (now >= this.nextSpikesAtSeconds && distance <= this.spikeRange) {
            choices.push({ type: "groundSpikes", score: 1.1 });
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

    // ── Dash attack ──
    private startDash(target: Entity, now: number): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) return;
        dir.normalize();
        this.lastAttackType = "dash"; this.lastAttackAtSeconds = now;
        this.dashState = { endTimeSeconds: now + this.dashDurationSeconds, direction: dir, hasHit: false, trail: this.createDashTrail() };
        this.attackLockUntilSeconds = this.dashState.endTimeSeconds + this.dashRecoverSeconds;
    }

    private updateDash(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.dashState; if (!state) return;
        this.moveToward(state.direction.x, state.direction.z, this.dashSpeed, dt);
        if (state.trail) { const pos = this.getEntity().getPosition(); state.trail.setPosition(pos.x, pos.y - 0.5, pos.z); }
        if (!state.hasHit && this.getFlatDistanceTo(target) <= this.dashHitRadius) { state.hasHit = true; this.applyDamage(this.dashDamage, onAttack); }
        if (now >= state.endTimeSeconds) { this.destroyEffect(state.trail); this.dashState = null; this.nextDashAtSeconds = now + this.dashCooldownSeconds; }
    }

    private createDashTrail(): Entity | null {
        const trail = new Entity("baybars-dash-trail");
        trail.addComponent("render", { type: "box", material: this.dashTrailMaterial });
        trail.setLocalScale(0.6, 0.3, 2.5);
        this.getEntity().addChild(trail); this.activeEffects.add(trail); return trail;
    }

    // ── Arrow volley ──
    private startArrows(now: number): void {
        this.lastAttackType = "arrows"; this.lastAttackAtSeconds = now;
        this.arrowsState = { endTimeSeconds: now + this.arrowCount * this.arrowIntervalSeconds + 0.3, nextShotAtSeconds: now, shotsFired: 0 };
        this.attackLockUntilSeconds = this.arrowsState.endTimeSeconds;
    }

    private updateArrows(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.arrowsState; if (!state) return;
        this.faceTarget(target, dt);
        if (state.shotsFired < this.arrowCount && now >= state.nextShotAtSeconds) {
            state.shotsFired++; state.nextShotAtSeconds = now + this.arrowIntervalSeconds;
            this.spawnArrowProjectile(target);
            if (this.getFlatDistanceTo(target) <= this.arrowRange) this.applyDamage(this.arrowDamage, onAttack);
        }
        if (now >= state.endTimeSeconds) { this.arrowsState = null; this.nextArrowsAtSeconds = now + this.arrowCooldownSeconds; }
    }

    private spawnArrowProjectile(target: Entity): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const arrow = new Entity("baybars-arrow");
        arrow.addComponent("render", { type: "cone", material: this.arrowGlowMaterial });
        arrow.setLocalScale(0.15, 0.15, 1.2);
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
        const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
        arrow.setLocalEulerAngles(-90, yaw, 0);
        arrow.setPosition(myPos.x + dir.x * 2, myPos.y + 1.5, myPos.z + dir.z * 2);
        this.getEntity().parent?.addChild(arrow) ?? this.getEntity().addChild(arrow);
        this.activeEffects.add(arrow);
        const startPos = arrow.getPosition().clone();
        const speed = 40; const startMs = Date.now(); const maxMs = 1500;
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= maxMs || !arrow.parent) { this.destroyEffect(arrow); return; }
            const t = elapsed / 1000;
            arrow.setPosition(startPos.x + dir.x * speed * t, startPos.y, startPos.z + dir.z * speed * t);
            const mat = arrow.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = 0.6 * (1 - elapsed / maxMs); mat.update(); }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // ── Dust storm (blind) ──
    private startDustStorm(now: number): void {
        this.lastAttackType = "dustStorm"; this.lastAttackAtSeconds = now;
        this.dustStormState = { endTimeSeconds: now + this.dustStormDurationSeconds, hasBlinded: false, cloud: this.createDustCloud() };
        this.attackLockUntilSeconds = this.dustStormState.endTimeSeconds + 0.3;
    }

    private updateDustStorm(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.dustStormState; if (!state) return;
        if (state.cloud) { const pos = this.getEntity().getPosition(); state.cloud.setPosition(pos.x, pos.y + 1, pos.z); }
        if (!state.hasBlinded && this.getFlatDistanceTo(target) <= this.dustStormRange) {
            state.hasBlinded = true; this.applyDamage(this.dustStormDamage, onAttack);
            this.spawnRingEffect(this.getEntity().getPosition(), this.dustStormRange, this.dustStormDurationSeconds * 1000, this.dustStormMaterial, "baybars-dust-ring", 0.4);
        }
        if (now >= state.endTimeSeconds) { this.destroyEffect(state.cloud); this.dustStormState = null; this.nextDustStormAtSeconds = now + this.dustStormCooldownSeconds; }
    }

    private createDustCloud(): Entity | null {
        const cloud = new Entity("baybars-dust-cloud");
        cloud.addComponent("render", { type: "sphere", material: this.dustStormMaterial });
        cloud.setLocalScale(6, 3, 6);
        this.getEntity().addChild(cloud); this.activeEffects.add(cloud); return cloud;
    }

    // ── Ground spikes (evoker fangs) ──
    private startGroundSpikes(target: Entity, now: number): void {
        this.lastAttackType = "groundSpikes"; this.lastAttackAtSeconds = now;
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) return; dir.normalize();
        const spikePositions: Vec3[] = [];
        for (let i = 0; i < this.spikeCount; i++) {
            const offset = (i - (this.spikeCount - 1) / 2) * 2.5;
            spikePositions.push(new Vec3(myPos.x + dir.x * (i * 2 + 3) + (-dir.z) * offset, myPos.y, myPos.z + dir.z * (i * 2 + 3) + dir.x * offset));
        }
        this.groundSpikesState = { endTimeSeconds: now + this.spikeCount * this.spikeIntervalSeconds + 0.8, nextSpikeAtSeconds: now, spikesSpawned: 0, spikePositions };
        this.attackLockUntilSeconds = this.groundSpikesState.endTimeSeconds;
    }

    private updateGroundSpikes(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.groundSpikesState; if (!state) return;
        this.faceTarget(target, dt);
        if (state.spikesSpawned < this.spikeCount && now >= state.nextSpikeAtSeconds) {
            const pos = state.spikePositions[state.spikesSpawned];
            state.spikesSpawned++; state.nextSpikeAtSeconds = now + this.spikeIntervalSeconds;
            const spike = new Entity("baybars-spike");
            spike.addComponent("render", { type: "box", material: this.spikeMaterial });
            spike.setLocalScale(0.5, 0.1, 0.5); spike.setPosition(pos.x, pos.y, pos.z);
            this.getEntity().parent?.addChild(spike) ?? this.getEntity().addChild(spike);
            this.activeEffects.add(spike);
            const startMs = Date.now(); const riseMs = 300; const holdMs = 600; const totalMs = riseMs + holdMs;
            const tick = () => {
                const elapsed = Date.now() - startMs;
                if (elapsed >= totalMs || !spike.parent) { this.destroyEffect(spike); return; }
                if (elapsed < riseMs) { const t = elapsed / riseMs; spike.setLocalScale(0.5, 3.0 * t, 0.5); spike.setPosition(pos.x, pos.y + 1.5 * t, pos.z); }
                const mat = spike.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
                if (mat && elapsed > riseMs) { mat.opacity = 0.85 * (1 - (elapsed - riseMs) / holdMs); mat.update(); }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            const targetPos = target.getPosition();
            const dx = targetPos.x - pos.x; const dz = targetPos.z - pos.z;
            if (Math.sqrt(dx * dx + dz * dz) <= this.spikeHitRadius) this.applyDamage(this.spikeDamage, onAttack);
        }
        if (now >= state.endTimeSeconds) { this.groundSpikesState = null; this.nextSpikesAtSeconds = now + this.spikeCooldownSeconds; }
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
        this.activeEffects.clear(); this.dashState = null; this.arrowsState = null; this.dustStormState = null; this.groundSpikesState = null;
    }
}