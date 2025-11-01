import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import type { ImageSlide, SlideshowSettings, MotionEffect, TransitionEffect } from './types';

// --- Helper Functions & Data ---
type MusicBehavior = 'loop' | 'fade';

const motionOptions: { id: MotionEffect; name: string }[] = [
    { id: 'none', name: 'Aucun' },
    { id: 'zoom-in', name: 'Zoom Avant' },
    { id: 'zoom-out', name: 'Zoom Arrière' },
    { id: 'pan-left', name: 'Panoramique Gauche' },
    { id: 'pan-right', name: 'Panoramique Droite' },
    { id: 'pan-up', name: 'Panoramique Haut' },
    { id: 'pan-down', name: 'Panoramique Bas' },
    { id: 'rotate', name: 'Rotation' },
];

const transitionOptions: { id: TransitionEffect; name: string }[] = [
    { id: 'fade', name: 'Fondu' },
    { id: 'slide', name: 'Glissement' },
    { id: 'zoom-in', name: 'Zoom Avant' },
    { id: 'zoom-out', name: 'Zoom Arrière' },
];

const getRandomMotion = (): MotionEffect => {
    const motions = motionOptions.filter(m => m.id !== 'none');
    return motions[Math.floor(Math.random() * motions.length)].id;
};

// --- SVG Icons ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const MusicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>;


