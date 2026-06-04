import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

// Combat behavior and VFX for the Jesus Christ boss.
type ChristAttackType = "spire" | "ray" | "burst";

export class Christ extends Boss {
    // Tunable attack parameters.
    private readonly holySpireDamage = 28;
    private readonly holySpireRange = 160;
    private readonly holySpireCooldown = 4.0;
    private readonly holySpireWindupMs = 500;
    private readonly holySpireTravelMs = 600;
    private readonly holySpireHitRadius = 6;
    private readonly holySpireBeamRadius = 3.5;
    private readonly holySpireOvershoot = 100;
    private readonly holySpireMaterial = this.createHolySpireMaterial();
    private nextHolySpireAtSeconds = 0;

    private readonly holyRayRange = 240;
    private readonly holyRayCooldown = 5.5;
    private readonly holyRayWindupMs = 450;
    private readonly holyRayTravelMs = 420;
    private readonly holyRayHitRadius = 6.5;
    private readonly holyRayBeamRadius = 4.2;
    private readonly holyRayOvershoot = 160;
    private readonly holyRayPitchDownDeg = 75;
    private readonly holyRayLingerMs = 900;
    private readonly holyRayRehitCooldownMs = 350;
    private readonly holyRayMaterial = this.createHolyRayMaterial();
    private nextHolyRayAtSeconds = 0;
    // Holy burst attack constants
    private readonly holyBurstRange = 12;
    private readonly holyBurstCooldown = 8.0;

    private readonly holyBurstDurationMs = 500;
    private nextHolyBurstAtSeconds = 0;

    // Runtime state used to sequence attacks and cooldowns.
    private lastAttackType: ChristAttackType | null = null;
    private lastAttackAtSeconds = -Infinity;

    private activeHolyBeams = new Set<{ beamRoot: Entity; hasHit: boolean }>();

    

constructor(id: number, maxHealth: number, entity: Entity = new Entity("Jesus Christ")) {
        super(id, maxHealth, entity, "Jesus Christ");
        // Adjust movement speeds for better responsiveness
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;
        // Use a reasonable attack range to allow movement when player is farther away
        this.aiConfig.attackRange = 30;
        this.setTauntSet({
            highHealth: [
                "You have come far to fall here.",
                "I am the way, the truth, and the life. Stand down."
            ],
            bossLowPlayerHigh: [
                "I'll show you divine justice!",
                "I have given my life for Man before, and I will not do it again."
            ],
            playerLowBossHigh: [
                "Your burden grows heavier.",
                "You walk a harder road now."
            ],
            bothLow: [
                "I have felled those stronger than you.",
                "Endurance is all that remains.",
                "If I fall here, my Father will finish the job."
            ],
            death: [
                "I forgive you.",
                "Your sins have been cleansed."
            ],
            bossDeath: [
                "The body falls, but the path remains.",
                "Forgive me, my children."
            ]
        });
        this.setIntroTaunt("Ego sum via.", "I am the way.");
        this.setIntroNameTranslation("Iesus Christus", "Jesus Christ");

        this.aiConfig.attackCooldown = Math.min(this.holySpireCooldown, this.holyRayCooldown);
    }


    protected override getCombatProfile() {
        const base = super.getCombatProfile();
        return {
            ...base,
            attackDamage: this.holySpireDamage,
            attackRange: 30,
            attackCooldown: Math.min(this.holySpireCooldown, this.holyRayCooldown),
            detectionRange: Number.MAX_VALUE
        };
    }

