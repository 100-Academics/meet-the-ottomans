import { ScriptType, Vec3, math, Mouse, KEY_W, KEY_A, KEY_S, KEY_D, KEY_SPACE } from 'playcanvas';

export class FirstPersonCamera extends ScriptType {
    public eulers = new Vec3();
    public touchSensitivity = 1 / 2;
    public lookSpeed = 1 / 5;
    
    public moveSpeed = 5;
    public gravity = 9.8;
    public velocity = new Vec3();
    public playerHeight = 2;
    public groundHeight = 0;
    
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
            pos.add(moveDir);
        }

        // Space to jump
        if (pos.y <= this.groundHeight + this.playerHeight && isSpace) {
            this.velocity.y = 5; 
        }

        // Apply Gravity
        this.velocity.y -= this.gravity * dt;
        pos.y += this.velocity.y * dt;

        // Ground collision
        if (pos.y < this.groundHeight + this.playerHeight) {
            pos.y = this.groundHeight + this.playerHeight;
            this.velocity.y = 0;
        }

        this.entity.setPosition(pos);
    }
}
