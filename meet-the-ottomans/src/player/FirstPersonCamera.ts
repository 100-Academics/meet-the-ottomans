import { ScriptType, Vec3, math, Mouse, KEY_W, KEY_A, KEY_S, KEY_D, KEY_SPACE, KEY_SHIFT, type Entity } from 'playcanvas';
import {
    PLAYER_DASH_DURATION,
    PLAYER_DASH_RECHARGE_TIME,
    PLAYER_DASH_SPEED,
    PLAYER_GRAVITY,
    PLAYER_JUMP_POWER,
    PLAYER_MAX_AIR_JUMPS,
    PLAYER_MAX_DASHES,
    PLAYER_MOVE_SPEED,
} from './playerMovementConfig';

export class FirstPersonCamera extends ScriptType {
    public eulers = new Vec3();
    public touchSensitivity = 1 / 2;
    public lookSpeed = 1 / 5;
    
    public readonly moveSpeed = PLAYER_MOVE_SPEED;
    public readonly gravity = PLAYER_GRAVITY;
    public readonly jumpPower = PLAYER_JUMP_POWER;
    public readonly maxAirJumps = PLAYER_MAX_AIR_JUMPS;
    public readonly maxDashes = PLAYER_MAX_DASHES;
    public readonly dashSpeed = PLAYER_DASH_SPEED;
    public readonly dashDuration = PLAYER_DASH_DURATION;
    public readonly dashRechargeTime = PLAYER_DASH_RECHARGE_TIME;
    public velocity = new Vec3();
    public playerHeight = 2;
    public groundHeight = 0;
    public groundTag = 'ground';
    public groundedEpsilon = 0.05;
    public groundRayHeight = 400;
    public groundRayDepth = 800;
    public groundSampleRadius = 0.25;
    public collisionProbePadding = 0.3;
    public collisionTag = 'model-obstacle';
    
    private keys: Record<string, boolean> = {};
    private airJumpsRemaining = PLAYER_MAX_AIR_JUMPS;
    private dashCharges = PLAYER_MAX_DASHES;
    private dashRechargeTimer = 0;
    private dashTimeRemaining = 0;
    private dashDirection = new Vec3();
    private wasJumpHeld = false;
    private wasDashHeld = false;

    private isFiniteNumber(value: unknown): value is number {
        return typeof value === 'number' && Number.isFinite(value);
    }

    private tryMoveHorizontally(position: Vec3, direction: Vec3, speed: number, dt: number): void {
        const movement = direction.clone().mulScalar(speed * dt);
        const proposedPos = position.clone().add(movement);
        if (!this.isBlocked(proposedPos)) {
            position.copy(proposedPos);
        }
    }

