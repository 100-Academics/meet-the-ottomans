import { Boss } from "./boss";
import { Entity, Vec3, AppBase, StandardMaterial, Color, BLEND_ADDITIVE, CULLFACE_NONE } from "playcanvas";
import type { npc } from "../npc";

type TowerAttackType = "shockwave" | "pillar" | "gaze" | "resonance";

interface ShockwaveState {
    endTimeSeconds: number;
    waveEntities: Entity[];
    ringId: number;
}

interface PillarState {
    endTimeSeconds: number;
    pillarPositions: Vec3[];
    nextPillarAtSeconds: number;
    pillarsSpawned: number;
}

interface GazeBeam {
    beamEntity: Entity;
    direction: Vec3;
    lifetimeMs: number;
    startMs: number;
}

interface GazeState {
    endTimeSeconds: number;
    sweepStart: number;
    sweepDuration: number;
    beams: GazeBeam[];
    started: boolean;
    hasHit: boolean;
}

interface ResonanceState {
    endTimeSeconds: number;
    pulseInterval: number;
    nextPulseAtSeconds: number;
    pulseRadius: number;
    pulseDurationMs: number;
}

/**
 * Tower boss — an ancient monolith that speaks in an unknown tongue.
 * Phase 2 of the Northwood High School fight.
 * The tower is immovable, so all its attacks are ranged or arena-wide.
 */
export class TowerBoss extends Boss {

    // ── Shockwave ──
    private readonly shockwaveDamage = 14;
    private readonly shockwaveMaxRadius = 150;
    private readonly shockwaveDurationMs = 1200;
    private readonly shockwaveRingCount = 3;
    private readonly shockwaveRingIntervalMs = 400;
    private readonly shockwaveHeight = 0.6;
    private readonly shockwaveCooldownSeconds = 6.0;
    private nextShockwaveAtSeconds = 0;

    // ── Pillar Slam ──
    private readonly pillarDamage = 18;
    private readonly pillarCount = 4;
    private readonly pillarIntervalSeconds = 0.45;
    private readonly pillarRange = 120;
    private readonly pillarHitRadius = 6;
    private readonly pillarTelegraphMs = 600;
    private readonly pillarRiseMs = 500;
    private readonly pillarCooldownSeconds = 8.0;
    private nextPillarAtSeconds = 0;

    // ── Ancient Gaze ──
    private readonly gazeDamage = 10;
    private readonly gazeRange = 150;
    private readonly gazeSweepDuration = 2.5;
    private readonly gazeHitRadius = 8.0;
    private readonly gazeCooldownSeconds = 10.0;
    private nextGazeAtSeconds = 0;

    // ── Resonance ──
    private readonly resonanceDamage = 8;
    private readonly resonanceRange = 100;
    private readonly resonancePulseInterval = 3.0;
    private readonly resonancePulseRadius = 80;
    private readonly resonancePulseDurationMs = 1000;
    private readonly resonanceDurationSeconds = 9.0;
    private readonly resonanceCooldownSeconds = 14.0;
    private nextResonanceAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: TowerAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;

