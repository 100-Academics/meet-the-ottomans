import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class KingGeser extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("King Geser")) {
        super(id, maxHealth, entity, "King Geser");
        this.setTauntSet({
            highHealth: [
                "The sky still favors me.",
                "You stand before a king, not a man."
            ],
            bossLowPlayerHigh: [
                "This wound will not decide me.",
                "You press hard. Good."
            ],
            playerLowBossHigh: [
                "Your strength fades before mine.",
                "The throne remains mine."
            ],
            bothLow: [
                "Now the battle becomes honest.",
                "Only resolve remains."
            ],
            death: [
                "You were a fool for trying",
                "Be gone."
            ],
            bossDeath: [
                "A king has fallen.",
                "The throne is empty for now.",
                "The throne will remember your hand.",
                "So be it. I yield this round."
            ]
        });
        this.setIntroTaunt("Bi Geser khaan.", "I am King Geser.");
        this.setIntroNameTranslation("Gesar Khaan", "King Geser");
    }
}