    // Choose the next attack based on range, cooldowns, and recent history.
    private pickNextAttack(distance: number, nowSeconds: number): ChristAttackType | null {
        const choices: Array<{ type: ChristAttackType; score: number }> = [];
        const spireReady = nowSeconds >= this.nextHolySpireAtSeconds;
        const rayReady = nowSeconds >= this.nextHolyRayAtSeconds;

        if (spireReady) {
            const closeness = 1 - Math.min(1, distance / Math.max(0.001, this.holySpireRange));
            choices.push({ type: "spire", score: 1.05 + closeness });
        }

        if (rayReady) {
            const farBias = Math.min(1, distance / Math.max(0.001, this.holyRayRange));
            choices.push({ type: "ray", score: 0.95 + farBias });
        }
        const burstReady = nowSeconds >= this.nextHolyBurstAtSeconds;
        if (burstReady) {
            const closeBias = Math.max(0, 1 - distance / Math.max(0.001, this.holyBurstRange));
            choices.push({ type: "burst", score: 0.85 + closeBias });
        }

        if (choices.length === 0) {
            return null;
        }

        const recentWindowSeconds = 1.6;
        if (this.lastAttackType && (nowSeconds - this.lastAttackAtSeconds) < recentWindowSeconds) {
            for (const choice of choices) {
                if (choice.type === this.lastAttackType) {
                    choice.score *= 0.6;
                }
            }
        }

        let best = choices[0];
        for (let i = 1; i < choices.length; i += 1) {
            if (choices[i].score > best.score) {
                best = choices[i];
            }
        }

        const tied = choices.filter((choice) => Math.abs(choice.score - best.score) < 0.05);
        if (tied.length > 1) {
            return tied[Math.floor(Math.random() * tied.length)].type;
        }

        return best.type;
    }

    // Main per-frame AI loop for the boss.
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
        if (!this.isAlive()) {
            return;
        }

        if (!targetEntity) {
            super.updateAI(deltaTime, targetEntity, currentTimeSeconds, onAttack, profileOverride);
            return;
        }

        const profile = profileOverride ?? this.getCombatProfile();
        const attackRange = Math.max(0.5, profile.attackRange);
        const clampedDeltaTime = Math.max(0, Math.min(deltaTime, 0.05));

        if (this.activeHolyBeams.size > 0) {
            super.updateAI(clampedDeltaTime, targetEntity, currentTimeSeconds, undefined, profile);
            return;
        }

        const myPos = this.getEntity().getPosition();
        const targetPos = targetEntity.getPosition();
        const dx = targetPos.x - myPos.x;
        const dz = targetPos.z - myPos.z;
        const distance = Math.sqrt((dx * dx) + (dz * dz));

        if (distance > profile.detectionRange) {
            super.updateAI(clampedDeltaTime, null, currentTimeSeconds, undefined, profile);
            return;
        }

        if (distance > attackRange) {
            this.moveToward(dx, dz, this.aiConfig.chaseMoveSpeed, clampedDeltaTime);
            return;
        }

        const chosenAttack = this.pickNextAttack(distance, currentTimeSeconds);
        if (!chosenAttack) {
            return;
        }

        const shotOrigin = myPos.clone();
        const shotTarget = targetPos.clone();

        if (chosenAttack === "ray") {
            this.lastAttackType = "ray";
            this.lastAttackAtSeconds = currentTimeSeconds;
            this.nextHolyRayAtSeconds = currentTimeSeconds + this.holyRayCooldown;
            this.fireHolyRay(targetEntity, onAttack);
            return;
        }
        if (chosenAttack === "burst") {
            this.lastAttackType = "burst";
            this.lastAttackAtSeconds = currentTimeSeconds;
            this.nextHolyBurstAtSeconds = currentTimeSeconds + this.holyBurstCooldown;
            this.fireHolyBurst(targetEntity, onAttack);
            return;
        }

