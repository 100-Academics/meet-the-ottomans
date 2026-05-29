import { Boss } from "./boss";
import { Entity } from "playcanvas";

// Simple boss that relies on base AI; taunts are configured here.
export class JoanOfArc extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Joan of Arc")) {
        super(id, maxHealth, entity, "Joan of Arc");
        this.setTauntSet({
            highHealth: [
                "For France!",
                "I will not yield."
            ],
            bossLowPlayerHigh: [
                "My faith is unbroken.",
                "The tide can still turn."
            ],
            playerLowBossHigh: [
                "Stand down and live.",
                "Your resolve is fading."
            ],
            bothLow: [
                "Only the righteous remain.",
                "One of us falls here."
            ],
            death: [
                "I return to the light."
            ],
            bossDeath: [
                "Joan falls, but her fire endures."
            ]
        });
    }
}
