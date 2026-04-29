"use client";

import { Mail } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function FAQPage() {
  return (
    <div className="flex-1 w-full flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-ruby/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-zinc-900/5 blur-[120px] rounded-full" />

      <main className="flex-1 w-full flex flex-col items-center relative z-10">
        <div className="max-w-4xl w-full px-8 text-center space-y-12">
            <h1 className="text-6xl font-black tracking-tighter uppercase">F.A.Q</h1>
            <p className="text-zinc-500 font-medium text-xl max-w-2xl mx-auto">
                Central de ajuda e perguntas frequentes. Em breve, novos conteúdos para auxiliar sua gestão.
            </p>
        </div>
      </main>

      <Footer accentColor="#8B5CF6" />
    </div>
  );
}
