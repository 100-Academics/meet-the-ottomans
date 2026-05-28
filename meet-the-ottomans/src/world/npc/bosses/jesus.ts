import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";

export class Christ extends Boss {
    private readonly holyRayDamage = 28;
    private readonly holyRayRange = 160;
    private readonly holyRayCooldown = 4.0;
    private readonly holyRayWindupMs = 500;
    private readonly holyRayTravelMs = 600;
    private readonly holyRayHitRadius = 5;
    private readonly holyRaySegmentCount = 60;
    private readonly holyRayOvershoot = 100;
    private readonly holyRayMaterial = this.createHolyRayMaterial();
    private nextHolyRayAtSeconds = 0;
    private activeHolyRays = new Set<{ id: string; beamRoot: Entity; hasHit: boolean }>();

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
        const rayEnd = this.getHolyRayEnd(shotOrigin, shotTarget, attackRange);
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
        material.diffuse = new Color(1, 0.92, 0.3);
        material.emissive = new Color(1, 0.85, 0.1);
        material.emissiveIntensity = 4.5;
        material.opacity = 0.95;
        material.blendType = BLEND_ADDITIVE;
        material.depthWrite = false;
        material.cull = CULLFACE_NONE;
        material.update();
        return material;
    }

    private resolveSceneApp(targetEntity?: Entity | null) {
        const selfEntity = this.getEntity() as any;
        const selfApp = (selfEntity?.app ?? selfEntity?._app) as any;
        if (selfApp?.root) return selfApp;
        if (targetEntity) {
            const targetAny = targetEntity as any;
            const targetApp = (targetAny?.app ?? targetAny?._app) as any;
            if (targetApp?.root) return targetApp;
        }
        const globalApp = (globalThis as any)?.app as any;
        if (globalApp?.root) return globalApp;
        return undefined;
    }

    private getHolyRayEnd(origin: Vec3, targetPos: Vec3, range: number): Vec3 {
        const direction = targetPos.clone().sub(origin);
        const length = direction.length();
        if (length <= 0.001) {
            return targetPos.clone();
        }

        direction.normalize();
        const totalLength = Math.max(range, length) + this.holyRayOvershoot;
        const rayEnd = origin.clone().add(direction.mulScalar(totalLength));

        const app = this.resolveSceneApp();
        if (!app?.root) return rayEnd;

        const rigidbodySystem = (app.systems as any)?.rigidbody;
        if (!rigidbodySystem?.raycastFirst) return rayEnd;

        const rayOrigin = origin.clone();
        const rayTarget = rayEnd.clone();
        const hitResult = rigidbodySystem.raycastFirst(rayOrigin, rayTarget);

        if (hitResult?.entity && hitResult?.point) {
            const hitPoint = hitResult.point as Vec3;
            if (Number.isFinite(hitPoint.x) && Number.isFinite(hitPoint.y) && Number.isFinite(hitPoint.z)) {
                return hitPoint;
            }
        }

        return rayEnd;
    }

    private spawnHolyRay(origin: Vec3, rayEnd: Vec3, progress: number): Entity {
        const rayVector = rayEnd.clone().sub(origin);
        const fullDistance = Math.max(1, rayVector.length());
        const currentDistance = fullDistance * Math.min(1, progress);

        const beamRoot = new Entity("holy ray beam");

        if (currentDistance <= 0.5) {
            return beamRoot;
        }

        const beam = new Entity("expanding cylinder");
        beam.addComponent("render", { type: "cylinder" } as any);

        const beamRadius = 4;
        beam.setLocalScale(beamRadius, beamRadius, currentDistance);

        const midPoint = origin.clone().add(rayVector.clone().mulScalar(0.5));
        beam.setPosition(midPoint.x, midPoint.y, midPoint.z);

        const direction = rayVector.clone().normalize();
        const quat = this.getRotationTowardDirection(direction);
        beam.setLocalRotation(quat);

        if (beam.render?.meshInstances?.length) {
            beam.render.meshInstances[0].material = this.holyRayMaterial;
        }

        beamRoot.addChild(beam);
        return beamRoot;
    }

    private getRotationTowardDirection(direction: Vec3): any {
        const up = new Vec3(0, 1, 0);
        const forward = direction.clone().normalize();

        const dot = forward.dot(up);
        if (Math.abs(dot) > 0.9999) {
            return dot > 0 ? { x: 0, y: 0, z: 0, w: 1 } : { x: 0, y: 0, z: 1, w: 0 };
        }

        const right = up.clone().cross(forward).normalize();
        const newUp = forward.clone().cross(right).normalize();

        const m00 = right.x, m01 = newUp.x, m02 = forward.x;
        const m10 = right.y, m11 = newUp.y, m12 = forward.y;
        const m20 = right.z, m21 = newUp.z, m22 = forward.z;

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
        const sceneApp = this.resolveSceneApp(targetEntity);
        if (!sceneApp?.root) return;

        const rayId = `holy_ray_${Math.random()}`;
        let hasHit = false;

        const rayData = { id: rayId, beamRoot: new Entity("holy ray root"), hasHit: false };
        sceneApp.root.addChild(rayData.beamRoot);
        this.activeHolyRays.add(rayData);

        const windupStartTime = performance.now();
        const travelStartTime = windupStartTime + this.holyRayWindupMs;
        const travelEndTime = travelStartTime + this.holyRayTravelMs;

        const updateRay = () => {
            if (!this.isAlive() || !this.activeHolyRays.has(rayData)) {
                return;
            }

            const now = performance.now();

            if (now < travelStartTime) {
                requestAnimationFrame(updateRay);
                return;
            }

            if (now >= travelEndTime) {
                try { rayData.beamRoot.destroy(); } catch (e) { }
                this.activeHolyRays.delete(rayData);
                return;
            }

            const travelProgress = (now - travelStartTime) / this.holyRayTravelMs;

            rayData.beamRoot.removeChild(rayData.beamRoot.children[0]);
            const newBeam = this.spawnHolyRay(origin, rayEnd, travelProgress);
            rayData.beamRoot.addChild(newBeam);

            if (!hasHit && this.isTargetInHolyRay(targetEntity, origin, rayEnd)) {
                hasHit = true;
                onAttack?.(this);
            }

            requestAnimationFrame(updateRay);
        };

        requestAnimationFrame(updateRay);
    }

    private isTargetInHolyRay(targetEntity: Entity, origin: Vec3, rayEnd: Vec3): boolean {
        const currentPos = targetEntity.getPosition();
        const rayVector = rayEnd.clone().sub(origin);
        const rayLength = rayVector.length();
        if (rayLength <= 0.001) {
            return false;
        }

        const targetVector = currentPos.clone().sub(origin);
        const t = targetVector.dot(rayVector) / (rayLength * rayLength);
        if (t < 0 || t > 1) {
            return false;
        }

        const closestPoint = origin.clone().add(rayVector.clone().mulScalar(t));
        const distanceFromRay = currentPos.distance(closestPoint);

        return distanceFromRay <= this.holyRayHitRadius;
    }
}