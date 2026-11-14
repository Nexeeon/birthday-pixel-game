const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const TARGET_FRAME_W = 96;
const TARGET_FRAME_H = 96;
const ANCHOR_Y = 90; // Bottom contact baseline
const ANCHOR_X = 48; // Center baseline
const CHAR_TARGET_H = 82; // Height of character inside the 96x96 frame

async function cleanSprite(srcPath, isNpc = false) {
  const img = await Jimp.read(srcPath);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const data = img.bitmap.data;

  // 1. Detect background color from 4 corners
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];

  let avgBgR = 0, avgBgG = 0, avgBgB = 0;
  for (const [cx, cy] of corners) {
    const idx = (cy * w + cx) * 4;
    avgBgR += data[idx];
    avgBgG += data[idx + 1];
    avgBgB += data[idx + 2];
  }
  avgBgR = Math.round(avgBgR / 4);
  avgBgG = Math.round(avgBgG / 4);
  avgBgB = Math.round(avgBgB / 4);

  const isWhiteBg = avgBgR > 220 && avgBgG > 220 && avgBgB > 220;

  // 2. Erase top label text for NPCs (y < 102)
  if (isNpc) {
    for (let y = 0; y < 102 && y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        data[idx + 3] = 0; // Alpha 0
      }
    }
  }

  // 3. Make all background pixels transparent (including enclosed pockets between arms/legs)
  for (let y = (isNpc ? 102 : 0); y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let isBg = false;
      if (isWhiteBg) {
        // Near-white or very light gray
        if (r > 218 && g > 218 && b > 218) isBg = true;
      } else {
        // Gray background (e.g. NPC1, NPC2, NPC3)
        const dist = Math.sqrt((r - avgBgR) ** 2 + (g - avgBgG) ** 2 + (b - avgBgB) ** 2);
        if (dist < 40) isBg = true;
      }

      if (isBg) {
        data[idx + 3] = 0;
      }
    }
  }

  // 4. Find tight bounding box of remaining character
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let hasPixels = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] > 30) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) {
    minX = 0; maxX = w - 1; minY = 0; maxY = h - 1;
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  // Crop
  const cropped = new Jimp({ width: cropW, height: cropH, color: 0x00000000 });
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = ((minY + y) * w + (minX + x)) * 4;
      const dstIdx = (y * cropW + x) * 4;
      cropped.bitmap.data[dstIdx] = data[srcIdx];
      cropped.bitmap.data[dstIdx + 1] = data[srcIdx + 1];
      cropped.bitmap.data[dstIdx + 2] = data[srcIdx + 2];
      cropped.bitmap.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  // Resize proportionally so character height = CHAR_TARGET_H
  const scaledW = Math.round(cropW * (CHAR_TARGET_H / cropH));
  const scaledH = CHAR_TARGET_H;
  cropped.resize({ w: scaledW, h: scaledH });

  return { img: cropped, w: scaledW, h: scaledH };
}

/**
 * Generate 4-frame walk cycle from a cleaned, scaled sprite
 */
