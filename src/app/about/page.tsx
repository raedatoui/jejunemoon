import { Header } from '@/components/Header';

export default function About() {
    return (
        <div className="h-screen w-full flex flex-col text-stone-900 font-body overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-8 md:p-16 max-w-4xl mx-auto w-full mt-8">
                <h1 className="text-4xl font-header mb-8 uppercase tracking-[0.2em] border-b-2 border-black pb-4">About</h1>
                <div className="text-lg leading-relaxed space-y-6">
                    <p>Record label based in Brooklyn, New York.</p>
                </div>
            </main>
        </div>
    );
}
