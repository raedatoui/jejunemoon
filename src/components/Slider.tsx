'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls, type DragControls, type PanInfo, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import projectsData from '../app/projects.json';
import { ProjectsListSchema, type Project } from '@/lib/schemas';

// Parse and validate the data
const parsedData = ProjectsListSchema.parse(projectsData);

// Add an ID to each project for the slider logic
type Slide = Project & { id: string };

const SLIDES: Slide[] = parsedData.projects.map((project, index) => ({
    ...project,
    id: String(index + 1),
}));

const PLATFORM_ICONS: Record<string, string> = {
    Spotify: '/icons/spotify_without_text.png',
    'Apple Music': '/icons/applemusic_without_text.png',
    iTunes: '/icons/itunes_without_text.png',
    Deezer: '/icons/deezer_without_text.png',
    'Amazon Music': '/icons/amazon_without_text_new_branding.png',
    YouTube: '/icons/youtube_without_text.png',
    SoundCloud: '/icons/soundcloud_without_text.png',
    Tidal: '/icons/tidal_without_text.png',
};

// Sub-component to handle flip state and animation
function FlipCard({
    slide,
    dragControls,
    variants,
    custom,
    onDragEnd,
    isFlipped,
    onToggleFlip,
}: {
    slide: Slide;
    dragControls: DragControls;
    variants: Variants;
    custom: number;
    onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    isFlipped: boolean;
    onToggleFlip: () => void;
}) {
    return (
        <motion.div
            custom={custom}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
            }}
            drag="x"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={onDragEnd}
            className="absolute w-[calc(100%-4rem)] aspect-square md:w-[500px] md:h-[500px] cursor-pointer perspective-1000"
            onTap={(e) => {
                if ((e.target as HTMLElement).closest('a, button')) return;
                onToggleFlip();
            }}
        >
            <motion.div
                className="w-full h-full relative preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
            >
                {/* Front Face - Image/Color Only */}
                {slide.thumb.startsWith('/') ? (
                    <img src={slide.thumb} alt={slide.title} className="absolute inset-0 backface-hidden shadow-2xl w-full h-full object-cover" />
                ) : (
                    <div className={cn('absolute inset-0 backface-hidden shadow-2xl flex items-center justify-center', slide.thumb)} />
                )}

                {/* Back Face - Metadata */}
                <div className="absolute inset-0 backface-hidden shadow-2xl bg-[#fef7d4] text-stone-900 rotate-y-180 flex flex-col items-center justify-center p-6 md:p-8 border-2 border-black overflow-hidden">
                    <div className="text-center select-none">
                        <h2 className="font-header text-2xl md:text-4xl leading-tight">{slide.title}</h2>
                        <p className="font-body text-lg md:text-2xl font-bold">{slide.artist}</p>
                        <div className="text-xs md:text-sm opacity-70 font-body uppercase tracking-[0.2em] mt-2">
                            {slide.genre} • {slide.year}
                        </div>
                    </div>
                    {slide.links.length > 0 && (
                        <ul
                            className="absolute left-0 right-0 bottom-6 md:bottom-8 px-6 flex flex-wrap items-center justify-center gap-3"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {slide.links.map((link) => {
                                const icon = PLATFORM_ICONS[link.platform];
                                return (
                                    <li key={link.url}>
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            title={link.platform}
                                            aria-label={link.platform}
                                            className="block w-7 h-7 md:w-8 md:h-8 opacity-80 hover:opacity-100 hover:scale-110 transition"
                                        >
                                            {icon ? (
                                                <img src={icon} alt={link.platform} className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] uppercase">{link.platform}</span>
                                            )}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

export function Slider() {
    const [[page, direction], setPage] = useState([0, 0]);
    const [isFlipped, setIsFlipped] = useState(false);
    const dragControls = useDragControls();

    // Wrap the index using modulo for circular behavior
    const currentIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length;

    const paginate = useCallback((newDirection: number) => {
        setIsFlipped(false);
        setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
    }, []);

    useEffect(() => {
        if (isFlipped) return;
        const timer = setInterval(() => {
            paginate(1);
        }, 3800);
        return () => clearInterval(timer);
    }, [paginate, isFlipped]);

    const currentSlide = SLIDES[currentIndex];

    // Calculate wrapped indices for prev/next
    const prevIndex = (currentIndex - (1 % SLIDES.length) + SLIDES.length) % SLIDES.length;
    const nextIndex = (currentIndex + 1) % SLIDES.length;

    const prevSlide = SLIDES[prevIndex];
    const nextSlide = SLIDES[nextIndex];

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
        }),
    };

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipe = Math.abs(info.offset.x) * info.velocity.x;

        if (swipe < -10000) {
            paginate(1);
        } else if (swipe > 10000) {
            paginate(-1);
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Main Draggable Area */}
            <div
                className="flex-1 flex items-center justify-center relative md:px-4 cursor-grab active:cursor-grabbing touch-pan-y"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <FlipCard
                        key={page}
                        slide={currentSlide}
                        dragControls={dragControls}
                        variants={variants}
                        custom={direction}
                        onDragEnd={handleDragEnd}
                        isFlipped={isFlipped}
                        onToggleFlip={() => setIsFlipped((prev) => !prev)}
                    />
                </AnimatePresence>
            </div>

            {/* Bottom Interface */}
            <div className="w-full pb-8 z-10">
                {/* Navigation Text Slider */}
                <div className="flex justify-center items-center gap-2 md:gap-12 px-4 md:px-6 py-4 border-t border-stone-200 text-sm uppercase tracking-widest text-stone-500">
                    <button
                        type="button"
                        onClick={() => paginate(-1)}
                        className="flex items-center gap-2 hover:text-black transition-colors p-2 group shrink-0"
                        aria-label="Previous"
                    >
                        <span className="text-xl md:text-2xl">←</span>
                        <span className="hidden md:block group-hover:underline decoration-1 underline-offset-4 truncate max-w-[100px] lg:max-w-[300px]">
                            {prevSlide.title}
                        </span>
                    </button>

                    <div className="text-center text-black px-2 md:px-8 flex-1 md:flex-none flex flex-col justify-center">
                        <span className="font-bold text-base md:text-lg leading-none mb-1">{currentSlide.artist}</span>
                        <span className="text-xs opacity-60 truncate">{currentSlide.title}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => paginate(1)}
                        className="flex items-center gap-2 hover:text-black transition-colors p-2 group shrink-0"
                        aria-label="Next"
                    >
                        <span className="hidden md:block group-hover:underline decoration-1 underline-offset-4 truncate max-w-[100px] lg:max-w-[300px]">
                            {nextSlide.title}
                        </span>
                        <span className="text-xl md:text-2xl">→</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
