import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Settings } from 'lucide-react';

const DEFAULT_SETTINGS = {
  GRAVITY: 0.5,
  MAX_FALL_SPEED: 15,
  MOVE_SPEED: 3,
  MOVE_ACCELERATION: 0.22,
  GROUND_FRICTION: 0.82,
  JUMP_POWER_BASE: 12,
  JUMP_POWER_MAX: 18,
  CHARGE_TIME_MAX: 30,
  DASH_SPEED: 15,
  DASH_DURATION: 200,
  DASH_COOLDOWN: 3000,
  WALL_SLIDE_GRAVITY: 0.25,
  WALL_JUMP_POWER_X: 10,
  WALL_JUMP_POWER_Y: 15,
  TRAMPOLINE_BOOST: 1.5,
  WATER_OFFSET: 600,
};

const SETTINGS_CONFIG = [
  { key: 'GRAVITY', label: 'Gravity', min: 0.2, max: 1.2, step: 0.05 },
  { key: 'MAX_FALL_SPEED', label: 'Max fall speed', min: 8, max: 25, step: 1 },
  { key: 'MOVE_SPEED', label: 'Move speed', min: 1, max: 6, step: 0.1 },
  { key: 'MOVE_ACCELERATION', label: 'Move acceleration', min: 0.1, max: 0.5, step: 0.01 },
  { key: 'GROUND_FRICTION', label: 'Ground friction', min: 0.5, max: 0.98, step: 0.02 },
  { key: 'JUMP_POWER_BASE', label: 'Jump power (min)', min: 6, max: 18, step: 0.5 },
  { key: 'JUMP_POWER_MAX', label: 'Jump power (max)', min: 12, max: 26, step: 0.5 },
  { key: 'CHARGE_TIME_MAX', label: 'Charge time (frames)', min: 15, max: 50, step: 1 },
  { key: 'DASH_SPEED', label: 'Dash speed', min: 8, max: 25, step: 0.5 },
  { key: 'DASH_DURATION', label: 'Dash duration (ms)', min: 100, max: 400, step: 50 },
  { key: 'DASH_COOLDOWN', label: 'Dash cooldown (ms)', min: 1000, max: 6000, step: 500 },
  { key: 'WALL_SLIDE_GRAVITY', label: 'Wall slide gravity', min: 0.1, max: 0.5, step: 0.05 },
  { key: 'WALL_JUMP_POWER_X', label: 'Wall jump (horizontal)', min: 5, max: 15, step: 0.5 },
  { key: 'WALL_JUMP_POWER_Y', label: 'Wall jump (vertical)', min: 10, max: 22, step: 0.5 },
  { key: 'TRAMPOLINE_BOOST', label: 'Trampoline boost', min: 1.1, max: 2.2, step: 0.1 },
  { key: 'WATER_OFFSET', label: 'Water distance (death zone)', min: 500, max: 800, step: 50 },
];

