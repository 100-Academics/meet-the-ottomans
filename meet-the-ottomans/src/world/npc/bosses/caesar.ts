import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

// Attack types for Caesar (summon removed)
type CaesarAttackType = "buildMonument" | "bowShot";

interface MonumentState {
    endTimeSeconds: number;
    nextBlockAtSeconds: number;
    blocksSpawned: number;
    blockPositions: Vec3[];
}

interface BowState {
    endTimeSeconds: number;
    hasFired: boolean;
}

export class Caesar extends Boss {

    // Build monuments from ground
  private readonly monumentBlockCount = 25;
  private readonly monumentIntervalSeconds = 0.05;
  private readonly monumentCooldownSeconds = 0.15;
  private readonly monumentRange = 200;
  private readonly monumentDamage = 25;
  private readonly monumentHitRadius = 8.0;
    private nextMonumentAtSeconds = 0;

    // Bow & arrow
    private readonly bowDamage = 5;
    private readonly bowCooldownSeconds = 0.5;
    private readonly bowRange = 35;
    private nextBowAtSeconds = 0;

    // Runtime state
    private attackLockUntilSeconds = 0;
    private lastAttackType: CaesarAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;
    private monumentState: MonumentState | null = null;
    private bowState: BowState | null = null;
    private onPlayerAttack?: (attacker: npc, damage: number) => void;

    // VFX materials
    private readonly monumentMaterial = this.createEffectMaterial(
        new Color(0.75, 0.7, 0.55), new Color(0.9, 0.85, 0.7), 2.0, 0.8
    );
    private readonly arrowMaterial = this.createEffectMaterial(
        new Color(0.85, 0.75, 0.3), new Color(1, 0.9, 0.4), 3.0, 0.7
    );

    private readonly activeEffects = new Set<Entity>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Caesar")) {
        super(id, maxHealth, entity, "Julius Caesar");
    this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.5;
    this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.8;

