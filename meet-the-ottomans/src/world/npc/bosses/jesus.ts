import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";

export class Christ extends Boss {
    private readonly holyRayDamage = 28;
    private readonly holyRayRange = 160;
    private readonly holyRayCooldown = 4.0;
    private readonly holyRayWindupMs = 500;
    private readonly holyRayTravelMs = 600;
    private readonly holyRayHitRadius = 6;
    private readonly holyRayBeamRadius = 3.5;
    private readonly holyRayOvershoot = 100;
    private readonly holyRayMaterial = this.createHolyRayMaterial();
    private nextHolyRayAtSeconds = 0;
    private activeHolyRays = new Set<{ beamRoot: Entity; hasHit: boolean }>();

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Jesus Christ")) {
        super(id, maxHealth, entity, "Jesus Christ");
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
                "I forgive you."
            ],
            bossDeath: [
                "The body falls, but the path remains.",
                "Forgive me, my children."
            ]
        });
        this.aiConfig.attackRange = this.holyRayRange;
        this.aiConfig.attackCooldown = this.holyRayCooldown;
    }

    protected override getCombatProfile() {
        const base = super.getCombatProfile();
        return {
            ...base,
            attackDamage: this.holyRayDamage,
            attackRange: this.holyRayRange,
            attackCooldown: this.holyRayCooldown,
            detectionRange: Number.MAX_VALUE
        };
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

        if (this.activeHolyRays.size > 0) {
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

        if (currentTimeSeconds < this.nextHolyRayAtSeconds) {
            return;
        }

        this.nextHolyRayAtSeconds = currentTimeSeconds + this.holyRayCooldown;
        const shotOrigin = myPos.clone();
        const shotTarget = targetPos.clone();
        const rayEnd = this.calculateRayEnd(shotOrigin, shotTarget);
        this.fireHolyRay(targetEntity, shotOrigin, rayEnd, onAttack);
    }

    public override kill(): boolean {
        this.activeHolyRays.forEach(ray => {
            try { ray.beamRoot.destroy(); } catch (e) { }
        });
        this.activeHolyRays.clear();
        return super.kill();
    }

    private createHolyRayMaterial(): StandardMaterial {
        const material = new StandardMaterial();
        material.useLighting = false;
        material.diffuse = new Color(1, 0.85, 0.2);
        material.emissive = new Color(1, 0.9, 0.3);
        material.emissiveIntensity = 4.5;
        material.opacity = 0.85;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        return material;
    }

    private getSceneApp(): any {
        const selfEntity = this.getEntity() as any;
        const selfApp = (selfEntity?.app ?? selfEntity?._app) as any;
        if (selfApp?.root) return selfApp;
        const globalApp = (globalThis as any)?.app as any;
        if (globalApp?.root) return globalApp;
        return undefined;
    }

    private calculateRayEnd(origin: Vec3, targetPos: Vec3): Vec3 {
        const direction = targetPos.clone().sub(origin);
        const length = direction.length();
        if (length <= 0.001) {
            return targetPos.clone();
        }

        direction.normalize();
        const totalLength = Math.max(this.holyRayRange, length) + this.holyRayOvershoot;
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

    private createCylinderBeam(origin: Vec3, end: Vec3, progress: number): Entity {
        const direction = end.clone().sub(origin);
        const fullDistance = direction.length();

        if (fullDistance <= 0.5) {
            return new Entity("beam");
        }

        const traveledDistance = fullDistance * Math.min(1, progress);
        if (traveledDistance <= 0.5) {
            return new Entity("beam");
        }

        const beam = new Entity("holy ray cylinder");
        beam.addComponent("render", { type: "cylinder" } as any);

        const radius = this.holyRayBeamRadius;
        beam.setLocalScale(radius, traveledDistance, radius);

        const dirNorm = direction.clone().mulScalar(1 / fullDistance);
        const midPoint = origin.clone().add(dirNorm.clone().mulScalar(traveledDistance * 0.5));
        beam.setPosition(midPoint.x, midPoint.y, midPoint.z);

        const quat = this.directionToQuaternion(dirNorm);
        beam.setLocalRotation(quat.x, quat.y, quat.z, quat.w);

        if (beam.render?.meshInstances?.length) {
            beam.render.meshInstances[0].material = this.holyRayMaterial;
        }

        return beam;
    }

    private directionToQuaternion(dir: Vec3): { x: number; y: number; z: number; w: number } {
        const forward = dir.clone().normalize();
        const up = new Vec3(0, 1, 0);

        const dot = forward.dot(up);
        if (Math.abs(dot) > 0.99) {
            const right = Math.abs(dot) > 0 ? new Vec3(1, 0, 0) : new Vec3(0, 0, 1);
            const newUp = new Vec3();
            forward.clone().cross(right, newUp);
            newUp.normalize();
            const newRight = new Vec3();
            newUp.clone().cross(forward, newRight);

            return this.matrixToQuat(newRight, newUp, forward);
        }

        const right = new Vec3();
        up.clone().cross(forward, right);
        right.normalize();

        const newUp = new Vec3();
        forward.clone().cross(right, newUp);
        newUp.normalize();

        return this.matrixToQuat(right, newUp, forward);
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

    private fireHolyRay(targetEntity: Entity, origin: Vec3, rayEnd: Vec3, onAttack?: (attacker: npc) => void): void {
        const app = this.getSceneApp();
        if (!app?.root) return;

        let hasHit = false;
        const rayData = { beamRoot: new Entity("holy ray root"), hasHit: false };
        app.root.addChild(rayData.beamRoot);
        this.activeHolyRays.add(rayData);

        const windupStart = performance.now();
        const travelStart = windupStart + this.holyRayWindupMs;
        const travelEnd = travelStart + this.holyRayTravelMs;

        const animate = () => {
            if (!this.isAlive() || !this.activeHolyRays.has(rayData)) {
                return;
            }

            const now = performance.now();

            if (now < travelStart) {
                requestAnimationFrame(animate);
                return;
            }

            if (now >= travelEnd) {
                try { rayData.beamRoot.destroy(); } catch (e) { }
                this.activeHolyRays.delete(rayData);
                return;
            }

            const progress = (now - travelStart) / this.holyRayTravelMs;
            const beam = this.createCylinderBeam(origin, rayEnd, progress);

            if (rayData.beamRoot.children.length > 0) {
                rayData.beamRoot.removeChild(rayData.beamRoot.children[0]);
            }
            rayData.beamRoot.addChild(beam);

            if (!hasHit && this.isHitByRay(targetEntity, origin, rayEnd)) {
                hasHit = true;
                onAttack?.(this);
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    private isHitByRay(targetEntity: Entity, origin: Vec3, rayEnd: Vec3): boolean {
        const targetPos = targetEntity.getPosition();
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

        return dist <= this.holyRayHitRadius;
    }
}