    private shockwaveState: ShockwaveState | null = null;
    private pillarState: PillarState | null = null;
    private gazeState: GazeState | null = null;
    private resonanceState: ResonanceState | null = null;

    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // Materials
    private readonly shockwaveMaterial = this.createEffectMaterial(
        new Color(0.6, 0.5, 0.4), new Color(0.8, 0.7, 0.5), 3.5, 0.7
    );
    private readonly pillarMaterial = this.createEffectMaterial(
        new Color(0.4, 0.35, 0.3), new Color(0.6, 0.5, 0.4), 3.0, 0.85
    );
    private readonly pillarTelegraphMaterial = this.createEffectMaterial(
        new Color(0.5, 0.4, 0.3), new Color(0.7, 0.6, 0.4), 4.0, 0.4
    );
    private readonly gazeMaterial = this.createEffectMaterial(
        new Color(0.5, 0.45, 0.4), new Color(0.9, 0.8, 0.6), 6.0, 0.6
    );
    private readonly resonanceRingMaterial = this.createEffectMaterial(
        new Color(0.5, 0.4, 0.35), new Color(0.7, 0.55, 0.4), 4.5, 0.5
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("TowerBoss")) {
        super(id, maxHealth, entity, "The Tower");

        // The tower's language is unrecognised — rendered as question marks.
        this.setIntroTaunt("??????????", "You are a fool for coming here.");
        this.setIntroNameTranslation("??????????", "Mrs. Bond-Lamberty");

        this.setTauntSet({
            highHealth: [
                "I have seen your faults. I know you will fail.",
                "Back down now and you may pass the class",
                "You are not ready for this DBQ."
            ],
            bossLowPlayerHigh: [
                "You surprise me.",
                "I did not expect this, your knowledge is impressive."
            ],
            playerLowBossHigh: [
                "It is clear you have not studied enough.",
                "I was right about you. You will fall."
            ],
            bothLow: [
                "A battle of wits that neither may survive."
            ],
            death: [
                "You get an E."
            ],
            bossDeath: [
                "You have defeated me. You will recieve an A."
            ]
        });

        // The tower is immovable — it only watches.
        this.aiConfig.chaseMoveSpeed = 0;
        this.aiConfig.idleMoveSpeed = 0;
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
        profileOverride?: {
            attackDamage: number;
            attackRange: number;
            attackCooldown: number;
            detectionRange: number;
        }
    ): void {
        if (!this.isAlive()) return;
        const dt = Math.max(0, Math.min(deltaTime, 0.05));

        // Update active attack states
        if (this.shockwaveState) { this.updateShockwave(targetEntity, currentTimeSeconds); }
        if (this.pillarState) { this.updatePillar(targetEntity, currentTimeSeconds, onAttack); }
        if (this.gazeState) { this.updateGaze(targetEntity, currentTimeSeconds, onAttack); }
        if (this.resonanceState) { this.updateResonance(targetEntity, currentTimeSeconds, onAttack); }

        // If any state is still active, don't start a new one yet
        if (this.shockwaveState || this.pillarState || this.gazeState || this.resonanceState) {
            return;
        }

        if (!targetEntity) {
            super.updateAI(dt, targetEntity, currentTimeSeconds, onAttack, profileOverride);
            this.faceTarget(targetEntity, dt);
            return;
        }

        if (currentTimeSeconds < this.attackLockUntilSeconds) {
            this.faceTarget(targetEntity, dt);
            return;
        }

        const distance = this.computeFlatDistance(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "shockwave") { this.startShockwave(currentTimeSeconds); return; }
        if (chosen === "pillar") { this.startPillar(targetEntity, currentTimeSeconds); return; }
        if (chosen === "gaze") { this.startGaze(targetEntity, currentTimeSeconds); return; }
        if (chosen === "resonance") { this.startResonance(currentTimeSeconds); return; }

        // No attack chosen: just face the target (tower doesn't move)
        this.faceTarget(targetEntity, dt);
    }

    public override kill(): boolean {
        const didKill = super.kill();
        if (didKill) this.cleanupEffects();
        return didKill;
    }

    protected override getCombatProfile() {
        const base = super.getCombatProfile();
        return {
            ...base,
            attackDamage: this.shockwaveDamage,
            attackRange: 200,
            attackCooldown: 4,
            detectionRange: Number.MAX_VALUE
        };
    }

