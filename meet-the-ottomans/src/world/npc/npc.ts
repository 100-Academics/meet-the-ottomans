import { Entity, Vec3 } from "playcanvas";

type NpcTeam = "friend" | "foe";
type NpcState = "idle" | "chase" | "attack" | "dead";

interface NpcAiConfig {
    idleMoveSpeed: number;
    chaseMoveSpeed: number;
    detectionRange: number;
    attackRange: number;
    attackCooldown: number;
    wanderRadius: number;
    wanderInterval: number;
}

export class npc {
    private id: number;
    private team: NpcTeam;
    private maxHealth: number;
    private health: number;
    private entity: Entity;

    private aiState: NpcState = "idle";
    private lastAttackTime = -Infinity;
    private wanderDirection = new Vec3(1, 0, 0);
    private wanderTimeRemaining = 0;

    private readonly aiConfig: NpcAiConfig = {
        idleMoveSpeed: 0.8,
        chaseMoveSpeed: 2.5,
        detectionRange: 14,
        attackRange: 2,
        attackCooldown: 1,
        wanderRadius: 8,
        wanderInterval: 2.5
    };

    constructor(id: number, team: NpcTeam, maxHealth: number, entity: Entity = new Entity("npc")) {
        this.validateTeam(team);
        this.entity = entity;
        this.id = id;
        this.team = team;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
    }

    public getId(): number {
        return this.id;
    }

    public getTeam(): NpcTeam {
        return this.team;
    }

    public getHealth(): number {
        return this.health;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public getEntity(): Entity {
        return this.entity;
    }

    public isAlive(): boolean {
        return this.aiState !== "dead" && this.health > 0;
    }

    public getAiState(): NpcState {
        return this.aiState;
    }

    public takeDamage(damage: number): boolean {
        this.health = Math.max(0, this.health - damage);
        console.log(`NPC ${this.id} took ${damage} damage, health now ${this.health}`);
        if (this.kill()) {
            return true;
        }
        return false;
    }

    public kill(): boolean {
        if (this.health <= 0 && this.aiState !== "dead") {
            this.aiState = "dead";
            this.entity.destroy();
            return true;
        }
        return false;
    }

    public updateAI(deltaTime: number, targetEntity: Entity | null, currentTimeSeconds: number, onAttack?: (attacker: npc) => void): void {
        if (!this.isAlive()) {
            return;
        }

        // Clamp frame time so occasional frame spikes do not cause giant movement jumps.
        const clampedDeltaTime = Math.max(0, Math.min(deltaTime, 0.05));

        // No target in range yet: keep moving with lightweight wandering behavior.
        if (!targetEntity) {
            this.updateWander(clampedDeltaTime);
            this.aiState = "idle";
            return;
        }

        const myPos = this.entity.getPosition();
        const targetPos = targetEntity.getPosition();
        const dx = targetPos.x - myPos.x;
        const dz = targetPos.z - myPos.z;
        const distance = Math.sqrt((dx * dx) + (dz * dz));

        // AI state machine: idle (too far), chase (close enough to detect), attack (within attack range).
        if (distance > this.aiConfig.detectionRange) {
            this.aiState = "idle";
            this.updateWander(clampedDeltaTime);
            return;
        }

        if (distance > this.aiConfig.attackRange) {
            this.aiState = "chase";
            this.moveToward(dx, dz, this.aiConfig.chaseMoveSpeed, clampedDeltaTime);
            return;
        }

        this.aiState = "attack";
        if ((currentTimeSeconds - this.lastAttackTime) >= this.aiConfig.attackCooldown) {
            this.lastAttackTime = currentTimeSeconds;
            if (onAttack) {
                onAttack(this);
            }
        }
    }

    private validateTeam(team: string): void {
        if (team !== "friend" && team !== "foe") {
            throw new Error("Team must be either 'friend' or 'foe'");
        }
    }

    private updateWander(deltaTime: number): void {
        this.wanderTimeRemaining -= deltaTime;

        // Pick a new random horizontal direction every few seconds.
        if (this.wanderTimeRemaining <= 0) {
            const angle = Math.random() * Math.PI * 2;
            this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle));
            this.wanderTimeRemaining = this.aiConfig.wanderInterval;
        }

        const myPos = this.entity.getPosition();
        const distanceFromOrigin = Math.sqrt((myPos.x * myPos.x) + (myPos.z * myPos.z));

        // Keep wandering around spawn area instead of drifting forever.
        if (distanceFromOrigin > this.aiConfig.wanderRadius) {
            this.wanderDirection.set(-myPos.x, 0, -myPos.z).normalize();
        }

        this.moveToward(this.wanderDirection.x, this.wanderDirection.z, this.aiConfig.idleMoveSpeed, deltaTime);
    }

    private moveToward(dirX: number, dirZ: number, speed: number, deltaTime: number): void {
        const magnitude = Math.sqrt((dirX * dirX) + (dirZ * dirZ));
        if (magnitude <= 0.0001) {
            return;
        }

        // Normalize direction so movement speed stays constant regardless of vector length.
        const nx = dirX / magnitude;
        const nz = dirZ / magnitude;
        const currentPos = this.entity.getPosition();
        const nextPos = new Vec3(
            currentPos.x + (nx * speed * deltaTime),
            currentPos.y,
            currentPos.z + (nz * speed * deltaTime)
        );
        this.entity.setPosition(nextPos);
    }
}