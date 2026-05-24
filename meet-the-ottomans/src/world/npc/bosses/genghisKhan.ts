import { Entity } from "playcanvas";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";
import { Boss } from "./boss";

export class GenghisKhan extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("genghisKhan")) {
        super(id, maxHealth, entity, "Genghis Khan");
        this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
        this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.7;
        this.setTauntSet({
            highHealth: [
                "You cannot defeat the great Genghis Khan!",
                "Stand down.",
                "Kneel before me."
            ],
            bossLowPlayerHigh: [
                "Foolishness, fighter, foolishness!",
                "You have me bleeding, but not beaten."
            ],
            playerLowBossHigh: [
                "You challenge the might of the Mongol Empire!?",
                "I will show you no mercy!"
            ],
            bothLow: [
                "Down!",
                "One of us falls here."
            ],
            death: [
                "The Mongol Empire remembers this day.",
                "My war is over... for now."
            ],
            bossDeath: [
                "Genghis Khan falls, but the horde endures.",
                "You have slain a king of war."
            ]
        });
    }
}