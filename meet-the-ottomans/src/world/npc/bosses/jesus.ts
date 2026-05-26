import { Boss } from "./boss";
import { Entity, Vec3, StandardMaterial, BLEND_ADDITIVE, CULLFACE_NONE, Color } from "playcanvas";
import type { npc } from "../npc";

export class Christ extends Boss {
    private readonly holyRayDamage = 28;
    private readonly holyRayRange = 160;
    private readonly holyRayCooldown = 4.0;
    private readonly holyRayWindupMs = 900;
    private readonly holyRayLifetimeMs = 1250;
    private readonly holyRayHitRadius = 4.5;
    private readonly holyRaySegmentCount = 88;
    private readonly holyRayOvershoot = 90;
    private readonly holyRayMaterial = this.createHolyRayMaterial();
    private nextHolyRayAtSeconds = 0;
    private pendingHolyRayTimeoutId: number | undefined;

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

        if (this.pendingHolyRayTimeoutId !== undefined) {
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
        this.pendingHolyRayTimeoutId = window.setTimeout(() => {
            this.pendingHolyRayTimeoutId = undefined;
            if (!this.isAlive()) {
                return;
            }

            const hit = this.isTargetInHolyRay(targetEntity, shotOrigin, rayEnd);
            if (hit) {
                onAttack?.(this);
            }
        }, this.holyRayWindupMs);

        this.spawnHolyRay(targetEntity, shotOrigin, rayEnd, true);
    }

    public override kill(): boolean {
        if (this.pendingHolyRayTimeoutId !== undefined) {
            window.clearTimeout(this.pendingHolyRayTimeoutId);
            this.pendingHolyRayTimeoutId = undefined;
        }
        return super.kill();
    }

    private createHolyRayMaterial(): StandardMaterial {
        const material = new StandardMaterial();
        material.useLighting = false;
        material.diffuse = new Color(0.9, 0.95, 1);
        material.emissive = new Color(0.85, 0.97, 1);
        material.emissiveIntensity = 3.2;
        material.opacity = 0.9;
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
        const targetAny = targetEntity as any;
        const targetApp = (targetAny?.app ?? targetAny?._app) as any;
        if (targetApp?.root) return targetApp;
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
        return origin.clone().add(direction.mulScalar(totalLength));
    }

    private spawnHolyRay(targetEntity: Entity, origin: Vec3, rayEnd: Vec3, telegraphOnly = false): void {
        const sceneApp = this.resolveSceneApp(targetEntity);
        if (!sceneApp?.root) return;

        const rayVector = rayEnd.clone().sub(origin);
        const distance = Math.max(1, rayVector.length());
        if (distance <= 0.001) return;
        const stepVector = rayVector.clone().mulScalar(1 / distance);

        const segmentCount = this.holyRaySegmentCount;
        const segmentScale = Math.max(0.08, distance * 0.016);

        const beamRoot = new Entity(telegraphOnly ? "holy ray telegraph" : "holy ray");
        sceneApp.root.addChild(beamRoot);

        for (let i = 0; i < segmentCount; i++) {
            const t = i / Math.max(1, segmentCount - 1);
            const point = origin.clone().add(stepVector.clone().mulScalar(distance * t));

            const segment = new Entity(`holy ray segment ${i}`);
            segment.addComponent("render", { type: "sphere" } as any);
            segment.setLocalScale(segmentScale, segmentScale * 0.9, segmentScale);
            segment.setPosition(point.x, point.y, point.z);
            if (segment.render?.meshInstances?.length) {
                segment.render.meshInstances[0].material = this.holyRayMaterial;
            }
            beamRoot.addChild(segment);
        }

        window.setTimeout(() => {
            try { beamRoot.destroy(); } catch (e) { }
        }, this.holyRayLifetimeMs);
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