'use client';

import { useState } from 'react';
import { Menu } from './Menu';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="flex justify-between items-start z-20 w-full">
            <div className="p-4">
                <Link href="/">
                    <img src="/logo.png" alt="JeJune Moon" className="h-36 w-36 object-contain" />
                </Link>
            </div>

            <div className="mt-16  flex flex-col items-end relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="px-6 font-header pointer text-xl tracking-widest uppercase hover:opacity-70 transition-opacity z-30"
                >
                    {isOpen ? 'Close' : 'Menu'}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="absolute top-12 right-0 z-20"
                        >
                            <Menu />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
}
