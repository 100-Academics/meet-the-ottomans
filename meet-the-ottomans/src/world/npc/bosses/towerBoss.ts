import { Boss } from "./boss";
import { Entity } from "playcanvas";

/**
 * Tower boss — an ancient monolith that speaks in an unknown tongue.
 * Its origin is lost to the ages; its purpose, even more so.
 */
export class TowerBoss extends Boss {

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("TowerBoss")) {
        super(id, maxHealth, entity, "??????????");

        // The tower's language is unrecognised — rendered as question marks.
        this.setIntroTaunt("??????????", "......");
        this.setIntroNameTranslation("??????????", "The Tower");

        this.setTauntSet({
            highHealth: [
                "??????????",
                "??????????",
                "??????????"
            ],
            bossLowPlayerHigh: [
                "??????????",
                "??????????"
            ],
            playerLowBossHigh: [
                "??????????",
                "??????????"
            ],
            bothLow: [
                "??????????"
            ],
            death: [
                "??????????"
            ],
            bossDeath: [
                "??????????"
            ]
        });

        // The tower is immovable — it only watches.
        this.aiConfig.chaseMoveSpeed = 0;
        this.aiConfig.idleMoveSpeed = 0;
    }

    protected override getCombatProfile() {
        const base = super.getCombatProfile();
        return { ...base, detectionRange: Number.MAX_VALUE };
    }
}
