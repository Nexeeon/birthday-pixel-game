import React from 'react';

/**
 * SkinWardrobe (Wardrobe / Skin Switcher)
 * Shows 4 skins: Default (UTAMA) + 3 Reward Skins
 */
export default function SkinWardrobe({
  isOpen,
  skins,              // Array of { id, name, unlocked, thumbnailSrc }
  currentSkinId,      // 0, 1, 2, 3
  onSelectSkin,
  onClose,
  completedCount,     // 0..3
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-pixel select-none backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border-4 border-amber-400 p-5 rounded-lg text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">👗</span>
            <div>
              <h2 className="text-xs sm:text-sm text-amber-300 font-bold uppercase">
                Wardrobe Kostum
              </h2>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Hadiah Terkumpul: <span className="text-amber-400 font-bold">{completedCount}/3</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded text-xs transition"
          >
            ✕
          </button>
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {skins.map((skin) => {
            const isSelected = currentSkinId === skin.id;
            const isUnlocked = skin.unlocked;

            return (
              <div
                key={skin.id}
                onClick={() => isUnlocked && onSelectSkin(skin.id)}
                className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/40 shadow-lg scale-[1.02]'
                    : isUnlocked
                    ? 'border-slate-700 bg-slate-800/80 hover:border-amber-500/80 cursor-pointer'
                    : 'border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed'
                }`}
              >
                {/* Active Badge */}
                {isSelected && (
                  <span className="absolute -top-2 right-2 bg-amber-400 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                    Dipakai
                  </span>
                )}

                {/* Skin Preview / Silhouette */}
                <div className="relative w-20 h-24 mb-2 flex items-center justify-center bg-black/50 rounded overflow-hidden p-1 border border-slate-700">
                  {skin.thumbnailSrc ? (
                    <img
                      src={skin.thumbnailSrc}
                      alt={skin.name}
                      className={`w-full h-full object-contain pixelated ${
                        !isUnlocked ? 'filter brightness-0 contrast-200 opacity-40' : ''
                      }`}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <div className="text-2xl">👤</div>
                  )}

                  {!isUnlocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                      <span className="text-lg">🔒</span>
                      <span className="text-[8px] text-slate-300 mt-1">Terkunci</span>
                    </div>
                  )}
                </div>

                {/* Title */}
                <span className="text-[10px] text-center font-bold text-slate-200">
                  {skin.name}
                </span>

                <span className="text-[8px] text-slate-400 mt-1 text-center">
                  {skin.unlocked ? (isSelected ? 'Sedang Digunakan' : 'Klik untuk Pakai') : skin.unlockHint}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-600 transition"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
}

