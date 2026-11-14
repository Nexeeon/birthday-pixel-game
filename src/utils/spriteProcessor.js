/**
 * spriteProcessor.js
 * Advanced sprite processing pipeline:
 * 1. Background removal via flood-fill from border pixels
 * 2. Label text removal & tight bounding box crop
 * 3. Procedural 4-frame walk cycle spritesheet generator
 * 4. Procedural 2-frame idle breathing generator
 */

export function loadImage(src) {
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
    img.onerror = (err) => {
      console.error(`Failed to load image: ${src}`, err);
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Remove background, discard top label texts, and tightly crop the character
 */
export function cleanAndCropSprite(img) {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = origW;
  rawCanvas.height = origH;
  const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
  rawCtx.drawImage(img, 0, 0);

  const imgData = rawCtx.getImageData(0, 0, origW, origH);
  const data = imgData.data;

  // 1. Color check function for near-white/light-gray background
  const isNearWhite = (r, g, b) => {
    // Almost white or very light neutral gray background
    if (r > 225 && g > 225 && b > 225) return true;
    const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    if (r > 215 && g > 215 && b > 215 && diff < 15) return true;
    return false;
  };

  // 2. BFS Flood-Fill from all 4 borders
  const visited = new Uint8Array(origW * origH);
  const queue = [];

  const checkAndEnqueue = (x, y) => {
    if (x < 0 || x >= origW || y < 0 || y >= origH) return;
    const idx = y * origW + x;
    if (visited[idx]) return;

    const pIdx = idx * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2], a = data[pIdx + 3];

    // If transparent or near-white background
    if (a < 50 || isNearWhite(r, g, b)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  // Seed from border edges
  for (let x = 0; x < origW; x++) {
    checkAndEnqueue(x, 0);
    checkAndEnqueue(x, origH - 1);
  }
  for (let y = 0; y < origH; y++) {
    checkAndEnqueue(0, y);
    checkAndEnqueue(origW - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % origW;
    const y = Math.floor(idx / origW);

    checkAndEnqueue(x + 1, y);
    checkAndEnqueue(x - 1, y);
    checkAndEnqueue(x, y + 1);
    checkAndEnqueue(x, y - 1);
  }

  // Turn all flood-filled pixels transparent
  for (let i = 0; i < origW * origH; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  // 3. Remove Top Label Texts (e.g., "NPC 1", "UTAMA")
  // Group non-transparent pixels into connected components
  const compId = new Int32Array(origW * origH).fill(-1);
  const components = [];

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const idx = y * origW + x;
      if (data[idx * 4 + 3] < 50 || compId[idx] !== -1) continue;

      const currentId = components.length;
      let pixelCount = 0;
      let cMinX = x, cMaxX = x, cMinY = y, cMaxY = y;
      const cQueue = [idx];
      compId[idx] = currentId;

      let cHead = 0;
      while (cHead < cQueue.length) {
        const cIdx = cQueue[cHead++];
        const cx = cIdx % origW;
        const cy = Math.floor(cIdx / origW);
        pixelCount++;

        if (cx < cMinX) cMinX = cx;
        if (cx > cMaxX) cMaxX = cx;
        if (cy < cMinY) cMinY = cy;
        if (cy > cMaxY) cMaxY = cy;

        // 8-way neighbors for solid component tracking
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < origW && ny >= 0 && ny < origH) {
              const nIdx = ny * origW + nx;
              if (data[nIdx * 4 + 3] >= 50 && compId[nIdx] === -1) {
                compId[nIdx] = currentId;
                cQueue.push(nIdx);
              }
            }
          }
        }
      }

      components.push({
        id: currentId,
        pixelCount,
        minX: cMinX,
        maxX: cMaxX,
        minY: cMinY,
        maxY: cMaxY,
      });
    }
  }

  // Find the primary character body component (the largest component)
  let mainBodyComp = null;
  let maxPixels = 0;
  for (const c of components) {
    if (c.pixelCount > maxPixels) {
      maxPixels = c.pixelCount;
      mainBodyComp = c;
    }
  }

  // If we found a main body, remove any small components that are way above the body (top text labels)
  if (mainBodyComp) {
    // Body starts around mainBodyComp.minY. Any text label is typically in the top 30% of the image
    // and separated vertically by at least a few pixels or has very few pixels compared to the body.
    for (const c of components) {
      if (c === mainBodyComp) continue;

      const isAboveBody = c.maxY < mainBodyComp.minY + 10;
      const isTiny = c.pixelCount < mainBodyComp.pixelCount * 0.08;
      const isNearTop = c.minY < origH * 0.35;

      // If it is a disconnected top label text, clear its pixels
      if (isAboveBody && (isTiny || isNearTop)) {
        for (let y = c.minY; y <= c.maxY; y++) {
          for (let x = c.minX; x <= c.maxX; x++) {
            const idx = y * origW + x;
            if (compId[idx] === c.id) {
              data[idx * 4 + 3] = 0;
            }
          }
        }
      }
    }
  }

  // 4. Calculate tight bounding box of remaining character pixels
  let minX = origW, minY = origH, maxX = 0, maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const idx = y * origW + x;
      if (data[idx * 4 + 3] >= 50) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback if empty
  if (!hasPixels) {
    minX = 0; minY = 0; maxX = origW - 1; maxY = origH - 1;
  }

  // Put cleaned data back
  rawCtx.putImageData(imgData, 0, 0);

  // 5. Crop strictly to character bounding box
  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.imageSmoothingEnabled = false;
  croppedCtx.drawImage(rawCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return croppedCanvas;
}

/**
 * Generate 4-frame walk cycle and 2-frame idle animation from a single cropped character sprite
 */
export function generateSpriteAnimations(croppedCanvas) {
  const W = croppedCanvas.width;
  const H = croppedCanvas.height;

  // Split upper body (70%) and lower legs/feet (30%)
  const legSplitY = Math.floor(H * 0.70);
  const bodyH = legSplitY;
  const legH = H - legSplitY;
  const halfW = Math.floor(W * 0.5);

  // Slice body
  const bodyCanvas = document.createElement('canvas');
  bodyCanvas.width = W;
  bodyCanvas.height = bodyH;
  const bCtx = bodyCanvas.getContext('2d');
  bCtx.imageSmoothingEnabled = false;
  bCtx.drawImage(croppedCanvas, 0, 0, W, bodyH, 0, 0, W, bodyH);

  // Slice left leg
  const leftLegCanvas = document.createElement('canvas');
  leftLegCanvas.width = halfW;
  leftLegCanvas.height = legH;
  const llCtx = leftLegCanvas.getContext('2d');
  llCtx.imageSmoothingEnabled = false;
  llCtx.drawImage(croppedCanvas, 0, legSplitY, halfW, legH, 0, 0, halfW, legH);

  // Slice right leg
  const rightLegCanvas = document.createElement('canvas');
  rightLegCanvas.width = W - halfW;
  rightLegCanvas.height = legH;
  const rlCtx = rightLegCanvas.getContext('2d');
  rlCtx.imageSmoothingEnabled = false;
  rlCtx.drawImage(croppedCanvas, halfW, legSplitY, W - halfW, legH, 0, 0, W - halfW, legH);

  // Helper to create padded frame canvas
  const paddingX = 8;
  const paddingY = 8;
  const frameW = W + paddingX * 2;
  const frameH = H + paddingY * 2;

  const createFrame = (renderFn) => {
    const fCanvas = document.createElement('canvas');
    fCanvas.width = frameW;
    fCanvas.height = frameH;
    const fCtx = fCanvas.getContext('2d');
    fCtx.imageSmoothingEnabled = false;
    renderFn(fCtx, paddingX, paddingY);
    return fCanvas;
  };

  /**
   * 4-Frame Walk Cycle
   * Frame 0: Left step (body drop 2px, left leg forward/down +2px, right leg back/up -2px)
   * Frame 1: Passing (body bounce +2px, legs neutral)
   * Frame 2: Right step (body drop 2px, right leg forward/down +2px, left leg back/up -2px)
   * Frame 3: Passing (body bounce +2px, legs neutral)
   */
  const walkFrames = [
    // Frame 0: Left step forward
    createFrame((ctx, px, py) => {
      // Body lowered slightly (-2px relative to ground, meaning drawn +2px down)
      ctx.drawImage(bodyCanvas, px, py + 2);
      // Left leg forward & down
      ctx.drawImage(leftLegCanvas, px - 1, py + legSplitY + 2);
      // Right leg back & slightly up
      ctx.drawImage(rightLegCanvas, px + halfW + 1, py + legSplitY - 1);
    }),

    // Frame 1: Passing position (legs aligned, body bob up)
    createFrame((ctx, px, py) => {
      // Body bob up (drawn -2px higher)
      ctx.drawImage(bodyCanvas, px, py - 2);
      // Legs centered
      ctx.drawImage(leftLegCanvas, px, py + legSplitY - 1);
      ctx.drawImage(rightLegCanvas, px + halfW, py + legSplitY - 1);
    }),

    // Frame 2: Right step forward
    createFrame((ctx, px, py) => {
      // Body lowered slightly
      ctx.drawImage(bodyCanvas, px, py + 2);
      // Left leg back & slightly up
      ctx.drawImage(leftLegCanvas, px - 1, py + legSplitY - 1);
      // Right leg forward & down
      ctx.drawImage(rightLegCanvas, px + halfW + 1, py + legSplitY + 2);
    }),

    // Frame 3: Passing position
    createFrame((ctx, px, py) => {
      // Body bob up
      ctx.drawImage(bodyCanvas, px, py - 2);
      // Legs centered
      ctx.drawImage(leftLegCanvas, px, py + legSplitY - 1);
      ctx.drawImage(rightLegCanvas, px + halfW, py + legSplitY - 1);
    }),
  ];

  /**
   * 2-Frame Idle Breathing
   * Frame 0: Natural stance
   * Frame 1: Inhale (chest bob +1px up, slight squash-stretch)
   */
  const idleFrames = [
    createFrame((ctx, px, py) => {
      ctx.drawImage(bodyCanvas, px, py);
      ctx.drawImage(leftLegCanvas, px, py + legSplitY);
      ctx.drawImage(rightLegCanvas, px + halfW, py + legSplitY);
    }),
    createFrame((ctx, px, py) => {
      // Subtle 1px upward breathing bob for body
      ctx.drawImage(bodyCanvas, px, py - 1);
      ctx.drawImage(leftLegCanvas, px, py + legSplitY);
      ctx.drawImage(rightLegCanvas, px + halfW, py + legSplitY);
    }),
  ];

  return {
    rawCanvas: croppedCanvas,
    walkFrames,
    idleFrames,
    frameW,
    frameH,
    baseW: W,
    baseH: H,
    paddingX,
    paddingY,
  };
}

/**
 * Preprocess an entire character asset into an animated sprite object
 */
export async function processCharacterAsset(src) {
  const rawImg = await loadImage(src);
  const cleanCanvas = cleanAndCropSprite(rawImg);
  return generateSpriteAnimations(cleanCanvas);
}