    initialize() {
        this.eulers.x = this.entity.getLocalEulerAngles().x;
        this.eulers.y = this.entity.getLocalEulerAngles().y;
        this.groundHeight = this.entity.getPosition().y - this.playerHeight;
        this.airJumpsRemaining = this.maxAirJumps;
        this.dashCharges = this.maxDashes;
        this.dashRechargeTimer = 0;
        this.dashTimeRemaining = 0;

        const app = this.app;
        
        // Mouse lock
        if (app.mouse) {
            // Remove old listeners first to prevent duplicates
            app.mouse.off('mousedown');
            app.mouse.off('mousemove');
            
            app.mouse.on('mousedown', () => {
                app.mouse?.enablePointerLock();
                window.focus(); // Ensure window gets keyboard focus when clicking
            });
            
            app.mouse.on('mousemove', this.onMouseMove);
        }

        // Foolproof Keyboard Tracking for iframe / dev environments
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    private onMouseMove = (e: any) => {
        if (!Mouse.isPointerLocked()) {
            return;
            }
        this.eulers.x -= e.dy * this.lookSpeed;
        this.eulers.y -= e.dx * this.lookSpeed;
        this.eulers.x = math.clamp(this.eulers.x, -90, 90);
    }

    private getEntityWorldAabb(entity: Entity): {
        minX: number;
        minY: number;
        minZ: number;
        maxX: number;
        maxY: number;
        maxZ: number;
    } | null {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        let found = false;

        const visit = (node: Entity) => {
            const meshInstances = node.render?.meshInstances;
            if (meshInstances && meshInstances.length > 0) {
                for (const meshInstance of meshInstances) {
                    const aabb = meshInstance.aabb;
                    if (!aabb) {
                        continue;
                    }
                    const min = aabb.getMin();
                    const max = aabb.getMax();
                    minX = Math.min(minX, min.x);
                    minY = Math.min(minY, min.y);
                    minZ = Math.min(minZ, min.z);
                    maxX = Math.max(maxX, max.x);
                    maxY = Math.max(maxY, max.y);
                    maxZ = Math.max(maxZ, max.z);
                    found = true;
                }
            }

            for (const child of node.children) {
                visit(child as Entity);
            }
        };

        visit(entity);

        if (!found) {
            return null;
        }

        return { minX, minY, minZ, maxX, maxY, maxZ };
    }

    private isBlocked(nextPos: Vec3): boolean {
        const obstacles = this.app.root.findByTag(this.collisionTag) as Entity[];
        if (!obstacles || obstacles.length === 0) {
            return false;
        }

        const playerRadius = this.collisionProbePadding;
        const playerMinY = nextPos.y - this.playerHeight;
        const playerMaxY = nextPos.y + 0.2;

        for (const obstacle of obstacles) {
            if (obstacle === this.entity) {
                continue;
            }

            const aabb = this.getEntityWorldAabb(obstacle);
            if (!aabb) {
                continue;
            }

            const xOverlap = nextPos.x + playerRadius > aabb.minX && nextPos.x - playerRadius < aabb.maxX;
            const zOverlap = nextPos.z + playerRadius > aabb.minZ && nextPos.z - playerRadius < aabb.maxZ;
            const yOverlap = playerMaxY > aabb.minY && playerMinY < aabb.maxY;

            if (xOverlap && zOverlap && yOverlap) {
                return true;
            }
        }

        return false;
    }

    private hasTagInHierarchy(entity: Entity | null, tag: string): boolean {
        let current: Entity | null = entity;
        while (current) {
            if (current.tags?.has(tag)) {
                return true;
            }
            current = (current.parent as Entity | null) ?? null;
        }
        return false;
    }

    private isGroundRaycastHit(entity: Entity | null): boolean {
        if (!this.groundTag) {
            return true;
        }

        if (!entity) {
            return false;
        }

        return this.hasTagInHierarchy(entity, this.groundTag);
    }

    private getGroundRayHitY(
        rigidbodySystem: {
            raycastAll?: (start: Vec3, end: Vec3) => Array<{ entity?: Entity | null; point?: Vec3; hitFraction?: number }> | undefined;
            raycastFirst: (start: Vec3, end: Vec3) => { entity?: Entity | null; point?: Vec3 } | null;
        },
        start: Vec3,
        end: Vec3
    ): number | undefined {
        const hits = typeof rigidbodySystem.raycastAll === 'function'
            ? rigidbodySystem.raycastAll(start, end)
            : undefined;

        if (hits && hits.length > 0) {
            let bestFraction = Number.POSITIVE_INFINITY;
            let bestFractionHitY: number | undefined;
            let highestGroundHitY: number | undefined;
            for (const hit of hits) {
                if (!hit?.point) {
                    continue;
                }
                const hitY = hit.point.y;
                if (!this.isFiniteNumber(hitY)) {
                    continue;
                }

                const hitEntity = hit.entity ?? null;
                if (!this.isGroundRaycastHit(hitEntity)) {
                    continue;
                }

                const hitFraction = hit.hitFraction;
                if (this.isFiniteNumber(hitFraction) && hitFraction < bestFraction) {
                    bestFraction = hitFraction;
                    bestFractionHitY = hitY;
                }

                if (highestGroundHitY === undefined || hitY > highestGroundHitY) {
                    highestGroundHitY = hitY;
                }
            }

            if (bestFractionHitY !== undefined) {
                return bestFractionHitY;
            }

            if (highestGroundHitY !== undefined) {
                return highestGroundHitY;
            }
        }

        const firstHit = rigidbodySystem.raycastFirst(start, end);
        if (!firstHit?.point) {
            return undefined;
        }

        const firstHitEntity = firstHit.entity ?? null;
        if (!this.isGroundRaycastHit(firstHitEntity)) {
            return undefined;
        }

        const firstHitY = firstHit.point.y;
        if (!this.isFiniteNumber(firstHitY)) {
            return undefined;
        }

        return firstHitY;
    }

    private getGroundHeightAt(position: Vec3): number {
        const rigidbodySystem = (this.app.systems as any).rigidbody;
        if (!this.isFiniteNumber(this.groundHeight)) {
            this.groundHeight = position.y - this.playerHeight;
        }

        const sampleRadius = this.groundSampleRadius;
        const sampleOffsets = [
            new Vec3(0, 0, 0),
            new Vec3(sampleRadius, 0, 0),
            new Vec3(-sampleRadius, 0, 0),
            new Vec3(0, 0, sampleRadius),
            new Vec3(0, 0, -sampleRadius),
        ];

        let highestGroundHeight: number | undefined;
        if (rigidbodySystem && typeof rigidbodySystem.raycastFirst === 'function') {
            const rayStartY = Math.max(position.y + this.groundRayHeight, this.groundHeight + this.groundRayHeight, 500);
            const rayEndY = Math.min(position.y - this.groundRayDepth, this.groundHeight - this.groundRayDepth, -500);
            if (this.isFiniteNumber(rayStartY) && this.isFiniteNumber(rayEndY)) {
                const centerStart = new Vec3(position.x, rayStartY, position.z);
                const centerEnd = new Vec3(position.x, rayEndY, position.z);
                const centerHitY = this.getGroundRayHitY(rigidbodySystem, centerStart, centerEnd);
                if (this.isFiniteNumber(centerHitY)) {
                    highestGroundHeight = centerHitY;
                } else {
                    let bestFallbackY: number | undefined;
                    let bestFallbackDelta = Number.POSITIVE_INFINITY;
                    for (const offset of sampleOffsets) {
                        if (offset.x === 0 && offset.z === 0) {
                            continue;
                        }

                        const sampleX = position.x + offset.x;
                        const sampleZ = position.z + offset.z;
                        const start = new Vec3(sampleX, rayStartY, sampleZ);
                        const end = new Vec3(sampleX, rayEndY, sampleZ);
                        const hitY = this.getGroundRayHitY(rigidbodySystem, start, end);
                        if (!this.isFiniteNumber(hitY)) {
                            continue;
                        }

                        const delta = Math.abs(hitY - this.groundHeight);
                        if (delta < bestFallbackDelta) {
                            bestFallbackDelta = delta;
                            bestFallbackY = hitY;
                        }
                    }

                    highestGroundHeight = bestFallbackY;
                }
            }
        }

        if (this.isFiniteNumber(highestGroundHeight)) {
            this.groundHeight = highestGroundHeight;
        }

        return this.groundHeight;
    }

    update(dt: number) {
        this.entity.setLocalEulerAngles(this.eulers.x, this.eulers.y, 0);

        const app = this.app;
        const forward = this.entity.forward;
        const right = this.entity.right;
        
        // Remove y component to walk on plane
        const walkForward = new Vec3(forward.x, 0, forward.z).normalize();
        const walkRight = new Vec3(right.x, 0, right.z).normalize();

        const moveDir = new Vec3();

        // Native DOM keys + PlayCanvas fallback
        const isW = this.keys['KeyW'] || app.keyboard?.isPressed(KEY_W);
        const isS = this.keys['KeyS'] || app.keyboard?.isPressed(KEY_S);
        const isA = this.keys['KeyA'] || app.keyboard?.isPressed(KEY_A);
        const isD = this.keys['KeyD'] || app.keyboard?.isPressed(KEY_D);
        const isSpace = this.keys['Space'] || app.keyboard?.isPressed(KEY_SPACE);
        const isShift = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || app.keyboard?.isPressed(KEY_SHIFT);
        const jumpPressed = !!isSpace && !this.wasJumpHeld;
        const dashPressed = !!isShift && !this.wasDashHeld;

        if (isW) moveDir.add(walkForward);
        if (isS) moveDir.sub(walkForward);
        if (isA) moveDir.sub(walkRight);
        if (isD) moveDir.add(walkRight);
        const hasMoveInput = moveDir.lengthSq() > 0;
        if (hasMoveInput) {
            moveDir.normalize();
        }
        
        const pos = this.entity.getPosition().clone();

        const currentGroundHeight = this.getGroundHeightAt(pos);
        if (!this.isFiniteNumber(currentGroundHeight)) {
            this.groundHeight = pos.y - this.playerHeight;
        }
        const safeGroundHeight = this.isFiniteNumber(this.groundHeight) ? this.groundHeight : (pos.y - this.playerHeight);
        const onGround = pos.y <= safeGroundHeight + this.playerHeight + this.groundedEpsilon;

        if (onGround) {
            this.airJumpsRemaining = this.maxAirJumps;
        }

        if (jumpPressed) {
            if (onGround) {
                this.velocity.y = this.jumpPower;
            } else if (this.airJumpsRemaining > 0) {
                this.velocity.y = this.jumpPower;
                this.airJumpsRemaining -= 1;
            }
        }

        if (dashPressed && this.dashCharges > 0) {
            if (hasMoveInput) {
                this.dashDirection.copy(moveDir);
            } else {
                this.dashDirection.set(forward.x, 0, forward.z);
                if (this.dashDirection.lengthSq() > 0) {
                    this.dashDirection.normalize();
                }
            }

            if (this.dashDirection.lengthSq() > 0) {
                this.dashCharges -= 1;
                this.dashTimeRemaining = this.dashDuration;
                this.dashRechargeTimer = 0;
            }
        }

        if (this.dashCharges < this.maxDashes) {
            this.dashRechargeTimer += dt;
            while (this.dashCharges < this.maxDashes && this.dashRechargeTimer >= this.dashRechargeTime) {
                this.dashCharges += 1;
                this.dashRechargeTimer -= this.dashRechargeTime;
            }
            if (this.dashCharges === this.maxDashes) {
                this.dashRechargeTimer = 0;
            }
        }

        if (this.dashTimeRemaining > 0 && this.dashDirection.lengthSq() > 0) {
            this.tryMoveHorizontally(pos, this.dashDirection, this.dashSpeed, dt);
            this.dashTimeRemaining = Math.max(0, this.dashTimeRemaining - dt);
        } else if (hasMoveInput) {
            this.tryMoveHorizontally(pos, moveDir, this.moveSpeed, dt);
        }

        // Apply Gravity
        this.velocity.y -= this.gravity * dt;
        pos.y += this.velocity.y * dt;

        // Ground collision
        if (pos.y < safeGroundHeight + this.playerHeight) {
            pos.y = safeGroundHeight + this.playerHeight;
            this.velocity.y = 0;
        }

        this.wasJumpHeld = !!isSpace;
        this.wasDashHeld = !!isShift;
        this.entity.setPosition(pos);
    }
}
