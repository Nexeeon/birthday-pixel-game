import React, { useState, useRef, useEffect } from 'react';
import videoSrc from '../../asset/tiuplilinmobile.mp4';

export default function EndingCelebration({
  isOpen,
  onClose,
  onVideoPlayingChange,
}) {
  // Stages: 'transition' | 'video' | 'envelope' | 'letter'
  const [stage, setStage] = useState('transition');
  const [isOpeningEnvelope, setIsOpeningEnvelope] = useState(false);
  const videoRef = useRef(null);
  const confettiCanvasRef = useRef(null);

  // Notify parent whether cutscene video is currently playing
  useEffect(() => {
    if (isOpen && stage === 'video') {
      onVideoPlayingChange?.(true);
    } else {
      onVideoPlayingChange?.(false);
    }
  }, [isOpen, stage, onVideoPlayingChange]);

  // Initialize or reset flow when opened
  useEffect(() => {
    if (isOpen) {
      setStage('transition');
      setIsOpeningEnvelope(false);

      // Transition to video after 1.8 seconds
      const timer = setTimeout(() => {
        setStage('video');
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle video autoplay
  useEffect(() => {
    if (stage === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay prevented, attempting muted play:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play();
          }
        });
      }
    }
  }, [stage]);

  // Confetti effect when letter is revealed
  useEffect(() => {
    if (stage !== 'letter') return;

    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#FF4444', '#FFD700', '#44AAFF', '#44FF88', '#FF88CC', '#AA44FF', '#FF8844'];
    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [stage]);

  if (!isOpen) return null;

  const handleVideoEnd = () => {
    setStage('envelope');
  };

  const handleSkipVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setStage('envelope');
  };

  const handleOpenEnvelope = () => {
    setIsOpeningEnvelope(true);
    setTimeout(() => {
      setStage('letter');
      setIsOpeningEnvelope(false);
    }, 700);
  };

  const handleReplayVideo = () => {
    setStage('video');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none font-pixel animate-fade-in p-3 sm:p-6 overflow-hidden">

      {/* 1. INTRO BANNER TRANSITION */}
      {stage === 'transition' && (
        <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-slate-900/90 border-4 border-amber-400 rounded-lg shadow-2xl animate-bounce">
          <div className="text-5xl mb-4">🎂 ✨ 🎉</div>
          <h2 className="text-sm sm:text-base text-yellow-300 font-bold mb-2">
            SEMUA HADIAH TERKUMPUL!
          </h2>
          <p className="text-xs sm:text-sm text-green-300 animate-pulse">
            Saatnya Tiup Lilin... 🕯️
          </p>
        </div>
      )}

      {/* 2. VIDEO CUTSCENE PLAYER */}
      {stage === 'video' && (
        <div className="relative w-full max-w-md md:max-w-xl max-h-[85vh] aspect-[9/16] sm:aspect-auto flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden border-4 border-amber-400 shadow-2xl">
          {/* Skip Button */}
          <button
            onClick={handleSkipVideo}
            className="absolute top-3 right-3 z-30 px-3 py-1.5 bg-black/75 hover:bg-black/90 active:bg-amber-500 active:text-black border-2 border-white text-white text-[10px] sm:text-xs font-bold rounded shadow-lg transition flex items-center gap-1.5"
          >
            <span>Lewati Video (Skip)</span>
            <span>⏩</span>
          </button>

          {/* Video Element */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            className="w-full h-full max-h-[80vh] object-contain bg-black"
          />

          {/* Subtitle / Hint */}
          <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
            <span className="bg-black/60 text-amber-300 px-3 py-1 rounded text-[9px]">
              🎬 Tiup Lilin Pesta Ulang Tahun
            </span>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE PIXEL ART ENVELOPE */}
      {stage === 'envelope' && (
        <div className="flex flex-col items-center justify-center text-center max-w-md w-full animate-fade-in">
          <div className="mb-4 text-xs sm:text-sm text-amber-300 font-bold tracking-wider animate-pulse">
            ✉️ PESAN SPESIAL UNTUKMU
          </div>

          {/* Interactive Envelope Graphic */}
          <div
            onClick={handleOpenEnvelope}
            className={`relative w-72 h-48 sm:w-80 sm:h-52 bg-amber-100 border-4 border-amber-600 rounded-sm shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center overflow-hidden ${isOpeningEnvelope ? 'scale-110 opacity-70' : 'animate-bounce'
              }`}
            style={{
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
            }}
          >
            {/* Envelope Flap Triangles */}
            <div
              className={`absolute top-0 inset-x-0 h-0 border-l-[140px] sm:border-l-[156px] border-l-transparent border-r-[140px] sm:border-r-[156px] border-r-transparent border-t-[100px] border-t-amber-300 origin-top transition-transform duration-500 ${isOpeningEnvelope ? '-rotate-180 -translate-y-2' : ''
                }`}
            />

            {/* Envelope Bottom Folds */}
            <div className="absolute bottom-0 inset-x-0 h-0 border-l-[140px] sm:border-l-[156px] border-l-amber-200 border-r-[140px] sm:border-r-[156px] border-r-amber-200 border-b-[85px] border-b-amber-300" />

            {/* Wax Seal / Heart Button */}
            <div className="relative z-10 w-12 h-12 rounded-full bg-red-600 border-2 border-red-800 flex items-center justify-center shadow-md transform hover:rotate-12 transition">
              <span className="text-xl">💌</span>
            </div>

            {/* Letter peek edge */}
            <div className="absolute top-2 w-3/4 h-12 bg-white border border-slate-300 rounded-t shadow-inner opacity-80" />
          </div>

          {/* Prompt */}
          <p className="mt-6 text-xs sm:text-sm text-yellow-300 font-bold bg-slate-900/80 px-4 py-2 rounded-full border border-amber-400 shadow">
            Klik Amplop untuk Membuka Surat ✉️
          </p>
        </div>
      )}

      {/* 4. BIRTHDAY LETTER DISPLAY */}
      {stage === 'letter' && (
        <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col items-center justify-between z-10 animate-fade-in">
          {/* Confetti Background Canvas */}
          <canvas
            ref={confettiCanvasRef}
            className="fixed inset-0 pointer-events-none z-0"
          />

          {/* Letter Parchment Container */}
          <div className="relative z-10 w-full bg-[#FAF3E0] text-slate-800 border-4 border-[#8B5A2B] rounded-lg p-5 sm:p-8 shadow-2xl flex flex-col max-h-[80vh] overflow-y-auto">
            {/* Header Stamp */}
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#8B5A2B]/40 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎂</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#653715] uppercase tracking-wider">
                    SURAT ULANG TAHUN
                  </h3>
                  <span className="text-[9px] text-[#8B5A2B] font-sans font-semibold">
                    Dari Orang Yang Mungkin Kamu Kenal
                  </span>
                </div>
              </div>
              <div className="border border-[#8B5A2B] px-2 py-0.5 rounded text-[8px] text-[#8B5A2B] uppercase">
                Khusus Buat Kamu
              </div>
            </div>

            {/* Exact Letter Body (Maintained Word-for-Word) */}
            <div className="flex-1 font-sans text-xs sm:text-sm leading-relaxed text-slate-900 font-medium whitespace-pre-wrap bg-white/60 p-4 sm:p-5 rounded border border-[#8B5A2B]/20 shadow-inner">
              hallo...sudah lama keknya gak ngobrol. apa kabar?semoga baik, dengar dengar kamu udah kuliah diuigm ya.keren ya udah kuliah pasti seru jadi maba.ini hadiah ulang tahun buat kamu, maaf ya kalau kurang bagus dan grafik pembunuhan.semoga di umur sekarang kamu bisa menjadi lebih baik lagi.emm oh iya sama aku mau minta maaf kalau ada salah kata ke kamu atau apa pun itu, sama jangan lupa datang dinatal gpdi aja tanggal 10 desember(bukan modus plis hehe),dah gitu aja.sekali lagi selamat ulang tahun ya buat kamu wish you all the best.
            </div>

            {/* Stamp decoration */}
            <div className="mt-3 text-right">
              <span className="font-pixel text-[9px] text-[#8B5A2B] italic">
                ~ With Best Wishes ✨ ~
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-20 w-full flex flex-col sm:flex-row gap-2.5 justify-center mt-3 pt-1">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[10px] sm:text-xs rounded border-2 border-white shadow-xl transition flex items-center justify-center gap-1.5"
            >
              <span>🎈 Tutup Surat & Lanjut Eksplorasi</span>
            </button>

            <button
              onClick={handleReplayVideo}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-[10px] sm:text-xs rounded border border-slate-500 shadow-xl transition flex items-center justify-center gap-1.5"
            >
              <span>🔄 Putar Ulang Video</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

