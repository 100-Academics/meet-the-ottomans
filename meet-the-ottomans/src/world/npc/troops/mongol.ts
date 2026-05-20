import { Entity, Vec3 } from "playcanvas";
import { npc } from "../npc";

export class Mongol extends npc {
    protected circleRadius: number = 4.5;
    constructor(id: number, modelEntity: Entity = new Entity("mongol")) {
        super(id, 'foe', 100, modelEntity);
    }

    override updateCombatAI(deltaTime: number, currentTimeSeconds: number, allNpcs: npc[], onNpcAttack?: (attacker: npc, target: npc, damage: number) => void, playerEntity?: Entity | null, onPlayerAttack?: (attacker: npc, damage: number) => void): void {
        var doElse = true;
        var theta = -999;
        if (playerEntity && this.isAlive()) {
            const distance = this.getDistanceToEntity(playerEntity);
            if (distance < 5) { // try to avoid getting too close to the player, will implement circling later
                                // TODO CIRCLING

                var playerFacing = this.getEntityFacing(playerEntity);

                // forces the mongols onto a circle around the player.
                var xCoord = Math.sin(playerFacing.x) * this.circleRadius;
                var zCoord = Math.sin(playerFacing.z) * this.circleRadius;
                theta = Math.atan2(playerFacing.z, playerFacing.x);
                this.moveToward(xCoord, zCoord, this.aiConfig.chaseMoveSpeed, deltaTime);
            }

            if(distance > 5 && distance < this.aiConfig.attackRange){
                if (theta != -999) {

                var point = this.getPointOnCircle(this.circleRadius, theta + 5);

                this.moveToward(point.x, point.z, this.aiConfig.chaseMoveSpeed, deltaTime);
                }
            }

            doElse = false;
        }
        if (doElse) {
            super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
        }
    }

    getPointOnCircle(radius: number, angleDegrees: number): Vec3 {
        const angleRadians = angleDegrees * (Math.PI / 180);
        const x = radius * Math.cos(angleRadians);
        const z = radius * Math.sin(angleRadians);
        return new Vec3(x, 0, z);
    }
}