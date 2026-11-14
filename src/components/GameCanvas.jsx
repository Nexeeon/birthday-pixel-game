import React, { useRef, useEffect, useState } from 'react';

// Static asset imports
import mapImgSrc from '../../asset/map_pesta.jpg';
import utamaWalkSrc from '../asset/sprites/utama_walk.png';
import hadiah1WalkSrc from '../asset/sprites/hadiahpuzzel1_walk.png';
import hadiah2WalkSrc from '../asset/sprites/hadiahpuzzel2_walk.png';
import hadiah3WalkSrc from '../asset/sprites/hadiahpuzzel3_walk.png';

import npc1SpriteSrc from '../asset/sprites/npc1.png';
import npc2SpriteSrc from '../asset/sprites/npc2.png';
import npc3SpriteSrc from '../asset/sprites/npc3.png';

// Hitbox definitions in normalized map coordinates (0.0 to 1.0)
const HITBOXES = [
  // Outer fence
  { x1: 0.0, y1: 0.0, x2: 1.0, y2: 0.06 },   // top fence
  { x1: 0.0, y1: 0.96, x2: 0.44, y2: 1.0 },  // bottom-left fence
  { x1: 0.56, y1: 0.96, x2: 1.0, y2: 1.0 },  // bottom-right fence
  { x1: 0.0, y1: 0.0, x2: 0.03, y2: 1.0 },   // left wall
  { x1: 0.97, y1: 0.0, x2: 1.0, y2: 1.0 },   // right wall

  // Party structures & furniture
  { x1: 0.35, y1: 0.06, x2: 0.65, y2: 0.19 }, // stage & cake table
  { x1: 0.67, y1: 0.06, x2: 0.97, y2: 0.25 }, // DJ setup
  { x1: 0.03, y1: 0.06, x2: 0.33, y2: 0.35 }, // blue tent & pinata
  { x1: 0.03, y1: 0.60, x2: 0.38, y2: 0.78 }, // gift table
  { x1: 0.55, y1: 0.38, x2: 0.80, y2: 0.60 }, // photobooth
  { x1: 0.62, y1: 0.55, x2: 0.97, y2: 0.74 }, // dining tables
  { x1: 0.03, y1: 0.40, x2: 0.25, y2: 0.58 }, // food buffet
];

