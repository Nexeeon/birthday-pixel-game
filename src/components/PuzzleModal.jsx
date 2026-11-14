import React, { useState, useEffect } from 'react';

/**
 * PuzzleModal (6x6 Grid, 36 Pieces)
 * Uses CSS background-position with 600% 600% background-size
 * 100% robust against tainted canvas or rendering race conditions
 */
export default function PuzzleModal({
  isOpen,
  npcIndex,       // 0, 1, 2
  puzzleImageSrc, // Direct Vite-resolved image URL
  onClose,
  onComplete,
}) {
  const [tiles, setTiles] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [moves, setMoves] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize and shuffle 6x6 puzzle
  useEffect(() => {
    if (!isOpen || !puzzleImageSrc) return;

    const initialTiles = Array.from({ length: 36 }, (_, i) => i);

    // Shuffle using Fisher-Yates, ensuring it's not solved initially
    const shuffled = [...initialTiles];
    let isAlreadySolved = true;
    while (isAlreadySolved) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      isAlreadySolved = shuffled.every((val, idx) => val === idx);
    }

    setTiles(shuffled);
    setSelectedIdx(null);
    setMoves(0);
    setIsPreviewOpen(false);
    setIsCompleted(false);
  }, [isOpen, puzzleImageSrc]);

  if (!isOpen) return null;

  const handleTileClick = (index) => {
    if (isCompleted) return;

    if (selectedIdx === null) {
      setSelectedIdx(index);
    } else if (selectedIdx === index) {
      setSelectedIdx(null);
    } else {
      // Swap tiles
      const newTiles = [...tiles];
      const temp = newTiles[selectedIdx];
      newTiles[selectedIdx] = newTiles[index];
      newTiles[index] = temp;

      setTiles(newTiles);
      setSelectedIdx(null);
      setMoves((m) => m + 1);

      // Check win condition
      const won = newTiles.every((val, idx) => val === idx);
      if (won) {
        setIsCompleted(true);
        setTimeout(() => {
          onComplete(npcIndex);
        }, 1200);
      }
    }
  };

  // Quick solve helper for debugging / testing
  const handleQuickSolve = () => {
    const solved = Array.from({ length: 36 }, (_, i) => i);
    setTiles(solved);
    setSelectedIdx(null);
    setIsCompleted(true);
    setTimeout(() => {
      onComplete(npcIndex);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm select-none">
      <div className="relative flex flex-col items-center max-w-lg w-full bg-slate-900 border-4 border-amber-400 p-4 sm:p-6 rounded-lg shadow-2xl text-white font-pixel">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between border-b-2 border-slate-700 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧩</span>
            <div>
              <h2 className="text-xs sm:text-sm text-amber-300 font-bold tracking-wide">
                PUZZLE 6x6 HADIAH #{npcIndex + 1}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Langkah: <span className="text-amber-400 font-bold">{moves}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-red-600/80 px-2.5 py-1 rounded text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Puzzle Board / Preview */}
        <div className="relative w-full max-w-[360px] aspect-square bg-slate-950 border-2 border-amber-500/80 p-1 rounded overflow-hidden shadow-inner">
          {isPreviewOpen ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90">
              <img
                src={puzzleImageSrc}
                alt="Preview Asli"
                className="w-full h-full object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute bottom-2 bg-black/75 px-3 py-1 rounded text-[10px] text-amber-300">
                Gambar Utuh
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-6 grid-rows-6 w-full h-full gap-[2px]">
              {tiles.map((tileOrigIndex, currentSlot) => {
                const origRow = Math.floor(tileOrigIndex / 6);
                const origCol = tileOrigIndex % 6;
                const isSelected = selectedIdx === currentSlot;
                const isCorrect = tileOrigIndex === currentSlot;

                // 6x6: col 0..5 -> 0%, 20%, 40%, 60%, 80%, 100%
                const posX = (origCol / 5) * 100;
                const posY = (origRow / 5) * 100;

                return (
                  <button
                    key={currentSlot}
                    onClick={() => handleTileClick(currentSlot)}
                    className={`relative w-full h-full overflow-hidden transition-transform duration-75 active:scale-95 focus:outline-none ${
                      isSelected
                        ? 'ring-4 ring-yellow-400 z-10 scale-105 shadow-lg'
                        : isCompleted
                        ? 'border-0'
                        : isCorrect
                        ? 'border border-green-500/40'
                        : 'border border-slate-700/60 hover:border-amber-300'
                    }`}
                    style={{
                      backgroundImage: `url(${puzzleImageSrc})`,
                      backgroundSize: '600% 600%',
                      backgroundPosition: `${posX}% ${posY}%`,
                      imageRendering: 'pixelated',
                    }}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-yellow-400/30 animate-pulse pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Victory Overlay */}
          {isCompleted && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4 animate-fade-in z-20">
              <div className="text-3xl mb-2 animate-bounce">🎁 ✨</div>
              <h3 className="text-sm sm:text-base text-yellow-300 font-bold mb-1">PUZZLE SELESAI!</h3>
              <p className="text-[10px] text-green-300">Skin Baru Telah Terbuka!</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full flex items-center justify-between gap-2 mt-4 pt-2 border-t border-slate-800">
          <button
            onMouseDown={() => setIsPreviewOpen(true)}
            onMouseUp={() => setIsPreviewOpen(false)}
            onTouchStart={() => setIsPreviewOpen(true)}
            onTouchEnd={() => setIsPreviewOpen(false)}
            className="flex-1 py-2 px-3 bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 text-white rounded text-[10px] sm:text-xs transition flex items-center justify-center gap-1.5"
          >
            <span>👁</span>
            <span>Tahan Intip</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 rounded text-[10px] sm:text-xs transition"
          >
            Tutup
          </button>
        </div>

        {/* Small Debug Solve Button */}
        <div className="w-full flex justify-end mt-2">
          <button
            onClick={handleQuickSolve}
            className="text-[9px] text-slate-500 hover:text-amber-400/80 underline cursor-pointer"
          >
            ⚡ Selesaikan Cepat (Debug)
          </button>
        </div>

      </div>
    </div>
  );
}