const NeonSlime = () => {
  const canvasRef = useRef(null);
  const settingsRef = useRef({ ...DEFAULT_SETTINGS });
  const gameStateRef = useRef({
    player: {
      x: 400,
      y: 500,
      vx: 0,
      vy: 0,
      width: 40,
      height: 40,
      state: 'airborne', // grounded, airborne, sliding, dashing
      chargeTime: 0,
      dashCooldown: 0,
      wallSide: null, // 'left' or 'right'
      squashX: 1,
      squashY: 1,
    },
    camera: {
      y: 0,
      shake: 0,
    },
    platforms: [],
    trampolines: [],
    sparks: [],
    particles: [],
    score: 0,
    highScore: 0,
    gameOver: false,
    keys: {},
    time: 0,
    difficulty: 1,
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initialize platforms and collectibles
  const initializeGame = () => {
    const state = gameStateRef.current;

    state.platforms = [];
    state.trampolines = [];
    state.sparks = [];
    state.particles = [];

    // Create initial platforms - tighter vertical (reachable in one jump) and horizontal (narrower band)
    const VERTICAL_GAP = 95 + Math.random() * 25; // ~95–120px between platforms
    const HORIZONTAL_BAND = 320; // platforms in a 320px-wide band (centered)
    const HORIZONTAL_CENTER = 400;
    for (let i = 0; i < 30; i++) {
      const y = 600 - i * VERTICAL_GAP - Math.random() * 20;
      const x = HORIZONTAL_CENTER - HORIZONTAL_BAND / 2 + Math.random() * HORIZONTAL_BAND;
      const width = 120 + Math.random() * 100; // wider platforms (120–220) for easier landing

      state.platforms.push({ x, y, width, height: 20 });

      // Add trampolines occasionally
      if (Math.random() > 0.7) {
        const tx = x + Math.random() * (width - 60);
        state.trampolines.push({ x: tx, y: y - 15, width: 60, height: 15 });
      }

      // Add sparks near walls
      if (Math.random() > 0.6) {
        const sx = Math.random() > 0.5 ? x - 30 : x + width + 30;
        const sy = y - 50 - Math.random() * 100;
        state.sparks.push({ x: sx, y: sy, radius: 8, collected: false });
      }
    }

    // Place player on the lowest platform that overlaps the center (so you always start on a platform)
    const playerWidth = 40;
    const playerHeight = 40;
    const centerX = 400;
    const startPlatforms = state.platforms.filter(
      (pl) => pl.x <= centerX && pl.x + pl.width >= centerX
    );
    const startPlatform = startPlatforms.length
      ? startPlatforms.reduce((lowest, pl) => (pl.y > lowest.y ? pl : lowest))
      : state.platforms.reduce((lowest, pl) => (pl.y > lowest.y ? pl : lowest));

    const startX = startPlatform.x + startPlatform.width / 2 - playerWidth / 2;
    const startY = startPlatform.y - playerHeight;

    // Reset player
    state.player = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      width: playerWidth,
      height: playerHeight,
      state: 'grounded',
      chargeTime: 0,
      dashCooldown: 0,
      wallSide: null,
      squashX: 1,
      squashY: 1,
    };

    state.camera.y = 0;
    state.camera.shake = 0;
    state.score = 0;
    state.gameOver = false;
    state.time = 0;
    state.difficulty = 1;

    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const state = gameStateRef.current;
    let lastScoreDisplayed = -1;
    let lastHighScoreDisplayed = -1;

    initializeGame();

    // Input handling (normalize space: some browsers use 'Spacebar')
    const isSpace = (key) => key === ' ' || key === 'Spacebar';
    const handleKeyDown = (e) => {
      const key = e.key === 'Spacebar' ? ' ' : e.key.toLowerCase();
      state.keys[key] = true;

      if (isSpace(e.key)) {
        e.preventDefault();
        if (e.repeat) return; // ignore key repeat so we don't double-trigger wall jump

        // Wall jump
        const sKey = settingsRef.current;
        if (state.player.state === 'sliding') {
          state.player.state = 'airborne';
          state.player.vy = -sKey.WALL_JUMP_POWER_Y;
          state.player.vx = state.player.wallSide === 'left' ? sKey.WALL_JUMP_POWER_X : -sKey.WALL_JUMP_POWER_X;
          state.player.wallSide = null;

          // Screen shake
          state.camera.shake = 10;

          // Particles
          for (let i = 0; i < 10; i++) {
            state.particles.push({
              x: state.player.x + state.player.width / 2,
              y: state.player.y + state.player.height / 2,
              vx: (Math.random() - 0.5) * 5,
              vy: Math.random() * 3,
              life: 30,
              color: '#00ff88',
            });
          }
        }
      }

      // Dash
      const s = settingsRef.current;
      if (e.key === 'Shift' && state.player.dashCooldown <= 0 && state.player.state !== 'grounded') {
        state.player.state = 'dashing';
        state.player.dashCooldown = s.DASH_COOLDOWN;
        state.player.dashStartTime = Date.now();

        const dashLeft = state.keys['a'] || state.keys['arrowleft'];
        const dashRight = state.keys['d'] || state.keys['arrowright'];

        if (dashLeft && !dashRight) {
          state.player.vx = -s.DASH_SPEED;
        } else if (dashRight && !dashLeft) {
          state.player.vx = s.DASH_SPEED;
        } else {
          state.player.vx = state.player.vx >= 0 ? s.DASH_SPEED : -s.DASH_SPEED;
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key === 'Spacebar' ? ' ' : e.key.toLowerCase();
      state.keys[key] = false;

      // Jump release (normalize space key for all browsers)
      if (isSpace(e.key) && state.player.state === 'grounded') {
        const sJump = settingsRef.current;
        const jumpPower = sJump.JUMP_POWER_BASE + (state.player.chargeTime / sJump.CHARGE_TIME_MAX) * (sJump.JUMP_POWER_MAX - sJump.JUMP_POWER_BASE);
        state.player.vy = -jumpPower;
        state.player.state = 'airborne';
        state.player.chargeTime = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game loop (use rafId so cleanup can cancel it — avoids double loop in React StrictMode dev)
    let lastTime = Date.now();
    let rafId = 0;

    const gameLoop = () => {
      if (!canvas) return;

      const currentTime = Date.now();
      const deltaMs = currentTime - lastTime;
      const deltaTime = Math.min(deltaMs / 16.67, 2);
      lastTime = currentTime;

      const state = gameStateRef.current;

      if (state.gameOver) {
        render(ctx, canvas);
        rafId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update game state (deltaTime = frame units @60fps, deltaMs = real milliseconds)
      update(deltaTime, deltaMs);

      // Render
      render(ctx, canvas);

      rafId = requestAnimationFrame(gameLoop);
    };

    const update = (deltaTime, deltaMs) => {
      const s = settingsRef.current;
      const p = state.player;
      state.time += deltaTime;

      state.difficulty = 1 + state.time / 3000;

      if (p.dashCooldown > 0) {
        p.dashCooldown -= deltaMs;
      }

      if (p.state === 'dashing' && Date.now() - p.dashStartTime > s.DASH_DURATION) {
        p.state = 'airborne';
      }

      if (p.state === 'grounded' && state.keys[' ']) {
        p.chargeTime = Math.min(p.chargeTime + deltaTime, s.CHARGE_TIME_MAX);
        p.squashY = 0.7 - (p.chargeTime / s.CHARGE_TIME_MAX) * 0.3;
        p.squashX = 1.3 + (p.chargeTime / s.CHARGE_TIME_MAX) * 0.3;
      } else {
        p.chargeTime = 0;
      }

      if (p.state !== 'dashing') {
        const moveLeft = state.keys['a'] || state.keys['arrowleft'];
        const moveRight = state.keys['d'] || state.keys['arrowright'];

        if (moveLeft && !moveRight) {
          p.vx -= s.MOVE_ACCELERATION * deltaTime;
          p.vx = Math.max(p.vx, -s.MOVE_SPEED);
        } else if (moveRight && !moveLeft) {
          p.vx += s.MOVE_ACCELERATION * deltaTime;
          p.vx = Math.min(p.vx, s.MOVE_SPEED);
        } else {
          p.vx *= Math.pow(s.GROUND_FRICTION, deltaTime);
          if (Math.abs(p.vx) < 0.08) p.vx = 0;
        }
      }

      if (p.state === 'grounded') {
        p.vy = 0;
      } else if (p.state === 'sliding') {
        p.vy += s.WALL_SLIDE_GRAVITY;
        p.vy = Math.min(p.vy, s.MAX_FALL_SPEED / 2);
      } else if (p.state === 'dashing') {
        p.vy = 0;
      } else {
        p.vy += s.GRAVITY;
        p.vy = Math.min(p.vy, s.MAX_FALL_SPEED);
      }

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Wrap around screen horizontally
      if (p.x < -p.width) p.x = 800;
      if (p.x > 800) p.x = -p.width;

      // Update squash and stretch
      if (p.state !== 'grounded' || !state.keys[' ']) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const stretchFactor = Math.min(speed / 20, 0.5);

        if (Math.abs(p.vy) > Math.abs(p.vx)) {
          // Vertical stretch
          p.squashY = 1 + stretchFactor;
          p.squashX = 1 - stretchFactor * 0.5;
        } else if (Math.abs(p.vx) > 3) {
          // Horizontal stretch
          p.squashX = 1 + stretchFactor * 0.5;
          p.squashY = 1 - stretchFactor * 0.3;
        } else {
          // Return to normal
          p.squashX += (1 - p.squashX) * 0.2;
          p.squashY += (1 - p.squashY) * 0.2;
        }
      }

      // Collision detection
      p.state = 'airborne';
      p.wallSide = null;

      // Platform collision: land on platform (vy > 0) OR already standing on it (so jump works every time)
      const STAND_TOLERANCE = 12; // pixels: treat as standing if feet within this of platform top
      for (const platform of state.platforms) {
        const horizontalOverlap = p.x + p.width > platform.x && p.x < platform.x + platform.width;
        const feetY = p.y + p.height;
        const onSurface = feetY >= platform.y && feetY <= platform.y + STAND_TOLERANCE;

        // Landing: falling onto platform
        if (horizontalOverlap && onSurface && p.vy > 0) {
          p.y = platform.y - p.height;
          p.vy = 0;
          p.state = 'grounded';
          if (p.squashY > 1.2) {
            p.squashY = 0.6;
            p.squashX = 1.4;
          }
        }
        // Already standing: keep grounded so spacebar jump works reliably
        else if (horizontalOverlap && onSurface && p.vy >= 0) {
          p.y = platform.y - p.height;
          p.vy = 0;
          p.state = 'grounded';
        }

        // Wall collision for wall jumping
        if (p.y + p.height > platform.y + 5 &&
            p.y < platform.y + platform.height - 5) {
          // Left wall
          if (p.x + p.width > platform.x &&
              p.x + p.width < platform.x + 10 &&
              p.vx > 0) {
            p.x = platform.x - p.width;
            p.state = 'sliding';
            p.wallSide = 'left';
            p.vx = 0;
          }
          // Right wall
          if (p.x < platform.x + platform.width &&
              p.x > platform.x + platform.width - 10 &&
              p.vx < 0) {
            p.x = platform.x + platform.width;
            p.state = 'sliding';
            p.wallSide = 'right';
            p.vx = 0;
          }
        }
      }

      // Trampoline collision
      for (const trampoline of state.trampolines) {
        if (p.x + p.width > trampoline.x &&
            p.x < trampoline.x + trampoline.width &&
            p.y + p.height > trampoline.y &&
            p.y + p.height < trampoline.y + trampoline.height + 10 &&
            p.vy > 0) {
          p.vy = -Math.abs(p.vy) * s.TRAMPOLINE_BOOST;
          p.state = 'airborne';

          // Screen shake
          state.camera.shake = 15;

          // Squash effect
          p.squashY = 0.5;
          p.squashX = 1.5;

          // Particles
          for (let i = 0; i < 15; i++) {
            state.particles.push({
              x: p.x + p.width / 2,
              y: p.y + p.height,
              vx: (Math.random() - 0.5) * 8,
              vy: Math.random() * 5,
              life: 40,
              color: '#00d4ff',
            });
          }
        }
      }

      // Spark collection
      for (const spark of state.sparks) {
        if (!spark.collected) {
          const dx = (p.x + p.width / 2) - spark.x;
          const dy = (p.y + p.height / 2) - spark.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < p.width / 2 + spark.radius) {
            spark.collected = true;
            state.score += 100;

            // Particle burst
            for (let i = 0; i < 20; i++) {
              const angle = (Math.PI * 2 * i) / 20;
              state.particles.push({
                x: spark.x,
                y: spark.y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                life: 30,
                color: '#ffff00',
              });
            }
          }
        }
      }

      // Dash particles
      if (p.state === 'dashing') {
        state.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height / 2,
          vx: -p.vx * 0.2,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          color: '#00ff88',
        });
      }

      // Update particles
      state.particles = state.particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2;
        particle.life--;
        return particle.life > 0;
      });

      // Update camera: follow up slowly so trampoline bounces don't leave you with nothing below
      const targetCameraY = p.y - 400;
      const diff = targetCameraY - state.camera.y;
      const followSpeed = diff > 0 ? 0.022 : 0.055; // slower when moving up (player bounced), faster when falling
      state.camera.y += diff * followSpeed;

      // Update score based on height (only trigger React update when value actually changes)
      const heightScore = Math.floor(Math.max(0, -p.y) / 100);
      state.score = Math.max(state.score, heightScore);
      if (state.score !== lastScoreDisplayed) {
        lastScoreDisplayed = state.score;
        setScore(state.score);
      }
      if (state.highScore !== lastHighScoreDisplayed) {
        lastHighScoreDisplayed = state.highScore;
        setHighScore(state.highScore);
      }

      // Screen shake decay
      if (state.camera.shake > 0) {
        state.camera.shake *= 0.9;
        if (state.camera.shake < 0.5) state.camera.shake = 0;
      }

      // Generate new platforms as player climbs - reachable gap and band; limit total count as difficulty rises
      const maxPlatforms = Math.max(14, Math.floor(32 - state.difficulty * 6)); // 32 at start → ~14 at high difficulty
      const highestPlatform = Math.min(...state.platforms.map(pl => pl.y));
      if (highestPlatform > state.camera.y - 800 && state.platforms.length < maxPlatforms) {
        const spacing = Math.max(85, 110 / state.difficulty); // ~85–110px gap, reachable in one jump
        const newY = highestPlatform - spacing - Math.random() * 20;
        const newX = 400 - 160 + Math.random() * 320; // same 320px band so next platform is reachable
        const newWidth = 120 + Math.random() * 100;

        state.platforms.push({ x: newX, y: newY, width: newWidth, height: 20 });

        // Add trampoline
        if (Math.random() > 0.7) {
          const tx = newX + Math.random() * (newWidth - 60);
          state.trampolines.push({ x: tx, y: newY - 15, width: 60, height: 15 });
        }

        // Add spark
        if (Math.random() > 0.6) {
          const sx = Math.random() > 0.5 ? newX - 30 : newX + newWidth + 30;
          const sy = newY - 50 - Math.random() * 100;
          state.sparks.push({ x: sx, y: sy, radius: 8, collected: false });
        }
      }

      // Remove platforms only when they're safely below the player (avoids trampoline death: camera no longer culls platforms you might land on)
      const cullBelowY = Math.min(state.camera.y + 900, p.y + 550);
      state.platforms = state.platforms.filter(platform => platform.y < cullBelowY);
      state.trampolines = state.trampolines.filter(t => t.y < cullBelowY);
      state.sparks = state.sparks.filter(s => s.y < cullBelowY);

      // Death zone (water at bottom of screen)
      const waterY = state.camera.y + s.WATER_OFFSET;
      if (p.y + p.height > waterY) {
        state.gameOver = true;
        setGameOver(true);
        if (state.score > state.highScore) {
          state.highScore = state.score;
          setHighScore(state.score);
        }
      }
    };

    const render = (ctx, canvas) => {
      const sRender = settingsRef.current;
      const cameraY = state.camera.y;
      const shakeX = (Math.random() - 0.5) * state.camera.shake;
      const shakeY = (Math.random() - 0.5) * state.camera.shake;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save context for camera transform
      ctx.save();
      ctx.translate(shakeX, -cameraY + shakeY);

      // Draw platforms (shadow buildings)
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;

      for (const platform of state.platforms) {
        // Building shadow
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

        // Neon accent line on top
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platform.x, platform.y);
        ctx.lineTo(platform.x + platform.width, platform.y);
        ctx.stroke();

        ctx.strokeStyle = '#1a1a2e';
      }

      // Draw trampolines (moderate shadow for performance on slower devices)
      for (const trampoline of state.trampolines) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00d4ff';

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(trampoline.x, trampoline.y, trampoline.width, trampoline.height);

        // Spring lines
        ctx.strokeStyle = '#00a8cc';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const x = trampoline.x + (trampoline.width / 5) * i + 10;
          ctx.beginPath();
          ctx.moveTo(x, trampoline.y);
          ctx.lineTo(x, trampoline.y + trampoline.height);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      }

      // Draw sparks (collectibles)
      for (const spark of state.sparks) {
        if (!spark.collected) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffff00';

          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
          ctx.fill();

          // Pulsing ring
          const pulseSize = Math.sin(Date.now() / 200) * 3 + spark.radius + 5;
          ctx.strokeStyle = '#ffff00';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, pulseSize, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

          ctx.shadowBlur = 0;
        }
      }

      // Draw particles
      for (const particle of state.particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 40;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw player (blob)
      const p = state.player;
      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.scale(p.squashX, p.squashY);

      // Glow effect (reduced blur for smoother FPS on all devices)
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#00ff88';

      // Main blob
      const gradient2 = ctx.createRadialGradient(0, 0, 0, 0, 0, p.width / 2);
      gradient2.addColorStop(0, '#00ff88');
      gradient2.addColorStop(0.7, '#00cc66');
      gradient2.addColorStop(1, '#008844');

      ctx.fillStyle = gradient2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(-p.width / 6, -p.height / 6, p.width / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();

      // Dash cooldown indicator (brightness)
      if (p.dashCooldown > 0 && p.dashCooldown < sRender.DASH_COOLDOWN) {
        const cooldownPercent = p.dashCooldown / sRender.DASH_COOLDOWN;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2 + 5,
                -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * (1 - cooldownPercent));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Water death zone
      const waterY = cameraY + sRender.WATER_OFFSET;
      const waterGradient = ctx.createLinearGradient(0, waterY, 0, waterY + 100);
      waterGradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
      waterGradient.addColorStop(1, 'rgba(0, 150, 255, 0.6)');

      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, waterY, canvas.width, 100);

      // Water surface shimmer
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 10) {
        const wave = Math.sin(x / 20 + Date.now() / 200) * 5;
        if (x === 0) {
          ctx.moveTo(x, waterY + wave);
        } else {
          ctx.lineTo(x, waterY + wave);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();

      // UI overlay
      // Score (minimal shadow for UI text)
      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 32px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#00ff88';
      ctx.fillText(`SCORE: ${state.score}`, 20, 50);

      // High score
      if (state.highScore > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText(`BEST: ${state.highScore}`, 20, 80);
      }

      ctx.shadowBlur = 0;

      // Controls hint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('A/D or ← → : Move', canvas.width - 20, 30);
      ctx.fillText('SPACE: Charge Jump / Wall Jump', canvas.width - 20, 50);
      ctx.fillText('SHIFT: Dash (3s cooldown)', canvas.width - 20, 70);

      // Game over screen
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 60px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00d4ff';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);

        if (state.score === state.highScore && state.score > 0) {
          ctx.fillStyle = '#ffff00';
          ctx.shadowColor = '#ffff00';
          ctx.font = 'bold 28px "Courier New", monospace';
          ctx.fillText('NEW HIGH SCORE!', canvas.width / 2, canvas.height / 2 + 60);
        }

        ctx.shadowBlur = 0;
      }
    };

    rafId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => setSettings({ ...DEFAULT_SETTINGS });

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)',
      display: 'flex',
      flexDirection: 'row',
      fontFamily: '"Courier New", monospace',
      color: '#00ff88',
    }}>
      {/* Game area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            textShadow: '0 0 20px #00d4ff',
            color: '#00d4ff',
            letterSpacing: '3px',
          }}>
            NEON SLIME
          </h1>
          <p style={{
            fontSize: '20px',
            margin: 0,
            color: '#00ff88',
            textShadow: '0 0 10px #00ff88',
          }}>
            Shadow Ascent
          </p>
        </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          border: '3px solid #00d4ff',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
          borderRadius: '8px',
          backgroundColor: '#0a0a1a',
        }}
      />

      {gameOver && (
        <button
          onClick={() => {
            initializeGame();
            gameStateRef.current.gameOver = false;
            setGameOver(false);
          }}
          style={{
            marginTop: '20px',
            padding: '15px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            fontFamily: '"Courier New", monospace',
            background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
            border: 'none',
            borderRadius: '8px',
            color: '#0a0a1a',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.5)';
          }}
        >
          <RotateCcw size={24} />
          RESTART
        </button>
      )}

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        border: '2px solid #00d4ff',
        maxWidth: '600px',
        fontSize: '14px',
        lineHeight: '1.8',
      }}>
        <div style={{ marginBottom: '10px', color: '#00d4ff', fontWeight: 'bold' }}>
          🎮 HOW TO PLAY:
        </div>
        <div>• Use <span style={{color: '#00ff88'}}>A/D</span> or <span style={{color: '#00ff88'}}>Arrow Keys</span> to move left and right</div>
        <div>• Hold <span style={{color: '#00ff88'}}>SPACE</span> to charge your jump, release to leap!</div>
        <div>• Press <span style={{color: '#00ff88'}}>SPACE</span> while sliding on a wall to wall-jump</div>
        <div>• Press <span style={{color: '#00ff88'}}>SHIFT</span> to dash horizontally (3-second cooldown)</div>
        <div>• Hit <span style={{color: '#00d4ff'}}>blue trampolines</span> for extra bounce</div>
        <div>• Collect <span style={{color: '#ffff00'}}>yellow sparks</span> for bonus points</div>
        <div style={{marginTop: '10px', color: '#ff4444'}}>
          ⚠️ Don&apos;t fall into the neon water below!
        </div>
      </div>
      </div>

      {/* Settings sidebar */}
      <div style={{
        width: '300px',
        minWidth: '300px',
        maxHeight: '100vh',
        overflowY: 'auto',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderLeft: '2px solid #00d4ff',
        boxShadow: '-4px 0 20px rgba(0, 212, 255, 0.2)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          color: '#00d4ff',
          fontSize: '18px',
          fontWeight: 'bold',
        }}>
          <Settings size={22} />
          Settings
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', lineHeight: 1.4 }}>
          Tweak these and see how the game feels. Changes apply live while playing.
        </p>
        {SETTINGS_CONFIG.map(({ key, label, min, max, step }) => (
          <div key={key} style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#00ff88',
              marginBottom: '4px',
            }}>
              {label}: {typeof settings[key] === 'number' && settings[key] % 1 !== 0
                ? settings[key].toFixed(2)
                : settings[key]}
            </label>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(e) => updateSetting(key, parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#00d4ff',
              }}
            />
          </div>
        ))}
        <button
          onClick={resetSettings}
          style={{
            marginTop: '12px',
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            fontFamily: '"Courier New", monospace',
            fontWeight: 'bold',
            background: 'rgba(0, 212, 255, 0.2)',
            border: '2px solid #00d4ff',
            borderRadius: '6px',
            color: '#00d4ff',
            cursor: 'pointer',
          }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

export default NeonSlime;
