import { Slider } from '@/components/Slider';
import { Header } from '@/components/Header';

export default function Home() {
    return (
        <div className="h-screen w-full flex flex-col text-stone-900 font-body overflow-hidden">
            <Header />
            <Slider />
        </div>
    );
}
