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
 * A choice from the unified Tower attack pool: either a built-in attack
 * (shockwave / pillar / gaze / resonance) or a borrowed attack borrowed
 * from one of the other bosses.
 */
type TowerAttackChoice =
    | { kind: "builtin"; type: TowerAttackType }
    | { kind: "borrowed"; attack: TowerBorrowedAttack };

/**
 * Tower boss — an ancient monolith that speaks in an unknown tongue.
 * Phase 2 of the Northwood High School fight.
 * The tower is immovable, so all its attacks are ranged or arena-wide.
 *
 * In addition to its own four signature attacks, the Tower pulls from the
 * full repertoire of every other boss via {@link TowerBorrowedAttack}.
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
    private lastBorrowedAttackId: string | null = null;
    private lastAttackAtSeconds = -Infinity;

    private shockwaveState: ShockwaveState | null = null;
    private pillarState: PillarState | null = null;
    private gazeState: GazeState | null = null;
    private resonanceState: ResonanceState | null = null;

    // Borrowed-attack pool: pulls from every other boss's repertoire.
    private readonly borrowedAttacks: TowerBorrowedAttack[];
    private currentBorrowedAttack: TowerBorrowedAttack | null = null;

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

        // Pull attacks from every other boss in the game and use them at random.
        this.borrowedAttacks = [
            new HolySpireBorrow(this),
            new HolyRayBorrow(this),
            new DivineLightBorrow(this),
            new GeserLightningBorrow(this),
            new FireStrikeBorrow(this),
            new FireRainBorrow(this),
            new LibertyStrikeBorrow(this),
            new ValleyForgeBorrow(this),
            new CannonBarrageBorrow(this),
            new PlagueBorrow(this),
            new PartingWaveBorrow(this),
            new MannaHailBorrow(this),
            new IedBlastBorrow(this),
            new AkSprayBorrow(this),
            new RedArmySurgeBorrow(this),
            new IronCurtainBorrow(this),
            new CauseWinterBorrow(this),
            new AbelLightningBorrow(this)
        ];
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

        // Tick borrowed attack: runs to completion via the abstraction.
        if (this.currentBorrowedAttack) {
            this.currentBorrowedAttack.tick(targetEntity, currentTimeSeconds, onAttack);
            if (!this.currentBorrowedAttack.isActive()) {
                this.currentBorrowedAttack.cleanup();
                this.currentBorrowedAttack.completeCooldown(currentTimeSeconds);
                this.currentBorrowedAttack = null;
                // Brief lock so we don't instantly roll another attack.
                this.attackLockUntilSeconds = Math.max(this.attackLockUntilSeconds, currentTimeSeconds + 0.4);
            }
            this.faceTarget(targetEntity, dt);
            return;
        }

        // Update active attack states
        if (this.shockwaveState) { this.updateShockwave(targetEntity, currentTimeSeconds); }
        if (this.pillarState) { this.updatePillar(targetEntity, currentTimeSeconds, onAttack); }
        if (this.gazeState) { this.updateGaze(targetEntity, currentTimeSeconds, onAttack); }
        if (this.resonanceState) { this.updateResonance(targetEntity, currentTimeSeconds, onAttack); }

        // If any state is still active, don't start a new one yet
        if (this.shockwaveState || this.pillarState || this.gazeState || this.resonanceState) {
            this.faceTarget(targetEntity, dt);
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

        const chosen = this.pickNextAttack(targetEntity, currentTimeSeconds);
        if (!chosen) {
            this.faceTarget(targetEntity, dt);
            return;
        }

        if (chosen.kind === "builtin") {
            if (chosen.type === "shockwave") { this.startShockwave(currentTimeSeconds); return; }
            if (chosen.type === "pillar") { this.startPillar(targetEntity, currentTimeSeconds); return; }
            if (chosen.type === "gaze") { this.startGaze(targetEntity, currentTimeSeconds); return; }
            if (chosen.type === "resonance") { this.startResonance(currentTimeSeconds); return; }
            return;
        }

        // Borrowed attack
        this.lastBorrowedAttackId = chosen.attack.id;
        this.attackLockUntilSeconds = currentTimeSeconds + 0.5;
        this.currentBorrowedAttack = chosen.attack;
        chosen.attack.start(targetEntity, currentTimeSeconds, onAttack);
        this.faceTarget(targetEntity, dt);
    }

    public override kill(): boolean {
        const didKill = super.kill();
        if (didKill) {
            // Tear down any in-flight borrowed attack before the full cleanup.
            if (this.currentBorrowedAttack) {
                this.currentBorrowedAttack.cleanup();
                this.currentBorrowedAttack = null;
            }
            this.cleanupBorrowedAttacks();
            this.cleanupEffects();
        }
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

    private pickNextAttack(targetEntity: Entity | null, now: number): TowerAttackChoice | null {
        const distance = this.computeFlatDistance(targetEntity);
        const builtinOptions: TowerAttackType[] = [];

        if (now >= this.nextShockwaveAtSeconds) {
            builtinOptions.push("shockwave");
        }
        if (now >= this.nextPillarAtSeconds && distance <= this.pillarRange) {
            builtinOptions.push("pillar");
        }
        if (now >= this.nextGazeAtSeconds && distance <= this.gazeRange) {
            builtinOptions.push("gaze");
        }
        if (now >= this.nextResonanceAtSeconds && distance <= this.resonanceRange) {
            builtinOptions.push("resonance");
        }

        const validBorrowed: TowerBorrowedAttack[] = [];
        for (const attack of this.borrowedAttacks) {
            if (attack.isSelectable(targetEntity, now)) {
                validBorrowed.push(attack);
            }
        }

        // Build the unified pool. Every entry — built-in or borrowed — has equal
        // weight, so the Tower rolls uniformly across its full repertoire.
        const totalChoices = builtinOptions.length + validBorrowed.length;
        if (totalChoices === 0) return null;

        // Anti-repeat: penalise the most-recently-used attack id by removing it
        // from contention (only when other options exist).
        const recentBuiltin = (this.lastAttackType && (now - this.lastAttackAtSeconds) < 2.0)
            ? this.lastAttackType
            : null;
        const recentBorrowed = (this.lastBorrowedAttackId && (now - this.lastAttackAtSeconds) < 2.0)
            ? this.lastBorrowedAttackId
            : null;

        const filteredBuiltin = recentBuiltin
            ? builtinOptions.filter(t => t !== recentBuiltin)
            : builtinOptions;
        const filteredBorrowed = recentBorrowed
            ? validBorrowed.filter(a => a.id !== recentBorrowed)
            : validBorrowed;

        const finalChooseable = filteredBuiltin.length + filteredBorrowed.length;
        if (finalChooseable === 0) {
            // Fall back to the unfiltered pool if every option was the recent one.
            const allReady: TowerAttackChoice[] = [
                ...builtinOptions.map(t => ({ kind: "builtin" as const, type: t })),
                ...validBorrowed.map(a => ({ kind: "borrowed" as const, attack: a }))
            ];
            return allReady[Math.floor(Math.random() * allReady.length)] ?? null;
        }

        const roll = Math.floor(Math.random() * finalChooseable);
        if (roll < filteredBuiltin.length) {
            return { kind: "builtin", type: filteredBuiltin[roll] };
        }
        return { kind: "borrowed", attack: filteredBorrowed[roll - filteredBuiltin.length] };
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

    protected cleanupEffects(): void {
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

    /**
     * Tear down every borrowed attack — runs both on boss death (via kill())
     * and any time a borrowed attack was thrown into an unrecoverable state
     * (e.g. the Tower being killed mid-cast).
     */
    protected cleanupBorrowedAttacks(): void {
        if (!this.borrowedAttacks) return;
        for (const attack of this.borrowedAttacks) {
            try {
                attack.cleanup();
            } catch (e) {
                // ignore — borrowed attacks may have already torn themselves down
            }
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOWER BORROWED-ATTACK SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Every concrete class below reimplements — at Tower scale and in the Tower's
// own quaternary palette bridge — an attack pattern taken from a different
// boss in `meet-the-ottomans/src/world/npc/bosses/`. Each borrows behaviour
// (timings, damage, range) from its source rather than the source's exact
// VFX, so the Tower's fight feels like an eclectic bestiary restage.
//
// The Tower itself is immovable, so only ranged / AoE / sky-strike / beam
// patterns transfer cleanly. Movement-dependent attacks (dashes, shadow
// dashes, fire dashes, civil charge, aerial reposition, invisibility chases)
// are intentionally excluded.

abstract class TowerBorrowedAttack {
    public abstract readonly id: string;
    public abstract readonly label: string;
    public abstract readonly cooldownSeconds: number;
    public abstract readonly range: number;

    /** Earliest {@code currentTimeSeconds} value at which this attack may fire again. */
    protected nextReadyAtSeconds = 0;
    /** True while the attack's timeline is in flight. */
    protected running = false;
    /** Visual entities spawned by this attack — tracked so cleanup can reap them. */
    protected readonly tracked: Set<Entity> = new Set();

    constructor(protected readonly tower: TowerBoss) {}

    public isActive(): boolean {
        return this.running;
    }

    /** Can the Tower legally start this attack right now? */
    public isSelectable(target: Entity | null, now: number): boolean {
        if (this.running) return false;
        if (now < this.nextReadyAtSeconds) return false;
        if (!target) return false;
        return this.tower.computeFlatDistance(target) <= this.range;
    }

    /** Stamp the post-finish cooldown so the next roll respects it. */
    public completeCooldown(now: number): void {
        this.nextReadyAtSeconds = now + this.cooldownSeconds;
    }

    /** Track a spawned entity so {@link cleanup} can reap it. */
    protected trackEntity(entity: Entity): Entity {
        this.tracked.add(entity);
        return entity;
    }

    protected untrackEntity(entity: Entity | null | undefined): void {
        if (!entity) return;
        this.tracked.delete(entity);
    }

    /** Spawn the initial VFX / state for the attack. */
    public abstract start(target: Entity, now: number, onAttack?: (attacker: npc) => void): void;

    /** Per-frame update; the attack flips {@link running} to false when its timeline ends. */
    public abstract tick(target: Entity | null, now: number, onAttack?: (attacker: npc) => void): void;

    /** Destroy any VFX, completing the attack even if its timeline didn't finish. */
    public cleanup(): void {
        for (const entity of this.tracked) {
            this.tower.destroyEffect(entity);
        }
        this.tracked.clear();
        this.running = false;
    }

    // ── Tracked-entity helpers (sub-classes use these to spawn VFX safely). ──

    protected makeRing(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("cylinder", position, scale, material, name);
    }

    protected makeSphere(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("sphere", position, scale, material, name);
    }

    protected makeBox(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("box", position, scale, material, name);
    }

    protected makeTorus(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("torus", position, scale, material, name);
    }

    protected makeCone(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("cone", position, scale, material, name);
    }

    protected makeCapsule(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("capsule", position, scale, material, name);
    }

    private makeEntity(
        kind: "cylinder" | "sphere" | "box" | "torus" | "cone" | "capsule",
        position: Vec3,
        scale: number | [number, number, number],
        material: StandardMaterial,
        name: string
    ): Entity | null {
        const scene = this.tower.resolveSceneApp();
        const e = new Entity(name);
        e.addComponent("render", { type: kind } as any);
        const [sx, sy, sz] = Array.isArray(scale) ? scale : [scale, scale, scale];
        e.setLocalScale(sx, sy, sz);
        const meshInst = e.render?.meshInstances?.[0];
        if (meshInst) {
            meshInst.material = material;
        }
        e.setPosition(position.x, position.y, position.z);
        if (scene?.root) {
            scene.root.addChild(e);
        }
        this.tracked.add(e);
        return e;
    }

    /** Fades a tracked entity's material opacity from current to 0 across durationMs. */
    protected animateFadeOut(entity: Entity, durationMs: number, onDone?: () => void): void {
        const mat = entity.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
        if (!mat) return;
        const startOpacity = mat.opacity ?? 1.0;
        const start = performance.now();
        const tick = () => {
            if (!entity.parent) {
                if (onDone) onDone();
                return;
            }
            const t = Math.min(1, (performance.now() - start) / durationMs);
            mat.opacity = startOpacity * (1 - t);
            mat.update();
            if (t >= 1) {
                if (onDone) onDone();
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /** Lerps {@code entity}'s position from start to end over durationMs. */
    protected animateMoveTo(entity: Entity, end: Vec3, durationMs: number, onDone?: () => void): void {
        const start = entity.getPosition().clone();
        const startMs = performance.now();
        const tick = () => {
            if (!entity.parent) {
                if (onDone) onDone();
                return;
            }
            const t = Math.min(1, (performance.now() - startMs) / durationMs);
            const eased = t * t * (3 - 2 * t);
            entity.setPosition(
                start.x + (end.x - start.x) * eased,
                start.y + (end.y - start.y) * eased,
                start.z + (end.z - start.z) * eased
            );
            if (t >= 1) {
                if (onDone) onDone();
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /** Lerps an entity's Y to simulate a falling object with peak arc. */
    protected animateFall(entity: Entity, peakHeight: number, durationMs: number, onDone?: () => void): void {
        const start = entity.getPosition().clone();
        const startMs = performance.now();
        const tick = () => {
            if (!entity.parent) {
                if (onDone) onDone();
                return;
            }
            const t = Math.min(1, (performance.now() - startMs) / durationMs);
            const yArc = peakHeight * Math.sin(t * Math.PI) * 2 - peakHeight * 0.5;
            entity.setPosition(start.x, start.y + yArc, start.z);
            if (t >= 1) {
                if (onDone) onDone();
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /**
     * Sweeps a cylinder beam visual from {@code origin} to {@code end} over {@code travelMs}.
     * Beam length grows from 0 → full while opacity stays full. After travel finishes,
     * the beam fades over durationMs.
     */
    protected animateBeamSweep(origin: Vec3, end: Vec3, beamRadius: number, height: number, travelMs: number, holdMs: number, material: StandardMaterial, name: string): void {
        const scene = this.tower.resolveSceneApp();
        const direction = end.clone().sub(origin);
        const fullDistance = direction.length();
        if (fullDistance <= 0.5) return;

        const beam = this.makeCylinder(origin, [beamRadius, fullDistance, beamRadius], material, name);
        if (!beam) return;
        // Cylinder defaults run along Y; we want it along the beam direction.
        beam.setLocalPosition(origin.x, origin.y, origin.z);
        beam.lookAt(end.x, end.y, end.z);

        const startPos = origin.clone();
        // Re-parent so we can rotate it via setLocalPosition then orient via lookAt.
        const startMs = performance.now();
        const tick = () => {
            if (!beam.parent) return;
            const elapsed = performance.now() - startMs;
            const t = Math.min(1, elapsed / travelMs);
            // Don't move the beam; only fade in/out via length scale change if desired.
            if (t >= 1) {
                // Hold for holdMs then fade.
                window.setTimeout(() => {
                    if (beam.parent) {
                        this.animateFadeOut(beam, 200);
                    }
                }, holdMs);
                return;
            }
            requestAnimationFrame(tick);
        };
        // Suppress unused-var warnings for clarity.
        void startPos;
        requestAnimationFrame(tick);
    }

    protected makeCylinder(position: Vec3, scale: number | [number, number, number], material: StandardMaterial, name: string): Entity | null {
        return this.makeEntity("cylinder" as any, position, scale, material, name);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Concrete borrowed attacks — pulled from other bosses.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Jesus — holySpire (AOJ orb slams down on player) ─────────────────────

class HolySpireBorrow extends TowerBorrowedAttack {
    public readonly id = "jesus.holySpire";
    public readonly label = "Holy Spire";
    public readonly cooldownSeconds = 4.1;
    public readonly range = 180;

    private readonly damage = 28;
    private readonly windupMs = 620;
    private readonly durationMs = 500;
    private readonly hitRadius = 7.5;

    private readonly material = this.tower.createEffectMaterial(
        new Color(1, 0.92, 0.4), new Color(1, 0.98, 0.55), 3.8, 0.82
    );

    private centerPos: Vec3 = new Vec3();
    private startSec = 0;
    private hitApplied = false;
    private doneAtSec = 0;

    public start(target: Entity, now: number): void {
        this.running = true;
        this.startSec = now;
        this.hitApplied = false;
        this.doneAtSec = now + (this.windupMs + this.durationMs) / 1000;

        const tPos = target.getPosition();
        this.centerPos = new Vec3(tPos.x, tPos.y + 1.5, tPos.z);
        this.makeSphere(this.centerPos, [0.45, 0.45, 0.45], this.material, "tower-borrow-spire-orb");

        this.tower.showStatusText("??????????", 1200);
    }

    public tick(_t: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const elapsedMs = (now - this.startSec) * 1000;
        const windupT = Math.min(1, Math.max(0, elapsedMs / this.windupMs));
        const orb = this.tracked.values().next().value as Entity | undefined;
        if (orb && orb.parent) {
            const scale = 0.45 + windupT * 5.8;
            orb.setLocalScale(scale, scale, scale);
            // Pulse impact at end of windup
            if (windupT >= 1 && !this.hitApplied) {
                this.hitApplied = true;
                const playerPos = this.centerPos.clone();
                playerPos.y -= 1.5;
                this.tower.applyDamage(this.damage, onAttack);
            }
        }
        if (!this.hitApplied && elapsedMs >= this.windupMs) {
            // Apply damage exactly once when windup ends.
            this.hitApplied = true;
            this.tower.applyDamage(this.damage, onAttack);
        }
        if (now >= this.doneAtSec) {
            this.running = false;
        }
    }
}

// ─── Jesus — holyRay (charged beam from tower toward player) ───────────────

class HolyRayBorrow extends TowerBorrowedAttack {
    public readonly id = "jesus.holyRay";
    public readonly label = "Holy Ray";
    public readonly cooldownSeconds = 5.6;
    public readonly range = 240;

    private readonly damage = 24;
    private readonly windupMs = 450;
    private readonly travelMs = 430;
    private readonly durationMs = 820;
    private readonly hitRadius = 6.5;
    private readonly overshoot = 160;

    private readonly material = this.tower.createEffectMaterial(
        new Color(1, 0.97, 0.72), new Color(1, 0.99, 0.86), 6.4, 0.94
    );

    private origin: Vec3 = new Vec3();
    private beamEnd: Vec3 = new Vec3();
    private startSec = 0;
    private hitApplied = false;
    private doneAtSec = 0;

    public start(target: Entity, now: number): void {
        this.running = true;
        this.startSec = now;
        this.hitApplied = false;
        this.doneAtSec = now + (this.windupMs + this.durationMs) / 1000;

        const towerPos = this.tower.getEntity().getPosition();
        this.origin = new Vec3(towerPos.x, towerPos.y + 4.4, towerPos.z);
        const targetPos = target.getPosition();
        const direction = targetPos.clone().sub(this.origin);
        const totalLength = Math.max(direction.length() + this.overshoot, 30);
        const normalized = direction.lengthSq() > 0.0001 ? direction.normalize() : new Vec3(0, 0, 1);
        this.beamEnd = this.origin.clone().add(normalized.mulScalar(totalLength));

        this.tower.showStatusText("??????????", 1200);
    }

    public tick(target: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const elapsedMs = (now - this.startSec) * 1000;
        if (elapsedMs >= this.windupMs && !this.hitApplied && target) {
            // Beam is now active; perform a ray hit check against target.
            const tPos = target.getPosition();
            const ray = this.beamEnd.clone().sub(this.origin);
            const rayLenSq = ray.lengthSq();
            if (rayLenSq > 0.001) {
                const toTarget = tPos.clone().sub(this.origin);
                const proj = toTarget.dot(ray) / rayLenSq;
                if (proj >= 0 && proj <= 1) {
                    const closest = this.origin.clone().add(ray.clone().mulScalar(proj));
                    if (closest.distance(tPos) <= this.hitRadius) {
                        this.hitApplied = true;
                        this.tower.applyDamage(this.damage, onAttack);
                    }
                }
            }
        }

        // Spawn beam visual once at fire time.
        if (elapsedMs >= this.windupMs && elapsedMs - this.windupMs < 60) {
            const direction = this.beamEnd.clone().sub(this.origin);
            const fullDistance = direction.length();
            if (fullDistance > 0.5) {
                const beamPos = this.origin.clone();
                const beam = this.makeCylinder(beamPos, [this.hitRadius, fullDistance, this.hitRadius], this.material, "tower-borrow-ray-beam");
                if (beam) {
                    beam.lookAt(this.beamEnd.x, this.beamEnd.y, this.beamEnd.z);
                    window.setTimeout(() => {
                        if (beam.parent) this.animateFadeOut(beam, 240);
                    }, this.durationMs - 240);
                }
            }
        }

        if (now >= this.doneAtSec) {
            this.running = false;
        }
    }
}

// ─── Jesus — divineLight (sky strike at player position) ───────────────────

class DivineLightBorrow extends TowerBorrowedAttack {
    public readonly id = "jesus.divineLight";
    public readonly label = "Divine Light";
    public readonly cooldownSeconds = 7.2;
    public readonly range = 220;

    private readonly damage = 34;
    private readonly windupMs = 900;
    private readonly durationMs = 700;
    private readonly areaRadius = 12;
    private readonly beamRadius = 5.5;
    private readonly skyHeight = 60;

    private readonly beamMaterial = this.tower.createEffectMaterial(
        new Color(0.95, 0.98, 1), new Color(1, 1, 1), 6.8, 0.92
    );
    private readonly telegraphMaterial = this.tower.createEffectMaterial(
        new Color(0.82, 0.92, 1), new Color(0.95, 0.98, 1), 4.0, 0.42
    );

    private centerPos: Vec3 = new Vec3();
    private startSec = 0;
    private hitApplied = false;
    private doneAtSec = 0;

    public start(target: Entity, now: number): void {
        this.running = true;
        this.startSec = now;
        this.hitApplied = false;
        this.doneAtSec = now + (this.windupMs + this.durationMs) / 1000;

        const tPos = target.getPosition();
        this.centerPos = new Vec3(tPos.x, tPos.y + 0.05, tPos.z);

        this.makeTorus(this.centerPos, [this.areaRadius, 0.6, this.areaRadius], this.telegraphMaterial, "tower-borrow-divine-telegraph");

        this.tower.showStatusText("??????????", 1200);
    }

    public tick(target: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const elapsedMs = (now - this.startSec) * 1000;
        if (elapsedMs >= this.windupMs && !this.hitApplied && target) {
            this.hitApplied = true;
            // Apply damage in area and spawn the beam visual.
            const tPos = target.getPosition();
            const dx = tPos.x - this.centerPos.x;
            const dz = tPos.z - this.centerPos.z;
            if (Math.sqrt(dx * dx + dz * dz) <= this.areaRadius) {
                this.tower.applyDamage(this.damage, onAttack);
            }
            const beamOrigin = new Vec3(this.centerPos.x, this.centerPos.y + this.skyHeight, this.centerPos.z);
            const beam = this.makeCylinder(beamOrigin, [this.beamRadius, this.skyHeight, this.beamRadius], this.beamMaterial, "tower-borrow-divine-beam");
            void beam; // visual-only
            window.setTimeout(() => {
                for (const e of this.tracked) {
                    if (!e.parent) continue;
                    if (e.getPosition().y > this.centerPos.y + 1) {
                        this.animateFadeOut(e, this.durationMs);
                    }
                }
            }, 0);
        }
        if (now >= this.doneAtSec) {
            this.running = false;
        }
    }
}

// ─── KingGeser — lightning (3 telegraphed sky strikes) ─────────────────────

class GeserLightningBorrow extends TowerBorrowedAttack {
    public readonly id = "geser.lightning";
    public readonly label = "Geser Lightning";
    public readonly cooldownSeconds = 8.5;
    public readonly range = 160;

    private readonly damage = 18;
    private readonly windupMs = 700;
    private readonly strikeSpacingMs = 650;
    private readonly strikeCount = 3;
    private readonly strikeRadius = 4.4;
    private readonly boltHeight = 18;
    private readonly recoverMs = 400;
    private readonly scatterRadius = 3.5;

    private readonly boltMaterial = this.tower.createEffectMaterial(
        new Color(0.85, 0.95, 1), new Color(0.95, 1, 1), 8.0, 0.95
    );
    private readonly telegraphMaterial = this.tower.createEffectMaterial(
        new Color(0.4, 0.7, 1), new Color(0.55, 0.85, 1), 4.4, 0.6
    );

    private startSec = 0;
    private doneAtSec = 0;
    private readonly strikePositions: (Vec3 | null)[] = [null, null, null];

    public start(target: Entity, now: number): void {
        this.running = true;
        this.startSec = now;
        const firstStrikeAt = now + this.windupMs / 1000;
        const lastStrikeAt = firstStrikeAt + (this.strikeCount - 1) * this.strikeSpacingMs / 1000;
        this.doneAtSec = lastStrikeAt + this.recoverMs / 1000;

        for (let i = 0; i < this.strikeCount; i++) {
            const pos = this.computeStrikePos(target);
            this.strikePositions[i] = pos;
            const telegraphRingPos = new Vec3(pos.x, pos.y + 0.05, pos.z);
            const ring = this.makeRing(telegraphRingPos, [this.strikeRadius, 0.18, this.strikeRadius], this.telegraphMaterial, `tower-borrow-geser-ring-${i}`);
            if (ring) {
                window.setTimeout(() => {
                    if (ring.parent) this.animateFadeOut(ring, 200);
                }, this.windupMs + 200);
            }
        }

        this.tower.showStatusText("??????????", 1200);
    }

    public tick(target: Entity | null, now: number, onAttack?: (attacker: npc) => void): void {
        const elapsedMs = (now - this.startSec) * 1000;
        for (let i = 0; i < this.strikeCount; i++) {
            const strikeAtMs = this.windupMs + i * this.strikeSpacingMs;
            if (elapsedMs >= strikeAtMs && elapsedMs - strikeAtMs < 60) {
                const pos = this.strikePositions[i];
                if (!pos) continue;
                const boltOrigin = new Vec3(pos.x, pos.y, pos.z);
                const bolt = this.makeCylinder(boltOrigin, [0.55, this.boltHeight, 0.55], this.boltMaterial, `tower-borrow-geser-bolt-${i}`);
                void bolt;
                if (target) {
                    const tPos = target.getPosition();
                    const dx = tPos.x - pos.x;
                    const dz = tPos.z - pos.z;
                    if (Math.sqrt(dx * dx + dz * dz) <= this.strikeRadius) {
                        this.tower.applyDamage(this.damage, onAttack);
                    }
                }
            }
        }
        if (now >= this.doneAtSec) {
            this.running = false;
        }
    }

    private computeStrikePos(target: Entity): Vec3 {
        const tPos = target.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.scatterRadius;
        return new Vec3(
            tPos.x + Math.cos(angle) * radius,
            tPos.y + 0.05,
            tPos.z + Math.sin(angle) * radius
        );
    }
}