// --- Main App Component ---
const App: React.FC = () => {
    // State
    const [slides, setSlides] = useState<ImageSlide[]>([]);
    const [settings, setSettings] = useState<SlideshowSettings>({ slideDuration: 4, transitionDuration: 1, transitionEffect: 'fade' });
    const [musicFile, setMusicFile] = useState<File | null>(null);
    const [musicUrl, setMusicUrl] = useState<string | null>(null);
    const [musicBehavior, setMusicBehavior] = useState<MusicBehavior>('loop');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');

    const audioRef = useRef<HTMLAudioElement>(null);
    const timerRef = useRef<number | null>(null);

    // Slideshow Logic
    const advanceSlide = useCallback(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, [slides.length]);

    useEffect(() => {
        if (isPlaying && slides.length > 1) {
            timerRef.current = window.setTimeout(advanceSlide, (settings.slideDuration + settings.transitionDuration) * 1000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPlaying, slides, currentSlideIndex, settings.slideDuration, settings.transitionDuration, advanceSlide]);

    // Handlers
    const handlePlayPause = () => {
        if (slides.length === 0) return;
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying);

        if (audioRef.current) {
            if (nextIsPlaying) {
                const startTime = currentSlideIndex * (settings.slideDuration + settings.transitionDuration);
                // This logic is sound. It sets the start time correctly, even if metadata isn't loaded.
                if (audioRef.current.duration && isFinite(audioRef.current.duration)) {
                    audioRef.current.currentTime = startTime % audioRef.current.duration;
                } else {
                    audioRef.current.currentTime = 0;
                }
                // The key change is to handle the promise returned by play()
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Audio playback failed:", e);
                        // Revert the state if playing failed, so the UI is not stuck in "playing" mode
                        setIsPlaying(false);
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    };

    const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const files = Array.from(event.target.files);
            const newSlides: ImageSlide[] = files.map((file: File) => ({
                id: `${file.name}-${Date.now()}`,
                file,
                objectUrl: URL.createObjectURL(file),
                motion: 'zoom-in', // Default motion
            }));
            setSlides(prev => [...prev, ...newSlides]);
        }
    };
    
    const handleMusicUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setMusicFile(file);
            setMusicUrl(URL.createObjectURL(file));
        }
    };

    const handleSettingsChange = (field: keyof SlideshowSettings, value: string | number) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleSlideMotionChange = (id: string, motion: MotionEffect) => {
        setSlides(slides.map(slide => slide.id === id ? { ...slide, motion } : slide));
    };

    const handleRemoveSlide = (id: string) => {
        const slideToRemove = slides.find(s => s.id === id);
        if (slideToRemove) URL.revokeObjectURL(slideToRemove.objectUrl);
    
        const newSlides = slides.filter(slide => slide.id !== id);
    
        if (newSlides.length === 0) {
            setIsPlaying(false);
        }
    
        // Adjust index *before* setting new slides array to prevent out-of-bounds access
        if (currentSlideIndex >= newSlides.length) {
            setCurrentSlideIndex(Math.max(0, newSlides.length - 1));
        }
    
        setSlides(newSlides);
    };

    const applyRandomMotionToAll = () => {
        setSlides(slides.map(slide => ({ ...slide, motion: getRandomMotion() })));
    };

    const currentSlide = slides[currentSlideIndex];

    // --- Video Export Logic ---

    const drawSlideWithMotion = (ctx: CanvasRenderingContext2D, width: number, height: number, slide: ImageSlide, img: HTMLImageElement, progress: number) => {
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);

        let scale = 1.15;
        let dx = 0;
        let dy = 0;
        let rotation = 0;

        switch (slide.motion) {
            case 'zoom-in': scale = 1 + progress * 0.15; break;
            case 'zoom-out': scale = 1.15 - progress * 0.15; break;
            case 'pan-left': dx = (0.5 - progress) * (width * 0.1); break;
            case 'pan-right': dx = (progress - 0.5) * (width * 0.1); break;
            case 'pan-up': dy = (0.5 - progress) * (height * 0.1); break;
            case 'pan-down': dy = (progress - 0.5) * (height * 0.1); break;
            case 'rotate': scale = 1.2; rotation = (progress - 0.5) * 2 * (Math.PI / 180); break;
            case 'none': scale = 1.0; break;
        }

        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        const canvasAspectRatio = width / height;
        let renderWidth, renderHeight, xOffset, yOffset;

        if (imgAspectRatio > canvasAspectRatio) {
            renderHeight = height * scale;
            renderWidth = renderHeight * imgAspectRatio;
        } else {
            renderWidth = width * scale;
            renderHeight = renderWidth / imgAspectRatio;
        }
        
        xOffset = (width - renderWidth) / 2 + dx;
        yOffset = (height - renderHeight) / 2 + dy;

        ctx.translate(width / 2, height / 2);
        ctx.rotate(rotation);
        ctx.translate(-width / 2, -height / 2);
        ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);
        ctx.restore();
    };

    const handleExport = async () => {
        if (slides.length === 0 || isExporting) return;
    
        setIsExporting(true);
        setExportProgress('Initialisation...');
    
        const WIDTH = 1280;
        const HEIGHT = 720;
        const FPS = 30;
    
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
    
        if (!ctx) {
            alert("Contexte canvas non disponible. Impossible d'exporter la vidéo.");
            setIsExporting(false);
            return;
        }
    
        const stream = canvas.captureStream(FPS);
        
        let exportAudio: HTMLAudioElement | null = null;
    
        // Audio setup
        if (musicUrl) {
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
                // Create a new, separate audio element for export to prevent conflicts with the UI player
                exportAudio = new Audio(musicUrl);
    
                // Wait for the audio to be ready before proceeding
                await new Promise<void>((resolve, reject) => {
                    if (!exportAudio) {
                        reject(new Error("Audio element not created."));
                        return;
                    }
                    exportAudio.oncanplaythrough = () => resolve();
                    exportAudio.onerror = () => reject(new Error("Impossible de charger l'audio pour l'exportation."));
                    setTimeout(() => reject(new Error("Le chargement de l'audio a expiré.")), 10000); // 10s timeout
                });
    
                const sourceNode = audioCtx.createMediaElementSource(exportAudio);
                const gainNode = audioCtx.createGain();
                const destNode = audioCtx.createMediaStreamDestination();
                
                sourceNode.connect(gainNode);
                gainNode.connect(destNode);
    
                const [audioTrack] = destNode.stream.getAudioTracks();
                if (audioTrack) {
                    stream.addTrack(audioTrack);
                }
                
                exportAudio.loop = musicBehavior === 'loop';
                exportAudio.currentTime = 0;
                
                // Mute the main player to avoid double audio if it was somehow playing
                if(audioRef.current) audioRef.current.muted = true;
                
                exportAudio.play();
    
                const totalSlideshowDuration = slides.length * (settings.slideDuration + settings.transitionDuration);
                const musicDuration = exportAudio.duration;
    
                if (musicBehavior === 'fade' && totalSlideshowDuration < musicDuration) {
                    const FADE_DURATION = Math.min(2, settings.transitionDuration);
                    const fadeStartTime = totalSlideshowDuration - FADE_DURATION;
                    
                    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
                    if (fadeStartTime > 0) {
                        gainNode.gain.setValueAtTime(1, audioCtx.currentTime + fadeStartTime);
                    }
                    gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + totalSlideshowDuration);
                }
    
            } catch (e) {
                console.error("Error setting up audio for export:", e);
                setExportProgress("La configuration audio a échoué. Exportation sans audio.");
                if (exportAudio) {
                    exportAudio.pause();
                    exportAudio = null;
                }
            }
        }
    
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
    
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diaporama.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setIsExporting(false);
            setExportProgress('');
    
            // Clean up the temporary export audio element
            if (exportAudio) {
                exportAudio.pause();
                exportAudio = null;
            }
    
            // Reset the main UI audio player to its initial state
            if(audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.muted = false;
            }
        };
    
        recorder.start();
    
        // --- Rendering Logic ---
        const loadedImages = await Promise.all(
            slides.map(slide => new Promise<HTMLImageElement>(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(new Image()); // Resolve with blank image on error
                img.src = slide.objectUrl;
            }))
        );

        const period = settings.slideDuration + settings.transitionDuration;
        const totalDuration = slides.length * period;
        let frame = 0;

        const render = () => {
            const elapsed = frame / FPS;

            if (elapsed >= totalDuration) {
                recorder.stop();
                return;
            }
            
            const slideIndex = Math.floor(elapsed / period);
            const timeInPeriod = elapsed % period;

            setExportProgress(`Rendu de la photo ${slideIndex + 1} sur ${slides.length}... (${Math.round((elapsed/totalDuration)*100)}%)`);

            const currentSlide = slides[slideIndex];
            const currentImage = loadedImages[slideIndex];

            if (timeInPeriod < settings.slideDuration || settings.transitionDuration === 0) {
                 const progress = timeInPeriod / settings.slideDuration;
                 drawSlideWithMotion(ctx, WIDTH, HEIGHT, currentSlide, currentImage, progress);
            } else { // Transition phase
                const nextSlideIndex = (slideIndex + 1);
                const transitionProgress = (timeInPeriod - settings.slideDuration) / settings.transitionDuration;
                
                if (nextSlideIndex >= slides.length) { // End of last slide
                    drawSlideWithMotion(ctx, WIDTH, HEIGHT, currentSlide, currentImage, 1);
                } else {
                    const nextSlide = slides[nextSlideIndex];
                    const nextImage = loadedImages[nextSlideIndex];
                    // Draw transition
                    ctx.save();
                    drawSlideWithMotion(ctx, WIDTH, HEIGHT, currentSlide, currentImage, 1); // From slide at end state
                    ctx.globalAlpha = transitionProgress;
                    drawSlideWithMotion(ctx, WIDTH, HEIGHT, nextSlide, nextImage, 0); // To slide at start state
                    ctx.restore();
                }
            }

            frame++;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8 flex flex-col relative">
            {isExporting && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center p-8 rounded-lg bg-gray-800 shadow-2xl">
                        <h2 className="text-2xl font-bold text-cyan-400">Exportation de la Vidéo</h2>
                        <p className="mt-4 text-lg">{exportProgress}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                            <div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2.5 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-sm text-gray-400 mt-4">Veuillez garder cet onglet ouvert...</p>
                    </div>
                </div>
            )}
            <header className="text-center mb-6">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                    Créateur de Diaporama Photo
                </h1>
                <p className="mt-2 text-lg text-gray-300">Créez de magnifiques histoires avec vos photos, votre musique et vos effets.</p>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Settings & Controls */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col space-y-6">
                    <h2 className="text-xl font-bold border-b border-gray-700 pb-2">Contrôles & Paramètres</h2>
                    {/* Image & Music Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">1. Téléchargez des Photos</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">2. Ajoutez une Musique de Fond</label>
                         <input type="file" accept="audio/*" onChange={handleMusicUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                        {musicFile && <p className="text-xs text-gray-400 mt-2 truncate">En lecture : {musicFile.name}</p>}
                    </div>
                    
                    {musicFile && (
                         <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Comportement de la Musique</label>
                             <div className="flex items-center space-x-2 bg-gray-700 p-1 rounded-lg">
                                <button onClick={() => setMusicBehavior('loop')} className={`w-full text-center text-sm py-1.5 rounded-md transition-colors ${musicBehavior === 'loop' ? 'bg-cyan-500 text-white font-semibold shadow' : 'hover:bg-gray-600'}`}>
                                    En Boucle
                                </button>
                                <button onClick={() => setMusicBehavior('fade')} className={`w-full text-center text-sm py-1.5 rounded-md transition-colors ${musicBehavior === 'fade' ? 'bg-purple-500 text-white font-semibold shadow' : 'hover:bg-gray-600'}`}>
                                    Fondu de Sortie
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Slideshow Settings */}
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold text-gray-200">3. Personnalisez le Diaporama</h3>
                        <div>
                            <label htmlFor="slideDuration" className="block text-sm">Durée par photo : {settings.slideDuration}s</label>
                            <input type="range" id="slideDuration" min="1" max="10" value={settings.slideDuration} onChange={(e) => handleSettingsChange('slideDuration', parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                        <div>
                            <label htmlFor="transitionDuration" className="block text-sm">Durée de la transition : {settings.transitionDuration}s</label>
                            <input type="range" id="transitionDuration" min="0.5" max="3" step="0.5" value={settings.transitionDuration} onChange={(e) => handleSettingsChange('transitionDuration', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                        </div>
                         <div>
                            <label htmlFor="transitionEffect" className="block text-sm mb-1">Effet de Transition</label>
                            <select id="transitionEffect" value={settings.transitionEffect} onChange={(e) => handleSettingsChange('transitionEffect', e.target.value as TransitionEffect)} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-cyan-500">
                                {transitionOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <button onClick={applyRandomMotionToAll} className="w-full text-sm py-2 px-4 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors">Appliquer un Mouvement Aléatoire à Toutes</button>
                        </div>
                    </div>
                    {/* Export Button */}
                    <div className="pt-4 border-t border-gray-700">
                         <button 
                            onClick={handleExport}
                            disabled={isExporting || slides.length === 0}
                            className="w-full text-lg py-3 px-4 rounded-md bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Exporter la Vidéo
                        </button>
                    </div>
                </div>

                {/* Center Panel: Player & Image List */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                     {/* Player */}
                    <div className="relative w-full aspect-video bg-black rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
                       {slides.length > 0 && currentSlide ? (
                           <>
                                {slides.map((slide, index) => (
                                     <div key={slide.id} className="absolute inset-0 w-full h-full" style={{zIndex: index === currentSlideIndex ? 10 : 5, transition: `opacity ${settings.transitionDuration}s ease-in-out`, opacity: index === currentSlideIndex ? 1 : 0}}>
                                        <img
                                            src={slide.objectUrl}
                                            alt={slide.file.name}
                                            className={`w-full h-full object-cover ${isPlaying && index === currentSlideIndex ? `animate-${slide.motion}` : ''}`}
                                            style={{ animationDuration: `${settings.slideDuration + settings.transitionDuration}s` }}
                                        />
                                     </div>
                                ))}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                                    <button onClick={handlePlayPause} className="bg-black/50 backdrop-blur-sm text-white rounded-full p-3 hover:bg-white/30 transition-colors">
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                </div>
                           </>
                       ) : (
                           <div className="text-center text-gray-500">
                               <UploadIcon />
                               <p className="mt-2">Téléchargez des photos pour commencer</p>
                           </div>
                       )}
                    </div>
                     {/* Image List */}
                    <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex-grow overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Vos Photos ({slides.length})</h2>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                           {slides.map((slide) => (
                               <div key={slide.id} className="flex items-center gap-4 bg-gray-700 p-2 rounded-lg">
                                   <img src={slide.objectUrl} alt="thumbnail" className="w-16 h-10 object-cover rounded-md flex-shrink-0" />
                                   <p className="text-sm truncate flex-grow" title={slide.file.name}>{slide.file.name}</p>
                                   <select value={slide.motion} onChange={e => handleSlideMotionChange(slide.id, e.target.value as MotionEffect)} className="text-sm bg-gray-600 border border-gray-500 rounded p-1 focus:ring-1 focus:ring-cyan-500">
                                       {motionOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                   </select>
                                   <button onClick={() => handleRemoveSlide(slide.id)} className="text-gray-400 hover:text-red-400 transition-colors">
                                       <TrashIcon />
                                   </button>
                               </div>
                           ))}
                        </div>
                    </div>
                </div>
            </main>
            {musicUrl && <audio ref={audioRef} src={musicUrl} loop={musicBehavior === 'loop'} />}
        </div>
    );
};

export default App;
