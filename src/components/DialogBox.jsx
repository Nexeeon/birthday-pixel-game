import React from 'react';

/**
 * DialogBox
 * Retro RPG style dialog box at the bottom of the screen
 */
export default function DialogBox({
  isOpen,
  npc,
  isMissionCompleted,
  onStartPuzzle,
  onClose,
}) {
  if (!isOpen || !npc) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-xl z-40 font-pixel select-none animate-slide-up">
      <div className="relative bg-black/90 border-4 border-white p-4 sm:p-5 shadow-2xl text-white rounded-sm">
        
        {/* Name Tag */}
        <div className="absolute -top-4 left-4 bg-amber-500 text-black px-3 py-0.5 text-[10px] sm:text-xs font-bold border-2 border-white uppercase tracking-wider">
          {npc.name}
        </div>

        {/* Content Body */}
        <div className="flex gap-4 items-center">
          {/* NPC Thumbnail */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 bg-slate-800 border-2 border-amber-400 p-1 rounded overflow-hidden flex items-center justify-center">
            {npc.thumbnailSrc ? (
              <img
                src={npc.thumbnailSrc}
                alt={npc.name}
                className="w-full h-full object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <span className="text-2xl">🎁</span>
            )}
          </div>

          {/* Dialogue Text */}
          <div className="flex-1 text-xs sm:text-sm leading-relaxed text-slate-100">
            {isMissionCompleted ? (
              <p className="text-green-300">
                "Selamat Ulang Tahun! 🎉 Hadiah dariku sudah kamu buka. Semoga harimu menyenangkan dan penuh keceriaan!"
              </p>
            ) : (
              <p>
                {npc.dialogText ||
                  'Halo teman! Aku membawa kado spesial untukmu di pesta ini. Selesaikan puzzle 6x6 dariku untuk membuka kostum eksklusif!'}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-700">
          {!isMissionCompleted ? (
            <button
              onClick={onStartPuzzle}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[10px] sm:text-xs border-2 border-white transition flex items-center gap-1.5"
            >
              <span>🧩 Buka Puzzle 6x6</span>
            </button>
          ) : (
            <div className="text-[10px] sm:text-xs text-amber-300 flex items-center gap-1 mr-auto">
              <span>✔ Hadiah Terbuka</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] sm:text-xs border border-slate-500 transition"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