        this.setIntroTaunt("Veni, vidi, vici!", "I came, I saw, I conquered!");
        this.setIntroNameTranslation("Gaius Iulius Caesar", "Julius Caesar");
        this.setTauntSet({
            highHealth: [
                "Rome's legions stand behind me.",
                "You face the dictator of the Roman Republic.",
                "The Senate has decreed your defeat."
            ],
            bossLowPlayerHigh: [
                "Alea iacta est! The die is cast!",
                "Rome does not fall to barbarians!",
                "My legions will avenge every wound!"
            ],
            playerLowBossHigh: [
                "Yield, and Rome may show mercy.",
                "You are outmatched, barbarian.",
                "Kneel before the eagle of Rome."
            ],
            bothLow: [
                "Et tu? Then fall, challenger!",
                "Rome's fate hangs by a thread."
            ],
            death: [
                "Et tu, Brute…",
                "The Republic… falls with me."
            ],
            bossDeath: [
                "The eagles… fall.",
                "Rome… endures without me.",
                " Pizza Pizza."
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

        if (this.monumentState) { this.updateMonument(dt, targetEntity, currentTimeSeconds, onAttack); return; }
        if (this.bowState) { this.updateBow(dt, targetEntity, currentTimeSeconds, onAttack); return; }

        if (currentTimeSeconds < this.attackLockUntilSeconds) { this.faceTarget(targetEntity, dt); return; }

        const distance = this.getFlatDistanceTo(targetEntity);
        const chosen = this.pickNextAttack(distance, currentTimeSeconds);
        if (chosen === "buildMonument") { this.startMonument(targetEntity, currentTimeSeconds); return; }
        if (chosen === "bowShot") { this.startBow(currentTimeSeconds); return; }

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
        return { ...base, attackDamage: this.bowDamage, attackRange: this.bowRange, attackCooldown: this.bowCooldownSeconds, detectionRange: Number.MAX_VALUE };
    }

    // ── Attack selection ──
    private pickNextAttack(distance: number, now: number): CaesarAttackType | null {
        const choices: Array<{ type: CaesarAttackType; score: number }> = [];
        if (now >= this.nextMonumentAtSeconds && distance <= this.monumentRange) {
            const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.monumentRange));
            choices.push({ type: "buildMonument", score: 1.2 + closeness });
        }
        if (now >= this.nextBowAtSeconds && distance <= this.bowRange) {
            choices.push({ type: "bowShot", score: 1.0 + (distance / Math.max(0.001, this.bowRange)) });
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

    // ── Build monuments from ground ──
    private startMonument(target: Entity, now: number): void {
        this.lastAttackType = "buildMonument"; this.lastAttackAtSeconds = now;
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z);
        if (dir.lengthSq() <= 0.0001) return; dir.normalize();

        const blockPositions: Vec3[] = [];
        for (let i = 0; i < this.monumentBlockCount; i++) {
    const forwardDist = i * 4.5 + 3;
    const lateralOffset = (i % 2 === 0 ? 1 : -1) * 3.0;
            blockPositions.push(new Vec3(
                myPos.x + dir.x * forwardDist + (-dir.z) * lateralOffset,
                myPos.y,
                myPos.z + dir.z * forwardDist + dir.x * lateralOffset
            ));
        }

        this.monumentState = {
            endTimeSeconds: now + this.monumentBlockCount * this.monumentIntervalSeconds + 1.0,
            nextBlockAtSeconds: now,
            blocksSpawned: 0,
            blockPositions
        };
        this.attackLockUntilSeconds = this.monumentState.endTimeSeconds;
    }

    private updateMonument(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.monumentState; if (!state) return;
        this.faceTarget(target, dt);

        if (state.blocksSpawned < this.monumentBlockCount && now >= state.nextBlockAtSeconds) {
            const pos = state.blockPositions[state.blocksSpawned];
            state.blocksSpawned++;
            state.nextBlockAtSeconds = now + this.monumentIntervalSeconds;

            const block = new Entity("caesar-monument-block");
            block.addComponent("render", { type: "box", material: this.monumentMaterial });
            block.setLocalScale(1.5, 0.1, 1.5);
            block.setPosition(pos.x, pos.y, pos.z);
            this.getEntity().parent?.addChild(block) ?? this.getEntity().addChild(block);
            this.activeEffects.add(block);

            // Animate rising
            const startMs = Date.now();
      const riseMs = 40;
      const holdMs = 80;
            const totalMs = riseMs + holdMs;
            const tick = () => {
                const elapsed = Date.now() - startMs;
                if (elapsed >= totalMs || !block.parent) { this.destroyEffect(block); return; }
                if (elapsed < riseMs) {
                    const t = elapsed / riseMs;
                    block.setLocalScale(1.5, 4.0 * t, 1.5);
                    block.setPosition(pos.x, pos.y + 2.0 * t, pos.z);
                }
                const mat = block.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
                if (mat && elapsed > riseMs) {
                    mat.opacity = 0.8 * (1 - (elapsed - riseMs) / holdMs);
                    mat.update();
                }
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);

            // Check hit
            const targetPos = target.getPosition();
            const dx = targetPos.x - pos.x;
            const dz = targetPos.z - pos.z;
            if (Math.sqrt(dx * dx + dz * dz) <= this.monumentHitRadius) {
                this.applyDamage(this.monumentDamage, onAttack);
            }
        }

        if (now >= state.endTimeSeconds) {
            this.monumentState = null;
            this.nextMonumentAtSeconds = now + this.monumentCooldownSeconds;
        }
    }

    // ── Bow & arrow ──
    private startBow(now: number): void {
        this.lastAttackType = "bowShot"; this.lastAttackAtSeconds = now;
        this.bowState = { endTimeSeconds: now + 0.6, hasFired: false };
        this.attackLockUntilSeconds = this.bowState.endTimeSeconds;
    }

    private updateBow(dt: number, target: Entity, now: number, onAttack?: (attacker: npc) => void): void {
        const state = this.bowState; if (!state) return;
        this.faceTarget(target, dt);
        if (!state.hasFired && now >= state.endTimeSeconds - 0.15) {
            state.hasFired = true;
            this.spawnArrowProjectile(target);
            if (this.getFlatDistanceTo(target) <= this.bowRange) {
                this.applyDamage(this.bowDamage, onAttack);
            }
        }
        if (now >= state.endTimeSeconds) {
            this.bowState = null;
            this.nextBowAtSeconds = now + this.bowCooldownSeconds;
        }
    }

    private spawnArrowProjectile(target: Entity): void {
        const myPos = this.getEntity().getPosition();
        const targetPos = target.getPosition();
        const arrow = new Entity("caesar-arrow");
        arrow.addComponent("render", { type: "cone", material: this.arrowMaterial });
        arrow.setLocalScale(0.15, 0.15, 1.5);
        const dir = new Vec3(targetPos.x - myPos.x, 0, targetPos.z - myPos.z).normalize();
        const yaw = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
        arrow.setLocalEulerAngles(0, yaw, 0);
        arrow.setPosition(myPos.x + dir.x * 2, myPos.y + 1.5, myPos.z + dir.z * 2);
        this.getEntity().parent?.addChild(arrow) ?? this.getEntity().addChild(arrow);
        this.activeEffects.add(arrow);
        const startPos = arrow.getPosition().clone();
        const speed = 45; const startMs = Date.now(); const maxMs = 1200;
        const tick = () => {
            const elapsed = Date.now() - startMs;
            if (elapsed >= maxMs || !arrow.parent) { this.destroyEffect(arrow); return; }
            const t = elapsed / 1000;
            arrow.setPosition(startPos.x + dir.x * speed * t, startPos.y, startPos.z + dir.z * speed * t);
            const mat = arrow.render?.meshInstances?.[0]?.material as StandardMaterial | undefined;
            if (mat) { mat.opacity = 0.7 * (1 - elapsed / maxMs); mat.update(); }
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
    this.activeEffects.clear(); this.monumentState = null; this.bowState = null;
  }
}
