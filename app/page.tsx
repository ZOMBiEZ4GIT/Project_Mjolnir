import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <h1 className="text-6xl font-bold text-white">Mjölnir</h1>
        <p className="text-xl text-gray-400">
          Personal Net Worth Tracking Dashboard
        </p>
        <Button size="lg">Get Started</Button>
      </div>
    </div>
  );
}
