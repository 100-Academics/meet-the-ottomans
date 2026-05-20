import { Entity, Vec3 } from "playcanvas";
import { npc } from "../npc";

export class Mongol extends npc {
    protected circleRadius: number = 4.5;
    // Shared direction for all Mongols so they circle uniformly (1 = ccw, -1 = cw).
    protected static circleDirection: number = Math.random() > 0.5 ? 1 : -1;
    // Shared group angle (degrees) that advances once per frame so the whole group rotates together.
    protected static groupAngleDeg: number = 0;
    protected static circleAngularSpeedDeg: number = 30; // degrees per second
    protected static lastAngleUpdateTick: number = -Infinity;
    constructor(id: number, modelEntity: Entity = new Entity("mongol")) {
        super(id, 'foe', 100, modelEntity);
    }

    override updateCombatAI(deltaTime: number, currentTimeSeconds: number, allNpcs: npc[], onNpcAttack?: (attacker: npc, target: npc, damage: number) => void, playerEntity?: Entity | null, onPlayerAttack?: (attacker: npc, damage: number) => void): void {
        // Default to base behaviour unless we have a live player target.
        if (playerEntity && this.isAlive()) {
            const playerPos = playerEntity.getPosition();
            const myPos = this.getEntity().getPosition();

            // Gather living Mongol instances and determine this NPC's slot.
            const mongolInstances = allNpcs.filter(n => n instanceof Mongol && n.isAlive()) as Mongol[];
            if (mongolInstances.length > 0) {
                mongolInstances.sort((a, b) => a.getId() - b.getId());
            }

            const count = Math.max(1, mongolInstances.length);
            let index = mongolInstances.findIndex(m => m === this);
            if (index < 0) {
                index = 0;
            }

            // Update shared group angle once per frame (scene passes same currentTimeSeconds to all NPCs).
            if (Mongol.lastAngleUpdateTick !== currentTimeSeconds) {
                Mongol.groupAngleDeg = (Mongol.groupAngleDeg + (Mongol.circleAngularSpeedDeg * deltaTime * Mongol.circleDirection)) % 360;
                Mongol.lastAngleUpdateTick = currentTimeSeconds;
            }

            // Determine radius that maintains minimum arc spacing per Mongol.
            const minArcSpacing = Math.max(1.6, this.getHitboxRadius() * 1.8);
            const requiredRadius = (count * minArcSpacing) / (2 * Math.PI);
            const radius = Math.max(this.circleRadius, requiredRadius);

            // Assigned angular slot for this Mongol (degrees), offset by group rotation.
            const separationDegrees = 360 / count;
            const assignedAngleDeg = (index * separationDegrees) + Mongol.groupAngleDeg;
            const assignedAngleRad = assignedAngleDeg * (Math.PI / 180);

            // Desired world-space point on the rotating circle around player.
            const desiredX = playerPos.x + (radius * Math.cos(assignedAngleRad));
            const desiredZ = playerPos.z + (radius * Math.sin(assignedAngleRad));

            // Move toward the moving slot point.
            let toSlotX = desiredX - myPos.x;
            let toSlotZ = desiredZ - myPos.z;
            this.moveToward(toSlotX, toSlotZ, this.aiConfig.chaseMoveSpeed, deltaTime);
            return;
        }

        // Fallback to default NPC behaviour when no player present or NPC dead.
        super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
    }

    getPointOnCircle(radius: number, angleDegrees: number): Vec3 {
        const angleRadians = angleDegrees * (Math.PI / 180);
        const x = radius * Math.cos(angleRadians);
        const z = radius * Math.sin(angleRadians);
        return new Vec3(x, 0, z);
    }
}