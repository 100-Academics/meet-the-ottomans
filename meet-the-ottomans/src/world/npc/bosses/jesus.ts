import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class Christ extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Jesus Christ")) {
        super(id, maxHealth, entity, "Jesus Christ");
        this.setTauntSet({
            highHealth: [
                "Peace is not your shield.",
                "You have come far to fall here."
            ],
            bossLowPlayerHigh: [
                "Suffering is not the same as defeat.",
                "My path is not ended yet.",
                "I'll show you divine justice!"
            ],
            playerLowBossHigh: [
                "Your burden grows heavier.",
                "You walk a harder road now."
            ],
            bothLow: [
                "We are both near the edge.",
                "Endurance is all that remains.",
                "If I fall here, my Father will finish the job."
            ],
            death: [
                "Forgive this moment.",
                "The lesson is finished."
            ],
            bossDeath: [
                "The body falls, but the path remains.",
                "A final breath, and then silence."
            ]
        });
    }
}