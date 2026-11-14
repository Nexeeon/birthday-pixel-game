import React, { useState, useMemo } from 'react';
import GameCanvas from './components/GameCanvas';
import DialogBox from './components/DialogBox';
import PuzzleModal from './components/PuzzleModal';
import SkinWardrobe from './components/SkinWardrobe';
import EndingCelebration from './components/EndingCelebration';
import AudioController from './components/AudioController';

// Assets for UI thumbnails & Puzzles
import puzzle1Src from '../asset/puzzel1.jpeg';
import puzzle2Src from '../asset/puzzel2.jpeg';
import puzzle3Src from '../asset/puzzel3.jpeg';

import charUtamaSrc from '../asset/char_utama.jpg';
import skin1Src from '../asset/hadiahpuzzel1.jpg';
import skin2Src from '../asset/hadiahpuzzel2.jpg';
import skin3Src from '../asset/hadiahpuzzel3.jpg';

import npc1Clean from './asset/sprites/npc1.png';
import npc2Clean from './asset/sprites/npc2.png';
import npc3Clean from './asset/sprites/npc3.png';

const PUZZLE_IMAGES = [puzzle1Src, puzzle2Src, puzzle3Src];

const NPC_INFO = [
  {
    name: 'Riri (Pemberi Hadiah 1)',
    thumbnailSrc: npc1Clean,
    dialogText: 'Hai! Selamat datang di pesta ulang tahun! 🎉 Aku membawakan hadiah spesial untukmu. Selesaikan puzzle 6x6 dariku ya!',
  },
  {
    name: 'Dodi (Pemberi Hadiah 2)',
    thumbnailSrc: npc2Clean,
    dialogText: 'Wah, pestanya seru sekali! 🎂 Aku punya kado kostum adat keren untukmu. Ayo pecahkan teka-teki puzzle kedua ini!',
  },
  {
    name: 'Lala (Pemberi Hadiah 3)',
    thumbnailSrc: npc3Clean,
    dialogText: 'Halo sahabat! 🌟 Satu kado terakhir menantimu. Selesaikan puzzle 6x6 ini untuk melengkapi pesta ulang tahunmu!',
  },
];