    private pickNextAttack(distance: number, now: number): TowerAttackType | null {
        const options: Array<{ type: TowerAttackType; weight: number }> = [];

        if (now >= this.nextShockwaveAtSeconds) {
            options.push({ type: "shockwave", weight: 1.2 });
        }
        if (now >= this.nextPillarAtSeconds && distance <= this.pillarRange) {
            options.push({ type: "pillar", weight: 1.5 });
        }
        if (now >= this.nextGazeAtSeconds && distance <= this.gazeRange) {
            options.push({ type: "gaze", weight: 1.3 });
        }
        if (now >= this.nextResonanceAtSeconds && distance <= this.resonanceRange) {
            options.push({ type: "resonance", weight: 0.8 });
        }

        if (options.length === 0) return null;

        // Penalize repeating the same attack
        if (this.lastAttackType && (now - this.lastAttackAtSeconds) < 2.0) {
            for (const o of options) {
                if (o.type === this.lastAttackType) o.weight *= 0.4;
            }
        }

        const totalWeight = options.reduce((s, o) => s + o.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const o of options) {
            roll -= o.weight;
            if (roll <= 0) return o.type;
        }
        return options[0].type;
    }

    // ── Shockwave ──

    private startShockwave(now: number): void {
        this.lastAttackType = "shockwave";
        this.lastAttackAtSeconds = now;
        this.shockwaveState = {
            endTimeSeconds: now + (this.shockwaveRingCount * this.shockwaveRingIntervalMs / 1000),
            waveEntities: [],
            ringId: 0
        };
        this.attackLockUntilSeconds = this.shockwaveState.endTimeSeconds;

        // Spawn ring waves at intervals
        for (let i = 0; i < this.shockwaveRingCount; i++) {
            const delayMs = i * this.shockwaveRingIntervalMs;
            const ringId = i;
            window.setTimeout(() => {
                if (!this.shockwaveState || !this.isAlive()) return;
                this.spawnShockwaveRing(ringId);
            }, delayMs);
        }
    }

