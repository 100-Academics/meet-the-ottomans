import { Entity } from "playcanvas";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";
import { Boss } from "./boss";

export class GenghisKhan extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("genghisKhan")) {
        super(id, maxHealth, entity, "Genghis Khan");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.7;
    }
}