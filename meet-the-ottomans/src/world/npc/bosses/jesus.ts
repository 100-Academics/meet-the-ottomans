import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class Christ extends Boss {
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
    }
}