export default function App() {
  const [activeSkinId, setActiveSkinId] = useState(0);
  const [completedMissions, setCompletedMissions] = useState([false, false, false]);
  const [unlockedSkins, setUnlockedSkins] = useState([true, false, false, false]);

  const [dialogNpcIndex, setDialogNpcIndex] = useState(null);
  const [puzzleNpcIndex, setPuzzleNpcIndex] = useState(null);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [showEndingCelebration, setShowEndingCelebration] = useState(false);
  const [isCutsceneVideoPlaying, setIsCutsceneVideoPlaying] = useState(false);

  // Skins Configuration
  const skins = useMemo(() => [
    {
      id: 0,
      name: 'Utama (Default)',
      unlocked: unlockedSkins[0],
      thumbnailSrc: charUtamaSrc,
      unlockHint: 'Kostum Utama',
    },
    {
      id: 1,
      name: 'Peace Sign (NPC 1)',
      unlocked: unlockedSkins[1],
      thumbnailSrc: skin1Src,
      unlockHint: 'Selesaikan Puzzle Riri',
    },
    {
      id: 2,
      name: 'Bucket Pink (NPC 2)',
      unlocked: unlockedSkins[2],
      thumbnailSrc: skin2Src,
      unlockHint: 'Selesaikan Puzzle Dodi',
    },
    {
      id: 3,
      name: 'Blus Biru (NPC 3)',
      unlocked: unlockedSkins[3],
      thumbnailSrc: skin3Src,
      unlockHint: 'Selesaikan Puzzle Lala',
    },
  ], [unlockedSkins]);

  const completedCount = completedMissions.filter(Boolean).length;

  // Handle NPC interaction
  const handleInteractNPC = (index) => {
    setDialogNpcIndex(index);
  };

  // Start puzzle from dialog
  const handleStartPuzzle = () => {
    if (dialogNpcIndex !== null) {
      const idx = dialogNpcIndex;
      setDialogNpcIndex(null);
      setPuzzleNpcIndex(idx);
    }
  };

  // Puzzle completed
  const handlePuzzleComplete = (npcIdx) => {
    setCompletedMissions((prev) => {
      const next = [...prev];
      next[npcIdx] = true;
      return next;
    });

    // Unlock corresponding skin
    const skinIdxToUnlock = npcIdx + 1;
    setUnlockedSkins((prev) => {
      const next = [...prev];
      next[skinIdxToUnlock] = true;
      return next;
    });

    // Auto-equip the new skin for immediate excitement!
    setActiveSkinId(skinIdxToUnlock);
    setPuzzleNpcIndex(null);

    // Check if all 3 missions are now done
    const nextCompleted = [...completedMissions];
    nextCompleted[npcIdx] = true;
    if (nextCompleted.every(Boolean)) {
      setTimeout(() => {
        setShowEndingCelebration(true);
      }, 1000);
    }
  };

  const handleRestartGame = () => {
    setCompletedMissions([false, false, false]);
    setUnlockedSkins([true, false, false, false]);
    setActiveSkinId(0);
    setShowEndingCelebration(false);
  };

  const isModalOpen = dialogNpcIndex !== null || puzzleNpcIndex !== null || isWardrobeOpen || showEndingCelebration;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Top HUD */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none font-pixel">
        {/* Mission Progress */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 border-2 border-amber-400 px-3 py-2 rounded shadow-lg backdrop-blur-sm text-white">
          <span className="text-base sm:text-lg animate-pulse">🎁</span>
          <div>
            <div className="text-[9px] sm:text-[10px] text-amber-300 font-bold">
              MISI ULANG TAHUN
            </div>
            <div className="text-[10px] sm:text-xs text-white">
              Hadiah: <span className="text-amber-400 font-bold">{completedCount}/3</span>
            </div>
          </div>
        </div>

        {/* Right Buttons: Ending replay & Wardrobe */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {completedCount === 3 && (
            <button
              onClick={() => setShowEndingCelebration(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 active:scale-95 text-white border-2 border-white px-3 py-2 rounded shadow-lg text-[10px] sm:text-xs font-bold transition animate-pulse"
            >
              <span>🎂</span>
              <span>SURAT & VIDEO</span>
            </button>
          )}

          <button
            onClick={() => setIsWardrobeOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black border-2 border-white px-3 py-2 rounded shadow-lg text-[10px] sm:text-xs font-bold transition transform active:scale-95"
          >
            <span>👗</span>
            <span>GANTI SKIN</span>
          </button>
        </div>
      </div>

      {/* Controls Hint (Top Center) */}
      <div className="hidden sm:block absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none font-pixel text-[9px] text-white/80 bg-black/60 px-3 py-1 rounded border border-slate-700">
        [WASD / Arrow Keys] Bergerak • [E / Space] Bicara
      </div>

      {/* Game Canvas */}
      <GameCanvas
        activeSkinId={activeSkinId}
        completedMissions={completedMissions}
        onInteractNPC={handleInteractNPC}
        isPaused={isModalOpen}
      />

      {/* RPG Dialog Box */}
      <DialogBox
        isOpen={dialogNpcIndex !== null}
        npc={dialogNpcIndex !== null ? NPC_INFO[dialogNpcIndex] : null}
        isMissionCompleted={dialogNpcIndex !== null ? completedMissions[dialogNpcIndex] : false}
        onStartPuzzle={handleStartPuzzle}
        onClose={() => setDialogNpcIndex(null)}
      />

      {/* 6x6 Puzzle Mini-Game Modal */}
      <PuzzleModal
        isOpen={puzzleNpcIndex !== null}
        npcIndex={puzzleNpcIndex !== null ? puzzleNpcIndex : 0}
        puzzleImageSrc={puzzleNpcIndex !== null ? PUZZLE_IMAGES[puzzleNpcIndex] : null}
        onClose={() => setPuzzleNpcIndex(null)}
        onComplete={handlePuzzleComplete}
      />

      {/* Skin Wardrobe Panel */}
      <SkinWardrobe
        isOpen={isWardrobeOpen}
        skins={skins}
        currentSkinId={activeSkinId}
        onSelectSkin={(id) => {
          setActiveSkinId(id);
          setIsWardrobeOpen(false);
        }}
        onClose={() => setIsWardrobeOpen(false)}
        completedCount={completedCount}
      />

      {/* Ending Cutscene Video & Interactive Birthday Letter */}
      <EndingCelebration
        isOpen={showEndingCelebration}
        onClose={() => setShowEndingCelebration(false)}
        onVideoPlayingChange={setIsCutsceneVideoPlaying}
      />

      {/* Background Music & Floating Audio Controller */}
      <AudioController isCutscenePlaying={isCutsceneVideoPlaying} />
    </div>
  );
}