const FRAME_SIZE = 96;
const ANCHOR_X = 48;
const ANCHOR_Y = 90;
const ZOOM = 1.45;
const WALK_FPS = 9; // 8-10 FPS as specified

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if ('decode' in img) {
        img.decode().then(() => resolve(img)).catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

export default function GameCanvas({
  activeSkinId = 0,
  completedMissions = [false, false, false],
  onInteractNPC,
  isPaused = false,
}) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [nearbyNpcIndex, setNearbyNpcIndex] = useState(null);

  // Active key state
  const keysRef = useRef({});
  const dpadRef = useRef({ up: false, down: false, left: false, right: false });

  // Game internal state ref
  const gameStateRef = useRef({
    mapImg: null,
    mapW: 1536,
    mapH: 2752,
    skinSprites: [], // [utama, skin1, skin2, skin3]
    npcSprites: [],  // [npc1, npc2, npc3]
    player: {
      x: 768,
      y: 2530,
      speed: 180,
      facing: 1, // 1 = right, -1 = left
      isWalking: false,
      walkAnimTimer: 0,
    },
    camera: { x: 0, y: 0 },
    npcs: [
      {
        name: 'Riri (Meja Kado)',
        xPct: 0.24,
        yPct: 0.79,
        x: 0,
        y: 0,
        facing: 1,
        phase: 0,
      },
      {
        // Moved to open area, clear from triangle flag strings (tali bendera)
        name: 'Dodi (Area Santai Terbuka)',
        xPct: 0.68,
        yPct: 0.77,
        x: 0,
        y: 0,
        facing: -1,
        phase: 800,
      },
      {
        name: 'Lala (Tenda Panggung)',
        xPct: 0.28,
        yPct: 0.24,
        x: 0,
        y: 0,
        facing: 1,
        phase: 1600,
      },
    ],
    dustParticles: [],
    confettiParticles: [],
  });

  // Preload all sprites and map
  useEffect(() => {
    let isCancelled = false;

    async function initGameAssets() {
      try {
        setLoading(true);
        setLoadProgress(15);

        // 1. Load Map
        const mapImg = await loadImage(mapImgSrc);
        if (isCancelled) return;
        setLoadProgress(35);

        const mapW = mapImg.naturalWidth || 1536;
        const mapH = mapImg.naturalHeight || 2752;

        // 2. Load 4 Player Walk-Cycle Spritesheets
        const [skin0, skin1, skin2, skin3] = await Promise.all([
          loadImage(utamaWalkSrc),
          loadImage(hadiah1WalkSrc),
          loadImage(hadiah2WalkSrc),
          loadImage(hadiah3WalkSrc),
        ]);
        if (isCancelled) return;
        setLoadProgress(70);

        // 3. Load 3 NPC Spritesheets (fully cleaned RGBA, no gray box)
        const [npc1, npc2, npc3] = await Promise.all([
          loadImage(npc1SpriteSrc),
          loadImage(npc2SpriteSrc),
          loadImage(npc3SpriteSrc),
        ]);
        if (isCancelled) return;
        setLoadProgress(90);

        const gs = gameStateRef.current;
        gs.mapImg = mapImg;
        gs.mapW = mapW;
        gs.mapH = mapH;

        // Position NPCs based on map dimensions
        gs.npcs.forEach((npc) => {
          npc.x = mapW * npc.xPct;
          npc.y = mapH * npc.yPct;
        });

        // Spawn player at bottom center entrance (50%, 92%)
        gs.player.x = mapW * 0.50;
        gs.player.y = mapH * 0.92;

        gs.skinSprites = [skin0, skin1, skin2, skin3];
        gs.npcSprites = [npc1, npc2, npc3];

        // Ambient confetti
        const colors = ['#FF4444', '#FFD700', '#44AAFF', '#44FF88', '#FF88CC', '#AA44FF', '#FF8844'];
        gs.confettiParticles = Array.from({ length: 70 }, () => ({
          x: Math.random() * mapW,
          y: Math.random() * mapH,
          w: 4 + Math.random() * 4,
          h: 6 + Math.random() * 6,
          vx: (Math.random() - 0.5) * 20,
          vy: 25 + Math.random() * 35,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 4,
        }));

        setLoadProgress(100);
        setLoading(false);
      } catch (err) {
        console.error('Asset load error:', err);
      }
    }

    initGameAssets();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;

      if ((e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') && !isPaused) {
        const gs = gameStateRef.current;
        for (let i = 0; i < gs.npcs.length; i++) {
          const npc = gs.npcs[i];
          const dist = Math.hypot(gs.player.x - npc.x, gs.player.y - npc.y);
          if (dist < 90) {
            onInteractNPC && onInteractNPC(i);
            break;
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, onInteractNPC]);

  // Game Loop
  useEffect(() => {
    if (loading) return;

    let animId;
    let lastTime = performance.now();

    const isBlocked = (nx, ny, mapW, mapH) => {
      const px = nx / mapW;
      const py = ny / mapH;

      for (const hb of HITBOXES) {
        if (px >= hb.x1 && px <= hb.x2 && py >= hb.y1 && py <= hb.y2) {
          return true;
        }
      }
      return false;
    };

    const render = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const gs = gameStateRef.current;
      const { mapImg, mapW, mapH, player, npcs, camera } = gs;

      // Handle Canvas resize
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      const vw = canvas.width;
      const vh = canvas.height;

      // 1. UPDATE PLAYER (delta-time based movement & 8-10 FPS walk cycle)
      if (!isPaused) {
        const keys = keysRef.current;
        const dpad = dpadRef.current;

        const left = keys['ArrowLeft'] || keys['a'] || keys['A'] || dpad.left;
        const right = keys['ArrowRight'] || keys['d'] || keys['D'] || dpad.right;
        const up = keys['ArrowUp'] || keys['w'] || keys['W'] || dpad.up;
        const down = keys['ArrowDown'] || keys['s'] || keys['S'] || dpad.down;

        let mx = (right ? 1 : 0) - (left ? 1 : 0);
        let my = (down ? 1 : 0) - (up ? 1 : 0);

        if (mx !== 0 || my !== 0) {
          const len = Math.sqrt(mx * mx + my * my);
          mx /= len;
          my /= len;

          player.isWalking = true;
          player.walkAnimTimer += dt;

          if (mx < 0) player.facing = -1;
          else if (mx > 0) player.facing = 1;

          const stepX = mx * player.speed * dt;
          const stepY = my * player.speed * dt;

          if (!isBlocked(player.x + stepX, player.y, mapW, mapH)) {
            player.x += stepX;
          }
          if (!isBlocked(player.x, player.y + stepY, mapW, mapH)) {
            player.y += stepY;
          }

          // Small dust particles behind feet
          if (Math.random() < 0.28) {
            gs.dustParticles.push({
              x: player.x + (Math.random() - 0.5) * 12,
              y: player.y + Math.random() * 3,
              vx: -mx * 12 + (Math.random() - 0.5) * 6,
              vy: -my * 6 - Math.random() * 4,
              size: 2 + Math.random() * 2,
              alpha: 0.55,
            });
          }
        } else {
          player.isWalking = false;
          // Smoothly reset to standing Frame 1
          player.walkAnimTimer = 0;
        }
      }

      // 2. UPDATE DUST PARTICLES
      for (let i = gs.dustParticles.length - 1; i >= 0; i--) {
        const p = gs.dustParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= dt * 1.6;
        if (p.alpha <= 0) {
          gs.dustParticles.splice(i, 1);
        }
      }

      // 3. UPDATE CONFETTI
      gs.confettiParticles.forEach((c) => {
        c.y += c.vy * dt;
        c.x += c.vx * dt;
        c.rot += c.rotSpeed * dt;
        if (c.y > mapH) {
          c.y = -10;
          c.x = Math.random() * mapW;
        }
      });

      // 4. CHECK PROXIMITY TO NPCS
      let closestIdx = null;
      let minDistance = 90;
      npcs.forEach((npc, idx) => {
        const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
        if (dist < minDistance) {
          closestIdx = idx;
          // Auto face towards player
          npc.facing = player.x < npc.x ? -1 : 1;
        }
      });
      setNearbyNpcIndex(closestIdx);

      // 5. UPDATE CAMERA (Lerp smoothly follow player)
      const targetCamX = player.x * ZOOM - vw / 2;
      const targetCamY = player.y * ZOOM - vh / 2;

      const maxCamX = Math.max(0, mapW * ZOOM - vw);
      const maxCamY = Math.max(0, mapH * ZOOM - vh);

      const clampedCamX = Math.max(0, Math.min(targetCamX, maxCamX));
      const clampedCamY = Math.max(0, Math.min(targetCamY, maxCamY));

      camera.x += (clampedCamX - camera.x) * 6 * dt;
      camera.y += (clampedCamY - camera.y) * 6 * dt;

      // 6. RENDER SCENE
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, vw, vh);

      ctx.save();
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
      ctx.scale(ZOOM, ZOOM);

      // Draw Map
      if (mapImg) {
        ctx.drawImage(mapImg, 0, 0, mapW, mapH);
      }

      // Draw Dust Particles
      gs.dustParticles.forEach((p) => {
        ctx.fillStyle = `rgba(225, 210, 185, ${Math.max(0, p.alpha)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      // Sort entities by Y coordinate for depth sorting
      const renderEntities = [
        ...npcs.map((npc, idx) => ({ type: 'npc', data: npc, idx, y: npc.y })),
        { type: 'player', data: player, y: player.y },
      ].sort((a, b) => a.y - b.y);

      // Render Entities
      renderEntities.forEach((entity) => {
        if (entity.type === 'player') {
          drawPlayer(ctx, player, gs.skinSprites[activeSkinId] || gs.skinSprites[0]);
        } else {
          drawNPC(
            ctx,
            entity.data,
            gs.npcSprites[entity.idx],
            completedMissions[entity.idx],
            entity.idx === closestIdx
          );
        }
      });

      // Draw Confetti
      gs.confettiParticles.forEach((c) => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      });

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [loading, activeSkinId, completedMissions, isPaused]);

  /**
   * Draw Player using dedicated 4-frame walk cycle spritesheet
   */
  const drawPlayer = (ctx, p, spritesheet) => {
    if (!spritesheet) return;

    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));

    // Soft oval shadow right under the feet (rgba(0, 0, 0, 0.25))
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    const shadowStretch = p.isWalking ? 1 + Math.sin(p.walkAnimTimer * 18) * 0.12 : 1;
    ctx.ellipse(0, 0, 18 * shadowStretch, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Directional facing
    ctx.scale(p.facing, 1);

    if (p.isWalking) {
      // 4-Frame Walk Cycle (8-10 FPS)
      const frameIdx = Math.floor(p.walkAnimTimer * WALK_FPS) % 4;
      const sx = frameIdx * FRAME_SIZE;

      ctx.drawImage(
        spritesheet,
        sx, 0, FRAME_SIZE, FRAME_SIZE,
        -ANCHOR_X, -ANCHOR_Y, FRAME_SIZE, FRAME_SIZE
      );
    } else {
      // Idle Stance: Frame 1 with subtle breathing vertical bob
      const breathBob = Math.sin(Date.now() / 450) * 0.8;
      ctx.drawImage(
        spritesheet,
        0, 0, FRAME_SIZE, FRAME_SIZE,
        -ANCHOR_X, -ANCHOR_Y + breathBob, FRAME_SIZE, FRAME_SIZE
      );
    }

    ctx.restore();
  };

  /**
   * Draw NPC using 2-frame idle breathing spritesheet (clean RGBA, no gray boxes)
   */
  const drawNPC = (ctx, npc, spritesheet, isCompleted, isNearby) => {
    if (!spritesheet) return;

    ctx.save();
    ctx.translate(Math.round(npc.x), Math.round(npc.y));

    // Soft oval shadow right under feet
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Face towards player
    ctx.scale(npc.facing, 1);

    // 2-Frame Idle Breathing
    const frameIdx = Math.floor((Date.now() + npc.phase) / 750) % 2;
    const sx = frameIdx * FRAME_SIZE;

    ctx.drawImage(
      spritesheet,
      sx, 0, FRAME_SIZE, FRAME_SIZE,
      -ANCHOR_X, -ANCHOR_Y, FRAME_SIZE, FRAME_SIZE
    );
    ctx.restore();

    // Floating Icons Above NPC Head
    ctx.save();
    ctx.translate(Math.round(npc.x), Math.round(npc.y - ANCHOR_Y - 4));

    const bobY = Math.sin((Date.now() + npc.phase) / 320) * 4;

    if (!isCompleted) {
      // Floating Gift/Puzzle Bubble
      ctx.save();
      ctx.translate(0, bobY);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-22, -18, 44, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧩 🎁', 0, -8);
      ctx.restore();
    } else {
      // Green checkmark
      ctx.save();
      ctx.translate(0, bobY);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✔', 0, -8);
      ctx.restore();
    }

    // Interaction Prompt
    if (isNearby) {
      ctx.save();
      ctx.translate(0, bobY - 26);
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-65, -14, 130, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FBBF24';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Bicara [E / Tap]', 0, -4);
      ctx.restore();
    }

    ctx.restore();
  };

  // D-Pad touch handlers
  const handleDpadDown = (dir) => {
    dpadRef.current[dir] = true;
  };
  const handleDpadUp = (dir) => {
    dpadRef.current[dir] = false;
  };

  const handleActionClick = () => {
    if (nearbyNpcIndex !== null && !isPaused) {
      onInteractNPC && onInteractNPC(nearbyNpcIndex);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-black">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 font-pixel text-white p-6">
          <div className="text-4xl animate-bounce mb-4">🎂 🎮</div>
          <h1 className="text-sm sm:text-base text-amber-400 font-bold mb-3">
            MEMUAT PESTA ULANG TAHUN...
          </h1>
          <p className="text-[10px] text-slate-400 mb-4">Memuat Spritesheet Walk-Cycle & NPC RGBA...</p>
          <div className="w-64 max-w-full h-3 bg-slate-800 border-2 border-amber-500 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
          <span className="text-[10px] text-amber-300 mt-2">{loadProgress}%</span>
        </div>
      )}

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair pixelated"
        style={{ imageRendering: 'pixelated' }}
        onClick={handleActionClick}
      />

      {/* Virtual D-Pad (Touch / Mobile Friendly) */}
      <div className="absolute bottom-4 left-4 z-30 flex flex-col items-center pointer-events-auto opacity-80 hover:opacity-100 transition-opacity md:opacity-50">
        <button
          onTouchStart={() => handleDpadDown('up')}
          onTouchEnd={() => handleDpadUp('up')}
          onMouseDown={() => handleDpadDown('up')}
          onMouseUp={() => handleDpadUp('up')}
          className="w-12 h-12 bg-slate-900/90 border-2 border-slate-600 active:bg-amber-500 active:text-black rounded text-white flex items-center justify-center font-bold text-lg mb-1 shadow-lg"
        >
          ▲
        </button>
        <div className="flex gap-1">
          <button
            onTouchStart={() => handleDpadDown('left')}
            onTouchEnd={() => handleDpadUp('left')}
            onMouseDown={() => handleDpadDown('left')}
            onMouseUp={() => handleDpadUp('left')}
            className="w-12 h-12 bg-slate-900/90 border-2 border-slate-600 active:bg-amber-500 active:text-black rounded text-white flex items-center justify-center font-bold text-lg shadow-lg"
          >
            ◀
          </button>
          <div className="w-12 h-12 bg-slate-800/50 rounded flex items-center justify-center text-[10px] text-slate-500">
            D-PAD
          </div>
          <button
            onTouchStart={() => handleDpadDown('right')}
            onTouchEnd={() => handleDpadUp('right')}
            onMouseDown={() => handleDpadDown('right')}
            onMouseUp={() => handleDpadUp('right')}
            className="w-12 h-12 bg-slate-900/90 border-2 border-slate-600 active:bg-amber-500 active:text-black rounded text-white flex items-center justify-center font-bold text-lg shadow-lg"
          >
            ▶
          </button>
        </div>
        <button
          onTouchStart={() => handleDpadDown('down')}
          onTouchEnd={() => handleDpadUp('down')}
          onMouseDown={() => handleDpadDown('down')}
          onMouseUp={() => handleDpadUp('down')}
          className="w-12 h-12 bg-slate-900/90 border-2 border-slate-600 active:bg-amber-500 active:text-black rounded text-white flex items-center justify-center font-bold text-lg mt-1 shadow-lg"
        >
          ▼
        </button>
      </div>

      {/* Action / Speak Button (Bottom Right, placed above audio button) */}
      {nearbyNpcIndex !== null && (
        <div className="absolute bottom-20 right-4 z-30 pointer-events-auto animate-bounce">
          <button
            onClick={handleActionClick}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black border-4 border-white rounded-full font-pixel font-bold text-xs sm:text-sm shadow-2xl flex flex-col items-center justify-center gap-1"
          >
            <span>💬</span>
            <span className="text-[8px] sm:text-[9px]">BICARA</span>
          </button>
        </div>
      )}
    </div>
  );
}