    private spawnShockwaveRing(ringId: number): void {
        const sceneApp = this.resolveSceneApp();
        if (!sceneApp?.root) return;

        const myPos = this.getEntity().getPosition();
        const ringRoot = new Entity(`tower-shockwave-${ringId}`);
        const ring = new Entity(`${ringId}-mesh`);
        ring.addComponent("render", { type: "cylinder" } as any);
        ring.setLocalScale(0.1, this.shockwaveHeight, 0.1);
        if (ring.render?.meshInstances?.length) {
            ring.render.meshInstances[0].material = this.shockwaveMaterial;
        }
        ringRoot.addChild(ring);
        ringRoot.setPosition(myPos.x, myPos.y + 0.1, myPos.z);
        sceneApp.root.addChild(ringRoot);
        this.activeEffects.add(ringRoot);

        if (this.shockwaveState) {
            this.shockwaveState.waveEntities.push(ringRoot);
        }

        const startMs = performance.now();
        const animate = () => {
            if (!this.isAlive() || !ringRoot.parent) {
                this.destroyEffect(ringRoot);
                return;
            }
            const elapsed = performance.now() - startMs;
            const t = Math.min(1, elapsed / this.shockwaveDurationMs);
            const radius = 0.2 + (this.shockwaveMaxRadius - 0.2) * t;
            ring.setLocalScale(radius, this.shockwaveHeight, radius);

            // Fade out near the end
            if (ring.render?.meshInstances?.length) {
                const mat = ring.render.meshInstances[0].material as StandardMaterial | undefined;
                if (mat && t > 0.6) {
                    mat.opacity *= 0.92;
                    mat.update();
                }
            }

            if (t >= 1 || elapsed > this.shockwaveDurationMs + 200) {
                this.destroyEffect(ringRoot);
                return;
            }
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);

        // Determine if player is hit — check if in range
        // Damage is applied once per shockwave wave
        const hitRadius = this.shockwaveMaxRadius;
        const myPosVec = this.getEntity().getPosition();
        const playerEntity = this.findPlayerEntity();
        if (playerEntity) {
            const playerPos = playerEntity.getPosition();
            const dx = playerPos.x - myPosVec.x;
            const dz = playerPos.z - myPosVec.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= hitRadius) {
                // Apply damage during the ring's expansion
                window.setTimeout(() => {
                    if (this.isAlive()) {
                        this.showStatusText("??????????", 1200);
                        this.applyDamage(this.shockwaveDamage);
                    }
                }, 400);
            }
        }
    }

    private updateShockwave(_target: Entity | null, now: number): void {
        const state = this.shockwaveState;
        if (!state) return;
        if (now >= state.endTimeSeconds) {
            // Clean up any remaining wave entities
            for (const e of state.waveEntities) {
                this.destroyEffect(e);
            }
            this.shockwaveState = null;
            this.nextShockwaveAtSeconds = now + this.shockwaveCooldownSeconds;
        }
    }

    // ── Pillar Slam ──

    private startPillar(targetEntity: Entity, now: number): void {
        this.lastAttackType = "pillar";
        this.lastAttackAtSeconds = now;

        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        const dirLen = dir.length();
        if (dirLen <= 0.0001) return;
        dir.normalize();

        // Place pillars in an arc near the player
        const pillarPositions: Vec3[] = [];
        for (let i = 0; i < this.pillarCount; i++) {
            const angleOffset = ((i - (this.pillarCount - 1) / 2) * 0.3);
            const cosA = Math.cos(angleOffset);
            const sinA = Math.sin(angleOffset);
            const strikeDir = new Vec3(
                dir.x * cosA - dir.z * sinA,
                0,
                dir.x * sinA + dir.z * cosA
            ).normalize();

            const dist = 5 + i * 3;
            const pos = new Vec3(
                myPos.x + strikeDir.x * dist,
                myPos.y,
                myPos.z + strikeDir.z * dist
            );
            pillarPositions.push(pos);
        }

        this.pillarState = {
            endTimeSeconds: now + this.pillarCount * this.pillarIntervalSeconds + this.pillarRiseMs / 1000 + 1.0,
            pillarPositions,
            nextPillarAtSeconds: now,
            pillarsSpawned: 0
        };
        this.attackLockUntilSeconds = now + (this.pillarCount * this.pillarIntervalSeconds) + 0.5;
    }

    private updatePillar(targetEntity: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.pillarState;
        if (!state) return;

        if (state.pillarsSpawned < this.pillarCount && now >= state.nextPillarAtSeconds) {
            const pos = state.pillarPositions[state.pillarsSpawned];
            state.pillarsSpawned++;
            state.nextPillarAtSeconds = now + this.pillarIntervalSeconds;

            // Telegraph ring
            const sceneApp = this.resolveSceneApp();
            if (sceneApp?.root) {
                const telegraph = new Entity("tower-pillar-telegraph");
                telegraph.addComponent("render", { type: "cylinder" } as any);
                telegraph.setLocalScale(4, 0.1, 4);
                if (telegraph.render?.meshInstances?.length) {
                    telegraph.render.meshInstances[0].material = this.pillarTelegraphMaterial;
                }
                telegraph.setPosition(pos.x, pos.y + 0.02, pos.z);
                sceneApp.root.addChild(telegraph);
                this.activeEffects.add(telegraph);

                // Telegraph pulse animation
                const startMs = Date.now();
                const pulseTick = () => {
                    if (!telegraph.parent) return;
                    const elapsed = Date.now() - startMs;
                    if (elapsed >= this.pillarTelegraphMs) {
                        this.destroyEffect(telegraph);
                        return;
                    }
                    const pulse = 1 + 0.3 * Math.sin(elapsed * 0.02);
                    telegraph.setLocalScale(4 * pulse, 0.1, 4 * pulse);
                    if (telegraph.render?.meshInstances?.length) {
                        const mat = telegraph.render.meshInstances[0].material as StandardMaterial | undefined;
                        if (mat) {
                            mat.opacity = 0.4 + 0.3 * Math.sin(elapsed * 0.015);
                            mat.update();
                        }
                    }
                    requestAnimationFrame(pulseTick);
                };
                requestAnimationFrame(pulseTick);
            }

            // Pillar rises after telegraph
            window.setTimeout(() => {
                if (!this.isAlive()) return;
                const pillar = new Entity("tower-pillar");
                pillar.addComponent("render", { type: "box" } as any);
                pillar.setLocalScale(1.5, 0.1, 1.5);
                if (pillar.render?.meshInstances?.length) {
                    pillar.render.meshInstances[0].material = this.pillarMaterial;
                }
                pillar.setPosition(pos.x, pos.y, pos.z);
                if (sceneApp?.root) {
                    sceneApp.root.addChild(pillar);
                    this.activeEffects.add(pillar);
                }

                const riseStart = Date.now();
                const riseTick = () => {
                    if (!this.isAlive() || !pillar.parent) {
                        this.destroyEffect(pillar);
                        return;
                    }
                    const elapsed = Date.now() - riseStart;
                    if (elapsed >= this.pillarRiseMs) {
                        pillar.setLocalScale(1.5, 8, 1.5);
                        return;
                    }
                    const t = elapsed / this.pillarRiseMs;
                    const height = 8 * t;
                    pillar.setLocalScale(1.5, height, 1.5);
                    requestAnimationFrame(riseTick);
                };
                requestAnimationFrame(riseTick);

                // Check hit against player
                if (targetEntity) {
                    const targetPos = targetEntity.getPosition();
                    const dx = targetPos.x - pos.x;
                    const dz = targetPos.z - pos.z;
                    if (Math.sqrt(dx * dx + dz * dz) <= this.pillarHitRadius) {
                        this.applyDamage(this.pillarDamage, onAttack);
                    }
                }
            }, this.pillarTelegraphMs);
        }

        if (now >= state.endTimeSeconds) {
            this.pillarState = null;
            this.nextPillarAtSeconds = now + this.pillarCooldownSeconds;
        }
    }

    // ── Ancient Gaze ──

    private startGaze(_target: Entity, now: number): void {
        this.lastAttackType = "gaze";
        this.lastAttackAtSeconds = now;

        this.gazeState = {
            endTimeSeconds: now + this.gazeSweepDuration + 1.0,
            sweepStart: now + 0.3,
            sweepDuration: this.gazeSweepDuration,
            beams: [],
            started: false,
            hasHit: false
        };
        this.attackLockUntilSeconds = this.gazeState.endTimeSeconds;
    }

    private updateGaze(targetEntity: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.gazeState;
        if (!state) return;

        const myPos = this.getEntity().getPosition();
        const sceneApp = this.resolveSceneApp();

        // Start gaze beam
        if (!state.started && now >= state.sweepStart) {
            state.started = true;

            // Spawn a sweeping beam entity
            const beamRoot = new Entity("tower-gaze-beam");
            const beam = new Entity("tower-gaze-beam-mesh");
            beam.addComponent("render", { type: "box" } as any);
            beam.setLocalScale(1, 1, 1);
            if (beam.render?.meshInstances?.length) {
                beam.render.meshInstances[0].material = this.gazeMaterial;
            }
            beamRoot.addChild(beam);
            if (sceneApp?.root) {
                beamRoot.setPosition(myPos.x, myPos.y + 5, myPos.z);
                sceneApp.root.addChild(beamRoot);
                this.activeEffects.add(beamRoot);
            }

            // Animate the beam sweeping
            const sweepStartMs = Date.now();
            const sweepDurationMs = this.gazeSweepDuration * 1000;
            const hitPlayer = { hasHit: false };

            const animateBeam = () => {
                if (!this.isAlive() || !beamRoot.parent) {
                    this.destroyEffect(beamRoot);
                    return;
                }
                const elapsed = Date.now() - sweepStartMs;
                const t = Math.min(1, elapsed / sweepDurationMs);

                // Sweep angle based on time
                const angle = -Math.PI / 4 + t * (Math.PI / 2);
                const beamDir = new Vec3(Math.sin(angle), 0, Math.cos(angle));
                const beamEnd = new Vec3(
                    myPos.x + beamDir.x * this.gazeRange,
                    myPos.y,
                    myPos.z + beamDir.z * this.gazeRange
                );

                // Update beam visual — a long thin box between tower and end point
                const midX = (myPos.x + beamEnd.x) / 2;
                const midZ = (myPos.z + beamEnd.z) / 2;
                const length = myPos.distance(beamEnd);
                beamRoot.setPosition(midX, myPos.y + 2, midZ);
                beamRoot.setLocalScale(this.gazeHitRadius, 3, length);
                beamRoot.lookAt(beamEnd.x, myPos.y + 2, beamEnd.z);

                // Check if player is hit by the sweeping beam
                if (targetEntity && !hitPlayer.hasHit) {
                    const playerPos = targetEntity.getPosition();
                    const dx = playerPos.x - myPos.x;
                    const dz = playerPos.z - myPos.z;
                    const playerDist = Math.sqrt(dx * dx + dz * dz);
                    if (playerDist <= this.gazeRange && playerDist > 1) {
                        const playerAngle = Math.atan2(dx, dz);
                        // Normalize angle to same range as beam sweep
                        let beamAngle = Math.atan2(beamDir.x, beamDir.z);
                        const angleDiff = Math.abs(playerAngle - beamAngle);
                        // Wrap around
                        const wrapped = Math.min(angleDiff, Math.abs(angleDiff - 2 * Math.PI));
                        if (wrapped < 0.2 && !hitPlayer.hasHit) {
                            hitPlayer.hasHit = true;
                            this.applyDamage(this.gazeDamage, onAttack);
                        }
                    }
                }

                if (t >= 1 || elapsed > sweepDurationMs + 500) {
                    this.destroyEffect(beamRoot);
                    return;
                }
                requestAnimationFrame(animateBeam);
            };
            requestAnimationFrame(animateBeam);
        }

        if (now >= state.endTimeSeconds) {
            this.gazeState = null;
            this.nextGazeAtSeconds = now + this.gazeCooldownSeconds;
        }
    }

    // ── Resonance ──

    private startResonance(now: number): void {
        this.lastAttackType = "resonance";
        this.lastAttackAtSeconds = now;

        this.resonanceState = {
            endTimeSeconds: now + this.resonanceDurationSeconds,
            pulseInterval: this.resonancePulseInterval,
            nextPulseAtSeconds: now,
            pulseRadius: this.resonancePulseRadius,
            pulseDurationMs: this.resonancePulseDurationMs
        };
        this.attackLockUntilSeconds = this.resonanceState.endTimeSeconds;
    }

    private updateResonance(targetEntity: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.resonanceState;
        if (!state) return;

        const myPos = this.getEntity().getPosition();

        // Emit a pulsing ring
        if (now >= state.nextPulseAtSeconds) {
            state.nextPulseAtSeconds = now + state.pulseInterval;

            const sceneApp = this.resolveSceneApp();
            if (sceneApp?.root) {
                // Inner glow ring
                const ringRoot = new Entity("tower-resonance-ring");
                const ring = new Entity(`${Date.now()}-mesh`);
                ring.addComponent("render", { type: "cylinder" } as any);
                ring.setLocalScale(0.1, 0.3, 0.1);
                if (ring.render?.meshInstances?.length) {
                    ring.render.meshInstances[0].material = this.resonanceRingMaterial;
                }
                ringRoot.addChild(ring);
                ringRoot.setPosition(myPos.x, myPos.y + 0.05, myPos.z);
                sceneApp.root.addChild(ringRoot);
                this.activeEffects.add(ringRoot);

                const startMs = performance.now();
                const animateRing = () => {
                    if (!this.isAlive() || !ringRoot.parent) {
                        this.destroyEffect(ringRoot);
                        return;
                    }
                    const elapsed = performance.now() - startMs;
                    const t = Math.min(1, elapsed / state.pulseDurationMs);
                    const radius = 0.5 + (state.pulseRadius - 0.5) * t;
                    ring.setLocalScale(radius, 0.3, radius);

                    if (ring.render?.meshInstances?.length) {
                        const mat = ring.render.meshInstances[0].material as StandardMaterial | undefined;
                        if (mat) {
                            mat.opacity = 0.6 * (1 - t * 0.8);
                            mat.update();
                        }
                    }

                    if (t >= 1) {
                        this.destroyEffect(ringRoot);
                        return;
                    }
                    requestAnimationFrame(animateRing);
                };
                requestAnimationFrame(animateRing);
            }

            // Check if player is in resonance range
            if (targetEntity) {
                const targetPos = targetEntity.getPosition();
                const dx = targetPos.x - myPos.x;
                const dz = targetPos.z - myPos.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance <= state.pulseRadius) {
                    this.applyDamage(this.resonanceDamage, onAttack);
                    this.showStatusText("??????????", 800);
                }
            }
        }

        if (now >= state.endTimeSeconds) {
            this.resonanceState = null;
            this.nextResonanceAtSeconds = now + this.resonanceCooldownSeconds;
        }
    }

    // ── Helpers (patterned after King Geser etc.) ──

    protected applyDamage(damage: number, onAttack?: (attacker: npc) => void): void {
        if (this.onPlayerAttack) {
            this.onPlayerAttack(this, damage);
            return;
        }
        if (onAttack) {
            onAttack(this);
        }
    }

    private findPlayerEntity(_target?: Entity | null): Entity | null {
        return null;
    }

    protected computeFlatDistance(targetEntity: Entity | null): number {
        if (!targetEntity) return Infinity;
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dx = targetPos.x - myPos.x;
        const dz = targetPos.z - myPos.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    protected faceTarget(targetEntity: Entity | null, dt: number): void {
        if (!targetEntity) return;
        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dx = targetPos.x - myPos.x;
        const dz = targetPos.z - myPos.z;
        if (Math.sqrt(dx * dx + dz * dz) <= 0.1) return;
        const yaw = (Math.atan2(dx, dz) * 180 / Math.PI) + 180;
        const current = this.getEntity().getLocalEulerAngles();
        // Smooth rotate
        const smoothYaw = this.lerpAngle(current.y, yaw, Math.min(1, dt * 2.5));
        this.getEntity().setLocalEulerAngles(current.x, smoothYaw, current.z);
    }

    private lerpAngle(from: number, to: number, t: number): number {
        let diff = to - from;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return from + diff * t;
    }

    protected createEffectMaterial(
        diffuse: Color,
        emissive: Color,
        emissiveIntensity: number,
        opacity: number
    ): StandardMaterial {
        const material = new StandardMaterial();
        material.useLighting = false;
        material.diffuse = diffuse;
        material.emissive = emissive;
        material.emissiveIntensity = emissiveIntensity;
        material.opacity = opacity;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        return material;
    }

    protected resolveSceneApp(): AppBase | undefined {
        const selfEntity = this.getEntity() as any;
        const selfApp = (selfEntity?.app ?? selfEntity?._app) as AppBase | undefined;
        if (selfApp?.root) return selfApp;
        const globalApp = (globalThis as any)?.app as AppBase | undefined;
        if (globalApp?.root) return globalApp;
        return undefined;
    }

    protected destroyEffect(effect?: Entity | null): void {
        if (!effect) return;
        this.activeEffects.delete(effect);
        try {
            effect.destroy();
        } catch (e) {
            // ignore
        }
    }

    private cleanupEffects(): void {
        for (const effect of this.activeEffects) {
            try {
                effect.destroy();
            } catch (e) {
                // ignore
            }
        }
        this.activeEffects.clear();
        this.shockwaveState = null;
        this.pillarState = null;
        this.gazeState = null;
        this.resonanceState = null;
    }
}