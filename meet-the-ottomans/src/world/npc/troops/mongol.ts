import type { Entity } from "playcanvas";
import { Vec3 } from "playcanvas";
import { npc } from "../npc";

export class Mongol extends npc {
    constructor(id: number){
        super(id, 'foe', 100);
    }

    override updateCombatAI(deltaTime: number, currentTimeSeconds: number, allNpcs: npc[], onNpcAttack?: (attacker: npc, target: npc, damage: number) => void, playerEntity?: Entity | null, onPlayerAttack?: (attacker: npc, damage: number) => void): void {
        var doElse = true;
        if (playerEntity && this.isAlive()) {
            const distance = this.getDistanceToEntity(playerEntity);
            if (distance < 2.5) { // try to avoid getting too close to the player, will implement circling later
                                  // TODO CIRCLING
                                  
                var playerFacing = this.getEntityFacing(playerEntity);

                var xCoord = Math.sin(playerFacing.x) * 3;
                var zCoord = Math.sin(playerFacing.z) * 3;

                this.moveToward(xCoord, zCoord, this.aiConfig.chaseMoveSpeed, deltaTime);
                doElse = false;
            }
        }
        if (doElse) {
            super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
        }
    }

}