        this.lastAttackType = "spire";
        this.lastAttackAtSeconds = currentTimeSeconds;
        this.nextHolySpireAtSeconds = currentTimeSeconds + this.holySpireCooldown;
        const spireEnd = this.calculateHolySpireEnd(shotOrigin, shotTarget);
        this.fireHolySpire(targetEntity, shotOrigin, spireEnd, onAttack);
    }

    public override kill(): boolean {
        this.activeHolyBeams.forEach(ray => {
            try { ray.beamRoot.destroy(); } catch (e) { }
        });
        this.activeHolyBeams.clear();
        return super.kill();
    }

    private createHolySpireMaterial(): StandardMaterial {
        const material = new StandardMaterial();
        material.useLighting = false;
        material.diffuse = new Color(1, 0.92, 0.4);
        material.emissive = new Color(1, 0.95, 0.5);
        material.emissiveIntensity = 3.6;
        material.opacity = 0.8;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        return material;
    }

    private createHolyRayMaterial(): StandardMaterial {
        const material = new StandardMaterial();
        material.useLighting = false;
        material.diffuse = new Color(1, 0.96, 0.72);
        material.emissive = new Color(1, 0.98, 0.85);
        material.emissiveIntensity = 6.4;
        material.opacity = 0.95;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        return material;
    }

    private getAimedTargetPosition(targetEntity: Entity): Vec3 {
        const targetPos = targetEntity.getPosition().clone();
        const controller = (targetEntity as any)?.script?.FirstPersonCamera
            ?? (targetEntity as any)?.script?.firstPersonCamera;
        const rawGroundHeight = controller?.groundHeight;
        const rawPlayerHeight = controller?.playerHeight;
        const playerHeight = Number.isFinite(rawPlayerHeight) ? rawPlayerHeight : 2;
        const cameraAimOffset = Math.max(1.2, playerHeight * 0.8);
        let aimY = targetPos.y - cameraAimOffset;

        if (Number.isFinite(rawGroundHeight)) {
            const cameraToGround = Math.abs(targetPos.y - rawGroundHeight);
            const maxGroundDelta = Math.max(3, playerHeight * 2.5);
            if (cameraToGround <= maxGroundDelta) {
                aimY = rawGroundHeight + (playerHeight * 0.45);
            }
        }

        targetPos.y = aimY;
        return targetPos;
    }

    private getSceneApp(): any {
        const selfEntity = this.getEntity() as any;
        const selfApp = (selfEntity?.app ?? selfEntity?._app) as any;
        if (selfApp?.root) return selfApp;
        const globalApp = (globalThis as any)?.app as any;
        if (globalApp?.root) return globalApp;
        return undefined;
    }

    private getWorldBoundsFromTarget(targetEntity: Entity): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
        const controller = (targetEntity as any)?.script?.FirstPersonCamera
            ?? (targetEntity as any)?.script?.firstPersonCamera;
        const minX = controller?.movementBoundsMinX;
        const maxX = controller?.movementBoundsMaxX;
        const minZ = controller?.movementBoundsMinZ;
        const maxZ = controller?.movementBoundsMaxZ;

        if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
            return null;
        }

        if (minX > maxX || minZ > maxZ) {
            return null;
        }

        return { minX, maxX, minZ, maxZ };
    }

    private getRayEndAtBounds(
        origin: Vec3,
        dirNorm: Vec3,
        bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
    ): Vec3 | null {
        const epsilon = 0.0001;
        const candidates: number[] = [];

        if (Math.abs(dirNorm.x) > epsilon) {
            const tMinX = (bounds.minX - origin.x) / dirNorm.x;
            const zAtMinX = origin.z + (dirNorm.z * tMinX);
            if (tMinX > 0 && Number.isFinite(zAtMinX)
                && zAtMinX >= (bounds.minZ - epsilon) && zAtMinX <= (bounds.maxZ + epsilon)) {
                candidates.push(tMinX);
            }

            const tMaxX = (bounds.maxX - origin.x) / dirNorm.x;
            const zAtMaxX = origin.z + (dirNorm.z * tMaxX);
            if (tMaxX > 0 && Number.isFinite(zAtMaxX)
                && zAtMaxX >= (bounds.minZ - epsilon) && zAtMaxX <= (bounds.maxZ + epsilon)) {
                candidates.push(tMaxX);
            }
        }

        if (Math.abs(dirNorm.z) > epsilon) {
            const tMinZ = (bounds.minZ - origin.z) / dirNorm.z;
            const xAtMinZ = origin.x + (dirNorm.x * tMinZ);
            if (tMinZ > 0 && Number.isFinite(xAtMinZ)
                && xAtMinZ >= (bounds.minX - epsilon) && xAtMinZ <= (bounds.maxX + epsilon)) {
                candidates.push(tMinZ);
            }

            const tMaxZ = (bounds.maxZ - origin.z) / dirNorm.z;
            const xAtMaxZ = origin.x + (dirNorm.x * tMaxZ);
            if (tMaxZ > 0 && Number.isFinite(xAtMaxZ)
                && xAtMaxZ >= (bounds.minX - epsilon) && xAtMaxZ <= (bounds.maxX + epsilon)) {
                candidates.push(tMaxZ);
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        const t = Math.min(...candidates);
        if (!Number.isFinite(t) || t <= 0) {
            return null;
        }

        return origin.clone().add(dirNorm.clone().mulScalar(t));
    }

    private calculateHolySpireEnd(origin: Vec3, targetPos: Vec3): Vec3 {
        const direction = targetPos.clone().sub(origin);
        const length = direction.length();
        if (length <= 0.001) {
            return targetPos.clone();
        }

        direction.normalize();
        const totalLength = Math.max(this.holySpireRange, length) + this.holySpireOvershoot;
        const rayEnd = origin.clone().add(direction.mulScalar(totalLength));

        const app = this.getSceneApp();
        if (!app?.root) return rayEnd;

        const rigidbodySystem = (app.systems as any)?.rigidbody;
        if (!rigidbodySystem?.raycastFirst) return rayEnd;

        try {
            const hitResult = rigidbodySystem.raycastFirst(origin, rayEnd);
            if (hitResult?.point) {
                const hitPoint = hitResult.point as Vec3;
                if (Number.isFinite(hitPoint.x) && Number.isFinite(hitPoint.y) && Number.isFinite(hitPoint.z)) {
                    return hitPoint;
                }
            }
        } catch (e) {
            // raycast failed, use default end
        }

        return rayEnd;
    }

    private calculateHolyRayEnd(origin: Vec3, targetPos: Vec3, targetEntity?: Entity): Vec3 {
        const direction = targetPos.clone().sub(origin);
        const length = direction.length();
        if (length <= 0.001) {
            return targetPos.clone();
        }

        const dirNorm = direction.clone().mulScalar(1 / length);
        if (Number.isFinite(this.holyRayPitchDownDeg) && Math.abs(this.holyRayPitchDownDeg) > 0.01) {
            const pitchRad = this.holyRayPitchDownDeg * (Math.PI / 180);
            const up = new Vec3(0, 1, 0);
            const right = new Vec3().cross(up, dirNorm);
            const rightLen = right.length();
            if (rightLen > 0.0001) {
                right.mulScalar(1 / rightLen);
                const cross = new Vec3().cross(right, dirNorm);
                const cos = Math.cos(pitchRad);
                const sin = Math.sin(pitchRad);
                const rotated = dirNorm.clone().mulScalar(cos).add(cross.mulScalar(sin));
                dirNorm.copy(rotated).normalize();
            }
        }
        const bounds = targetEntity ? this.getWorldBoundsFromTarget(targetEntity) : null;
        if (bounds) {
            const boundedEnd = this.getRayEndAtBounds(origin, dirNorm, bounds);
            if (boundedEnd) {
                return boundedEnd;
            }
        }

        const totalLength = Math.max(this.holyRayRange, length) + this.holyRayOvershoot;
        return origin.clone().add(dirNorm.mulScalar(totalLength));
    }

    private getHolyRayBeamRadius(progress: number): number {
        const clamped = Math.max(0, Math.min(1, progress));
        const minScale = 0.6;
        const maxScale = 1.4;
        return this.holyRayBeamRadius * (minScale + ((maxScale - minScale) * clamped));
    }

    private createCylinderBeam(
        origin: Vec3,
        end: Vec3,
        progress: number,
        radius: number,
        material: StandardMaterial,
        label: string
    ): Entity {
        const direction = end.clone().sub(origin);
        const fullDistance = direction.length();

        if (fullDistance <= 0.5) {
            return new Entity(label);
        }

        const traveledDistance = fullDistance * Math.min(1, progress);
        if (traveledDistance <= 0.5) {
            return new Entity(label);
        }

        const beamRoot = new Entity(label);
        const beam = new Entity(`${label} mesh`);
        beam.addComponent("render", { type: "cylinder" } as any);
        beam.setLocalScale(radius, traveledDistance, radius);
        beam.setLocalPosition(0, traveledDistance * 0.5, 0);

        if (beam.render?.meshInstances?.length) {
            beam.render.meshInstances[0].material = material;
        }

        beamRoot.addChild(beam);
        beamRoot.setPosition(origin.x, origin.y, origin.z);

        const dirNorm = direction.clone().mulScalar(1 / fullDistance);
        const quat = this.directionToQuaternionFromUp(dirNorm);
        beamRoot.setLocalRotation(quat.x, quat.y, quat.z, quat.w);

        return beamRoot;
    }

    private directionToQuaternionFromUp(dir: Vec3): { x: number; y: number; z: number; w: number } {
        const up = dir.clone().normalize();
        const forwardSeed = Math.abs(up.y) > 0.99 ? new Vec3(1, 0, 0) : new Vec3(0, 0, 1);

        const right = new Vec3();
        forwardSeed.clone().cross(up, right).normalize();

        const forward = new Vec3();
        up.clone().cross(right, forward).normalize();

        return this.matrixToQuat(right, up, forward);
    }

    private matrixToQuat(right: Vec3, up: Vec3, forward: Vec3): { x: number; y: number; z: number; w: number } {
        const m00 = right.x, m01 = up.x, m02 = forward.x;
        const m10 = right.y, m11 = up.y, m12 = forward.y;
        const m20 = right.z, m21 = up.z, m22 = forward.z;

        const trace = m00 + m11 + m22;
        let w, x, y, z;

        if (trace > 0) {
            const s = 0.5 / Math.sqrt(trace + 1);
            w = 0.25 / s;
            x = (m21 - m12) * s;
            y = (m02 - m20) * s;
            z = (m10 - m01) * s;
        } else if (m00 > m11 && m00 > m22) {
            const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
            w = (m21 - m12) / s;
            x = 0.25 * s;
            y = (m01 + m10) / s;
            z = (m02 + m20) / s;
        } else if (m11 > m22) {
            const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
            w = (m02 - m20) / s;
            x = (m01 + m10) / s;
            y = 0.25 * s;
            z = (m12 + m21) / s;
        } else {
            const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
            w = (m10 - m01) / s;
            x = (m02 + m20) / s;
            y = (m12 + m21) / s;
            z = 0.25 * s;
        }

        return { x, y, z, w };
    }

    private fireHolySpire(targetEntity: Entity, origin: Vec3, rayEnd: Vec3, onAttack?: (attacker: npc) => void): void {
        const app = this.getSceneApp();
        if (!app?.root) return;

        let hasHit = false;
        const rayData = { beamRoot: new Entity("holy spire root"), hasHit: false };
        app.root.addChild(rayData.beamRoot);
        this.activeHolyBeams.add(rayData);

        const windupStart = performance.now();
        const travelStart = windupStart + this.holySpireWindupMs;
        const travelEnd = travelStart + this.holySpireTravelMs;

        const animate = () => {
            if (!this.isAlive() || !this.activeHolyBeams.has(rayData)) {
                return;
            }

            const now = performance.now();

            if (now < travelStart) {
                requestAnimationFrame(animate);
                return;
            }

            if (now >= travelEnd) {
                try { rayData.beamRoot.destroy(); } catch (e) { }
                this.activeHolyBeams.delete(rayData);
                return;
            }

            const progress = (now - travelStart) / this.holySpireTravelMs;
            const beam = this.createCylinderBeam(
                origin,
                rayEnd,
                progress,
                this.holySpireBeamRadius,
                this.holySpireMaterial,
                "holy spire cylinder"
            );

            if (rayData.beamRoot.children.length > 0) {
                rayData.beamRoot.removeChild(rayData.beamRoot.children[0]);
            }
            rayData.beamRoot.addChild(beam);

            if (!hasHit && this.isHitByRay(targetEntity, origin, rayEnd, this.holySpireHitRadius)) {
                hasHit = true;
                onAttack?.(this);
                // Visual explosion at target position
                this.spawnExplosion(targetEntity.getPosition().clone(), 3, new Color(1, 0.92, 0.4), 300);
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    private fireHolyRay(targetEntity: Entity, onAttack?: (attacker: npc) => void): void {
        const app = this.getSceneApp();
        if (!app?.root) return;

        const rayData = { beamRoot: new Entity("holy ray root"), hasHit: false };
        app.root.addChild(rayData.beamRoot);
        this.activeHolyBeams.add(rayData);

        const windupStart = performance.now();
        const travelStart = windupStart + this.holyRayWindupMs;
        const travelEnd = travelStart + this.holyRayTravelMs;
        const lingerEnd = travelEnd + this.holyRayLingerMs;
        let hasFired = false;
        let origin = this.getEntity().getPosition().clone();
        let rayEnd = origin.clone();
        let totalLength = 0;
        let lastHitTime = 0;

        const fireRay = () => {
            origin = this.getEntity().getPosition().clone();
            const targetPos = this.getAimedTargetPosition(targetEntity);
            rayEnd = this.calculateHolyRayEnd(origin, targetPos, targetEntity);
            totalLength = rayEnd.clone().sub(origin).length();
            hasFired = true;
        };

        const animate = () => {
            if (!this.isAlive() || !this.activeHolyBeams.has(rayData)) {
                return;
            }

            const now = performance.now();

            if (now < travelStart) {
                requestAnimationFrame(animate);
                return;
            }

            if (now >= lingerEnd) {
                try { rayData.beamRoot.destroy(); } catch (e) { }
                this.activeHolyBeams.delete(rayData);
                return;
            }

            if (!hasFired) {
                fireRay();
            }

            if (totalLength > 0.001 && (now - lastHitTime) >= this.holyRayRehitCooldownMs
                && this.isHitByRay(targetEntity, origin, rayEnd, this.holyRayHitRadius)) {
                lastHitTime = now;
                onAttack?.(this);
                // Visual explosion at target position
                this.spawnExplosion(targetEntity.getPosition().clone(), 2.5, new Color(1, 0.96, 0.72), 300);
            }

            const progress = Math.min(1, (now - travelStart) / this.holyRayTravelMs);
            const beam = this.createCylinderBeam(
                origin,
                rayEnd,
                progress,
                this.getHolyRayBeamRadius(progress),
                this.holyRayMaterial,
                "holy ray cylinder"
            );

            if (rayData.beamRoot.children.length > 0) {
                rayData.beamRoot.removeChild(rayData.beamRoot.children[0]);
            }
            rayData.beamRoot.addChild(beam);

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    private fireHolyBurst(targetEntity: Entity, onAttack?: (attacker: npc) => void): void {
        const app = this.getSceneApp();
        if (!app?.root) return;

        const position = targetEntity.getPosition().clone();
        const burst = new Entity("holy burst");
        const material = new StandardMaterial();
        material.useLighting = false;
        material.emissive = new Color(1, 0.8, 0.2);
        material.emissiveIntensity = 6;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        burst.addComponent('render', { type: 'sphere', material } as any);
        const startScale = 0.5;
        burst.setLocalScale(startScale, startScale, startScale);
        burst.setPosition(position.x, position.y, position.z);
        app.root.addChild(burst);

        // Damage if within range
        const distance = this.getEntity().getPosition().distance(position);
        if (distance <= this.holyBurstRange) {
            onAttack?.(this);
            this.spawnExplosion(position, 2, new Color(1, 0.8, 0.2), 300);
        }

        // Animate expansion and fade out
        const start = performance.now();
        const end = start + this.holyBurstDurationMs;
        const animate = () => {
            if (!this.isAlive() || !app.root?.children?.includes(burst)) {
                burst.destroy();
                return;
            }
            const now = performance.now();
            if (now >= end) {
                burst.destroy();
                return;
            }
            const t = (now - start) / this.holyBurstDurationMs;
            const scale = startScale + t * this.holyBurstRange;
            burst.setLocalScale(scale, scale, scale);
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // Helper to create a simple explosion visual at a position.
    private spawnExplosion(position: Vec3, radius: number, color: Color, durationMs: number): void {
        const app = this.getSceneApp();
        if (!app?.root) return;
        const explosion = new Entity('explosion');
        const mat = new StandardMaterial();
        mat.useLighting = false;
        mat.emissive = color;
        mat.emissiveIntensity = 6;
        mat.blendType = BLEND_ADDITIVE;
        mat.depthWrite = false;
        mat.cull = CULLFACE_NONE;
        mat.update();
        explosion.addComponent('render', { type: 'sphere', material: mat } as any);
        explosion.setLocalScale(radius, radius, radius);
        explosion.setPosition(position.x, position.y, position.z);
        app.root.addChild(explosion);
        setTimeout(() => { explosion.destroy(); }, durationMs);
    }

    private isHitByRay(
        targetEntity: Entity,
        origin: Vec3,
        rayEnd: Vec3,
        hitRadius: number,
        targetPosOverride?: Vec3
    ): boolean {
        const targetPos = targetPosOverride ?? targetEntity.getPosition();
        const rayDir = rayEnd.clone().sub(origin);
        const rayLen = rayDir.length();

        if (rayLen <= 0.001) {
            return false;
        }

        const toTarget = targetPos.clone().sub(origin);
        const t = toTarget.dot(rayDir) / (rayLen * rayLen);

        if (t < 0 || t > 1) {
            return false;
        }

        const closest = origin.clone().add(rayDir.clone().mulScalar(t));
        const dist = targetPos.distance(closest);

        return dist <= hitRadius;
    }
}
