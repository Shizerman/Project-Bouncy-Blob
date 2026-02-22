**Game Design Document: *Neon Slime: Shadow Ascent***
UPDATED: February 2026

1. Vision & Aesthetic

-   The World: A minimalist "Shadow City." High-contrast black
    silhouettes against a dark, moody background with neon accents.

-   **The Vibe:** Upbeat, retro synthwave. Fast-paced and rhythmic.

-   **The Hero:** A young, vibrant green blob. It should feel "heavy"
    yet elastic, with a semi-translucent glow.

2. Core Gameplay Mechanics

Movement

-   Standard Jump: Hold 'Space' to squish (charge), release to leap.

-   **Trampolines:** Neon-blue surfaces. Hitting one converts downward
    velocity into a $1.5 \times$ upward boost.

-   **Horizontal Dash:** Press 'Shift' for a quick left/right burst.

    -   *Cooldown:* 3 seconds (visualized by the blob's brightness).

-   **Wall Jump (Parkour):** When the blob touches a vertical "Shadow
    Building" surface, it enters a "slide" state. Pressing 'Space'
    while sliding kicks the blob upward and away from the wall.

**Controls (Finalized):**

-   Movement: Both A/D keys AND Arrow Keys (Left/Right)
-   Jump: Space bar (hold to charge, release to jump)
-   Wall Jump: Space bar while sliding on wall
-   Dash: Shift key only (3-second cooldown)

**Camera Behavior:**

-   Smooth following camera that tracks the player
-   More forgiving than auto-scroll - player controls pace
-   Death zone (water) maintains fixed offset below camera

**Difficulty Progression:**

-   Gradual increase over time
-   Platform spacing adjusts based on time played
-   Subtle speed adjustments to maintain challenge

Scoring & Progression

-   The Climb: 1 point per meter of height reached.

-   **Neon Sparks (Orbs):** Collectibles that give 100 points. They
    often spawn near walls to encourage wall-jumping.

-   **The Hazard:** Shimmering neon-blue water at the bottom. If the
    player falls into the water, the game ends.

3. Visual & Audio "Juice"

Visual Effects:

-   Screen Shake: Triggered on trampoline hits and successful wall-kicks.

-   **Squash & Stretch:** The blob should deform based on its velocity 
    (stretching thin when moving fast, squashing flat when hitting a surface).

-   **Trail Effect:** A faint green particle trail follows the blob during a Dash.

-   **Particle Effects:** Burst effects on spark collection, trampoline bounces,
    and wall jumps.

-   **Glow Effects:** Radial gradients and shadow blur for neon aesthetic.

Audio:

-   **Sound:** A driving synthwave loop that speeds up slightly as the player
    gets higher. (To be implemented)

4. Technical Specifications

Implementation: **React Component** with Canvas rendering

Physics Logic - State-Based Character Controller:

| **State**      | **Physics Logic**                                           |
|----------------|-------------------------------------------------------------|
| **Grounded**   | Standard friction and jump charging.                        |
| **Airborne**   | Gravity applied; Dash and Wall-check enabled.               |
| **Sliding**    | Gravity reduced by 50% while touching a wall;               |
|                | Wall-jump enabled.                                          |
| **Dashing**    | Gravity set to 0; horizontal velocity capped at 3x max      |
|                | speed for 200ms.                                            |

Game Constants:

- Gravity: 0.5
- Max Fall Speed: 15
- Move Speed: 5
- Jump Power: 12-18 (based on charge time)
- Dash Speed: 15
- Dash Duration: 200ms
- Dash Cooldown: 3000ms
- Wall Slide Gravity: 0.25
- Wall Jump Power: X=10, Y=15
- Trampoline Boost: 1.5x velocity

5. Implementation Format

**Technology Stack:**
- React (with hooks: useEffect, useRef, useState)
- Canvas API for rendering
- RequestAnimationFrame for game loop
- No external game frameworks required

**File Structure:**
- Single React component (.jsx file)
- Playable immediately in browser as artifact
- Self-contained with no external dependencies (except React and lucide-react for icons)

**Development Notes:**
- Game uses React refs to maintain game state between renders
- Physics simulation runs at 60 FPS target
- Responsive keyboard input handling
- Particle system for visual effects
- Procedural platform generation
- Collision detection using AABB (Axis-Aligned Bounding Box)

6. Game Features Implemented

✓ Charge jump mechanic with visual feedback
✓ Wall-jumping with slide state
✓ Horizontal dash with cooldown indicator
✓ Trampoline bounce pads with particle effects
✓ Collectible spark orbs with scoring
✓ Squash and stretch deformation
✓ Screen shake on impacts
✓ Particle trails and effects
✓ Smooth camera following
✓ Death zone water with shimmer effect
✓ High score tracking
✓ Game over and restart functionality
✓ Gradual difficulty scaling
✓ Procedural level generation
✓ Neon aesthetic with glow effects

---

**Version History:**
- v1.0 (Feb 2026): Initial implementation
  - Finalized controls (A/D + Arrows, Shift for dash)
  - Implemented smooth following camera
  - Added gradual difficulty progression
  - Built as React artifact for immediate playability
