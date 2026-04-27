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

// Sub-component to handle flip state and animation
function FlipCard({
    slide,
    dragControls,
    variants,
    custom,
    onDragEnd,
}: {
    slide: Slide;
    dragControls: DragControls;
    variants: Variants;
    custom: number;
    onDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
}) {
    const [isFlipped, setIsFlipped] = useState(false);

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
            onTap={() => setIsFlipped(!isFlipped)}
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
                <div className="absolute inset-0 backface-hidden shadow-2xl bg-[#fef7d4] text-stone-900 rotate-y-180 flex items-center justify-center p-8 border-2 border-black">
                    <div className="text-center select-none">
                        <h2 className="font-header text-3xl md:text-5xl mb-4 leading-tight">{slide.title}</h2>
                        <p className="font-body text-xl md:text-3xl mb-4 font-bold">{slide.artist}</p>
                        <div className="text-sm md:text-base opacity-70 font-body uppercase tracking-[0.2em] border-t border-stone-400 pt-4 mt-4 inline-block">
                            {slide.genre} • {slide.year}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export function Slider() {
    const [[page, direction], setPage] = useState([0, 0]);
    const dragControls = useDragControls();

    // Wrap the index using modulo for circular behavior
    const currentIndex = ((page % SLIDES.length) + SLIDES.length) % SLIDES.length;

    const paginate = useCallback((newDirection: number) => {
        setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            paginate(1);
        }, 3800);
        return () => clearInterval(timer);
    }, [paginate]);

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
