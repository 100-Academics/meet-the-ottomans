import { ScriptType, Vec3, math, Mouse, KEY_W, KEY_A, KEY_S, KEY_D, KEY_SPACE, type Entity } from 'playcanvas';

export class FirstPersonCamera extends ScriptType {
    public eulers = new Vec3();
    public touchSensitivity = 1 / 2;
    public lookSpeed = 1 / 5;
    
    public moveSpeed = 5;
    public gravity = 9.8;
    public velocity = new Vec3();
    public playerHeight = 2;
    public groundHeight = 0;
    public groundTag = 'ground';
    public groundedEpsilon = 0.05;
    public groundRayHeight = 200;
    public groundRayDepth = 400;
    public collisionProbePadding = 0.3;
    public collisionTag = 'model-obstacle';
    
    private keys: Record<string, boolean> = {};

    initialize() {
        this.eulers.x = this.entity.getLocalEulerAngles().x;
        this.eulers.y = this.entity.getLocalEulerAngles().y;

        const app = this.app;
        
        // Mouse lock
        if (app.mouse) {
            app.mouse.on('mousedown', () => {
                app.mouse?.enablePointerLock();
                window.focus(); // Ensure window gets keyboard focus when clicking
            }, this);
            
            app.mouse.on('mousemove', this.onMouseMove, this);
        }

        // Foolproof Keyboard Tracking for iframe / dev environments
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    onMouseMove(e: any) {
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

    private getGroundHeightAt(position: Vec3): number {
        const rigidbodySystem = (this.app.systems as any).rigidbody;
        if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== 'function') {
            return this.groundHeight;
        }

        const start = new Vec3(position.x, position.y + this.groundRayHeight, position.z);
        const end = new Vec3(position.x, position.y - this.groundRayDepth, position.z);

        const hits = typeof rigidbodySystem.raycastAll === 'function'
            ? (rigidbodySystem.raycastAll(start, end) as Array<{ entity?: Entity | null; point?: Vec3; hitFraction?: number }> | undefined)
            : undefined;

        if (hits && hits.length > 0) {
            const sortedHits = hits
                .filter((hit) => hit?.point)
                .sort((a, b) => (a.hitFraction ?? 1) - (b.hitFraction ?? 1));

            for (const hit of sortedHits) {
                const hitEntity = hit.entity ?? null;
                if (!this.groundTag || this.hasTagInHierarchy(hitEntity, this.groundTag)) {
                    return hit.point!.y;
                }
            }
        }

        const firstHit = rigidbodySystem.raycastFirst(start, end) as { point?: Vec3 } | null;
        if (firstHit?.point) {
            return firstHit.point.y;
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

        if (isW) moveDir.add(walkForward);
        if (isS) moveDir.sub(walkForward);
        if (isA) moveDir.sub(walkRight);
        if (isD) moveDir.add(walkRight);
        
        const pos = this.entity.getPosition().clone();
        
        if (moveDir.lengthSq() > 0) {
            moveDir.normalize().mulScalar(this.moveSpeed * dt);
            const proposedPos = pos.clone().add(moveDir);
            if (!this.isBlocked(proposedPos)) {
                pos.copy(proposedPos);
            }
        }

        const currentGroundHeight = this.getGroundHeightAt(pos);
        const onGround = pos.y <= currentGroundHeight + this.playerHeight + this.groundedEpsilon;

        // Space to jump
        if (onGround && isSpace) {
            this.velocity.y = 5; 
        }

        // Apply Gravity
        this.velocity.y -= this.gravity * dt;
        pos.y += this.velocity.y * dt;

        // Ground collision
        if (pos.y < currentGroundHeight + this.playerHeight) {
            pos.y = currentGroundHeight + this.playerHeight;
            this.velocity.y = 0;
        }

        this.entity.setPosition(pos);
    }
}