function generateWalkCycleFrames(cleanObj) {
  const { img, w, h } = cleanObj;
  const frames = [];

  // Anatomy segments
  const headH = Math.floor(h * 0.46);
  const torsoH = Math.floor(h * 0.26); // from headH to headH + torsoH
  const legSplitY = headH + torsoH;
  const legH = h - legSplitY;

  const leftArmW = Math.floor(w * 0.28);
  const rightArmX = Math.floor(w * 0.72);
  const rightArmW = w - rightArmX;
  const halfW = Math.floor(w * 0.5);

  // Helper to blit a rectangular region with sub-pixel offsets
  const blitRegion = (targetImg, srcX, srcY, regW, regH, destX, destY) => {
    for (let y = 0; y < regH; y++) {
      for (let x = 0; x < regW; x++) {
        const sx = srcX + x;
        const sy = srcY + y;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;

        const dx = Math.round(destX + x);
        const dy = Math.round(destY + y);
        if (dx < 0 || dx >= TARGET_FRAME_W || dy < 0 || dy >= TARGET_FRAME_H) continue;

        const sIdx = (sy * w + sx) * 4;
        const a = img.bitmap.data[sIdx + 3];
        if (a < 20) continue;

        const dIdx = (dy * TARGET_FRAME_W + dx) * 4;
        targetImg.bitmap.data[dIdx] = img.bitmap.data[sIdx];
        targetImg.bitmap.data[dIdx + 1] = img.bitmap.data[sIdx + 1];
        targetImg.bitmap.data[dIdx + 2] = img.bitmap.data[sIdx + 2];
        targetImg.bitmap.data[dIdx + 3] = a;
      }
    }
  };

  const baseX = ANCHOR_X - Math.floor(w / 2);
  const baseY = ANCHOR_Y - h;

  // Frame 1: Contact / Neutral Stance
  {
    const f1 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
    blitRegion(f1, 0, 0, w, h, baseX, baseY);
    frames.push(f1);
  }

  // Frame 2: Left Step Forward, Right Leg Back (Body dips 1px, left leg +2px X, right leg -2px X)
  {
    const f2 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
    const dipY = 1;

    // Head
    blitRegion(f2, 0, 0, w, headH, baseX, baseY + dipY);
    // Torso
    blitRegion(f2, leftArmW, headH, rightArmX - leftArmW, torsoH, baseX + leftArmW, baseY + headH + dipY);
    // Left arm swings back (-2px X, -1px Y)
    blitRegion(f2, 0, headH, leftArmW, torsoH, baseX - 2, baseY + headH + dipY - 1);
    // Right arm swings forward (+2px X, +1px Y)
    blitRegion(f2, rightArmX, headH, rightArmW, torsoH, baseX + rightArmX + 2, baseY + headH + dipY + 1);
    // Left leg steps forward (+2px X, grounded at ANCHOR_Y)
    blitRegion(f2, 0, legSplitY, halfW, legH, baseX + 2, baseY + legSplitY + dipY);
    // Right leg pushes back (-2px X, heel lifted 2px up)
    blitRegion(f2, halfW, legSplitY, w - halfW, legH, baseX + halfW - 2, baseY + legSplitY + dipY - 2);

    frames.push(f2);
  }

  // Frame 3: Passing Pose (Body rises 2px, feet passing, arms neutral)
  {
    const f3 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
    const riseY = -2;

    // Head & Hair bob up
    blitRegion(f3, 0, 0, w, headH, baseX, baseY + riseY);
    // Torso
    blitRegion(f3, leftArmW, headH, rightArmX - leftArmW, torsoH, baseX + leftArmW, baseY + headH + riseY);
    // Arms neutral
    blitRegion(f3, 0, headH, leftArmW, torsoH, baseX, baseY + headH + riseY);
    blitRegion(f3, rightArmX, headH, rightArmW, torsoH, baseX + rightArmX, baseY + headH + riseY);
    // Support left leg straight under body
    blitRegion(f3, 0, legSplitY, halfW, legH, baseX, baseY + legSplitY);
    // Passing right leg bent, foot lifted 3px up
    blitRegion(f3, halfW, legSplitY, w - halfW, legH, baseX + halfW, baseY + legSplitY + riseY - 1);

    frames.push(f3);
  }

  // Frame 4: Right Step Forward, Left Leg Back (Body dips 1px, right leg +2px X, left leg -2px X)
  {
    const f4 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
    const dipY = 1;

    // Head
    blitRegion(f4, 0, 0, w, headH, baseX, baseY + dipY);
    // Torso
    blitRegion(f4, leftArmW, headH, rightArmX - leftArmW, torsoH, baseX + leftArmW, baseY + headH + dipY);
    // Left arm swings forward (+2px X, +1px Y)
    blitRegion(f4, 0, headH, leftArmW, torsoH, baseX + 2, baseY + headH + dipY + 1);
    // Right arm swings back (-2px X, -1px Y)
    blitRegion(f4, rightArmX, headH, rightArmW, torsoH, baseX + rightArmX - 2, baseY + headH + dipY - 1);
    // Left leg pushes back (-2px X, heel lifted 2px up)
    blitRegion(f4, 0, legSplitY, halfW, legH, baseX - 2, baseY + legSplitY + dipY - 2);
    // Right leg steps forward (+2px X, grounded at ANCHOR_Y)
    blitRegion(f4, halfW, legSplitY, w - halfW, legH, baseX + halfW + 2, baseY + legSplitY + dipY);

    frames.push(f4);
  }

  return frames;
}

/**
 * Stitch frames horizontally into a single spritesheet
 */
function stitchSpritesheet(frames) {
  const totalW = TARGET_FRAME_W * frames.length;
  const sheet = new Jimp({ width: totalW, height: TARGET_FRAME_H, color: 0x00000000 });

  frames.forEach((f, i) => {
    const offsetX = i * TARGET_FRAME_W;
    for (let y = 0; y < TARGET_FRAME_H; y++) {
      for (let x = 0; x < TARGET_FRAME_W; x++) {
        const sIdx = (y * TARGET_FRAME_W + x) * 4;
        const dIdx = (y * totalW + (offsetX + x)) * 4;
        sheet.bitmap.data[dIdx] = f.bitmap.data[sIdx];
        sheet.bitmap.data[dIdx + 1] = f.bitmap.data[sIdx + 1];
        sheet.bitmap.data[dIdx + 2] = f.bitmap.data[sIdx + 2];
        sheet.bitmap.data[dIdx + 3] = f.bitmap.data[sIdx + 3];
      }
    }
  });

  return sheet;
}

