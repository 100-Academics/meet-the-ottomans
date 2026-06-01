import { Boss } from "./boss";
import { Entity } from "playcanvas";
import { PLAYER_MOVE_SPEED } from "../../../player/playerMovementConfig";

export class GeorgeWashington extends Boss {
  constructor(id: number, maxHealth: number, entity: Entity = new Entity("George Washington")) {
    super(id, maxHealth, entity, "George Washington");
    this.aiConfig.chaseMoveSpeed = PLAYER_MOVE_SPEED * 1.1;
    this.aiConfig.idleMoveSpeed = PLAYER_MOVE_SPEED * 0.6;

    this.setIntroTaunt(
      "I shall defend my country!",
      "I shall defend my country!"
    );
    this.setIntroNameTranslation(
      "George Washington",
      "George Washington"
    );
    this.setTauntSet({
      highHealth: [
        "You face the father of a nation.",
        "Liberty shall not fall to the likes of you.",
        "Stand down, for I shall not yield."
      ],
      bossLowPlayerHigh: [
        "A nation born in fire does not extinguish so easily!",
        "I have endured worse winters than this.",
        "You underestimate the resolve of a revolutionary."
      ],
      playerLowBossHigh: [
        "Surrender now, and I may show mercy.",
        "Your cause is lost.",
        "The tide of battle has turned."
      ],
      bothLow: [
        "Only one of us walks away from this field.",
        "To the very last breath."
      ],
      death: [
        "I regret I have but one life to give…",
        "The fight goes on without me."
      ],
      bossDeath: [
        "Freedom… endures.",
        "My nation… will carry on."
      ]
    });
  }
}
