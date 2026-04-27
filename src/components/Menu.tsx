import Link from 'next/link';

export function Menu() {
    return (
        <nav className="flex text-left flex-col text-sm uppercase tracking-[0.2em] text-stone-900  shadow-2xl border-2  border-t-black border-l-black border-r-0 min-w-[300px]  bg-[#fef7d4]">
            <Link href="/about" className="hover:bg-stone-200 transition-colors p-6 border-b border-black font-header font-normal">
                About
            </Link>
            <Link href="/contact" className="hover:bg-stone-200 transition-colors p-6 font-header font-normal">
                Contact
            </Link>
        </nav>
    );
}