/**
 * Generate 2-frame idle breathing for NPC
 */
function generateNpcIdle(cleanObj) {
  const { img, w, h } = cleanObj;
  const baseX = ANCHOR_X - Math.floor(w / 2);
  const baseY = ANCHOR_Y - h;

  // Frame 1: Stance
  const f1 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = baseX + x;
      const dy = baseY + y;
      if (dx < 0 || dx >= TARGET_FRAME_W || dy < 0 || dy >= TARGET_FRAME_H) continue;
      const sIdx = (y * w + x) * 4;
      const dIdx = (dy * TARGET_FRAME_W + dx) * 4;
      f1.bitmap.data[dIdx] = img.bitmap.data[sIdx];
      f1.bitmap.data[dIdx + 1] = img.bitmap.data[sIdx + 1];
      f1.bitmap.data[dIdx + 2] = img.bitmap.data[sIdx + 2];
      f1.bitmap.data[dIdx + 3] = img.bitmap.data[sIdx + 3];
    }
  }

  // Frame 2: Inhale (chest bob 1px up)
  const f2 = new Jimp({ width: TARGET_FRAME_W, height: TARGET_FRAME_H, color: 0x00000000 });
  const headH = Math.floor(h * 0.46);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = baseX + x;
      // If upper body, lift by 1px
      const dy = y < headH + Math.floor(h * 0.25) ? baseY + y - 1 : baseY + y;
      if (dx < 0 || dx >= TARGET_FRAME_W || dy < 0 || dy >= TARGET_FRAME_H) continue;
      const sIdx = (y * w + x) * 4;
      const dIdx = (dy * TARGET_FRAME_W + dx) * 4;
      f2.bitmap.data[dIdx] = img.bitmap.data[sIdx];
      f2.bitmap.data[dIdx + 1] = img.bitmap.data[sIdx + 1];
      f2.bitmap.data[dIdx + 2] = img.bitmap.data[sIdx + 2];
      f2.bitmap.data[dIdx + 3] = img.bitmap.data[sIdx + 3];
    }
  }

  return stitchSpritesheet([f1, f2]);
}

async function main() {
  console.log('🚀 Starting professional sprite processing pipeline...');

  const skinJobs = [
    { src: 'asset/char_utama.jpg', out: 'utama_walk.png' },
    { src: 'asset/hadiahpuzzel1.jpg', out: 'hadiahpuzzel1_walk.png' },
    { src: 'asset/hadiahpuzzel2.jpg', out: 'hadiahpuzzel2_walk.png' },
    { src: 'asset/hadiahpuzzel3.jpg', out: 'hadiahpuzzel3_walk.png' },
  ];

  const npcJobs = [
    { src: 'asset/npc1.jpg', out: 'npc1.png' },
    { src: 'asset/npc2.jpg', out: 'npc2.png' },
    { src: 'asset/npc3.png', out: 'npc3.png' },
  ];

  const outDirs = [
    'src/asset/sprites',
    'public/asset/sprites',
    'asset/sprites',
  ];

  for (const dir of outDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Process 4 Player Skins
  for (const job of skinJobs) {
    console.log(`Processing skin: ${job.src} -> ${job.out}...`);
    const clean = await cleanSprite(job.src, false);
    const frames = generateWalkCycleFrames(clean);
    const sheet = stitchSpritesheet(frames);

    for (const dir of outDirs) {
      await sheet.write(path.join(dir, job.out));
    }
    console.log(`  ✓ Saved ${job.out} (384x96, 4 frames) to all target directories.`);
  }

  // 2. Process 3 NPCs
  for (const job of npcJobs) {
    console.log(`Processing NPC: ${job.src} -> ${job.out}...`);
    const clean = await cleanSprite(job.src, true);
    const sheet = generateNpcIdle(clean);

    for (const dir of outDirs) {
      await sheet.write(path.join(dir, job.out));
    }
    console.log(`  ✓ Saved ${job.out} (192x96, 2 idle frames) with full transparency.`);
  }

  console.log('🎉 All spritesheets generated and aligned with ZERO jitter!');
}

main().catch(console.error);
