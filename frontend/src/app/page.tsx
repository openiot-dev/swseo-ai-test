import { Cpu, Radio, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { VoiceChat } from "@/components/voice-chat";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(120%_100%_at_50%_-20%,oklch(0.97_0.04_280)_0%,transparent_55%),radial-gradient(80%_60%_at_100%_100%,oklch(0.96_0.04_220)_0%,transparent_55%),radial-gradient(80%_60%_at_0%_100%,oklch(0.96_0.04_320)_0%,transparent_55%)] dark:[background:radial-gradient(120%_100%_at_50%_-20%,oklch(0.22_0.07_280)_0%,transparent_55%),radial-gradient(80%_60%_at_100%_100%,oklch(0.20_0.08_220)_0%,transparent_55%),radial-gradient(80%_60%_at_0%_100%,oklch(0.22_0.08_320)_0%,transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background-image:linear-gradient(to_right,oklch(0.5_0_0_/_0.18)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0_/_0.18)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-foreground text-background shadow-sm ring-1 ring-foreground/10">
            <Cpu className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-sm font-semibold tracking-tight">
              Go2 Voice Console
            </div>
            <div className="text-[11px] text-muted-foreground">
              Unitree Go2 EDU · Voice Interaction
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Radio className="size-3 text-emerald-500" />
            Online
          </Badge>
          <Badge variant="secondary" className="gap-1 rounded-full">
            <Sparkles className="size-3 text-amber-500" />
            Claude Sonnet 4.6
          </Badge>
        </div>
      </header>

      <section className="relative z-10 px-6 pb-16 pt-4 md:px-10 md:pt-8 md:pb-24">
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full bg-background/60 px-3 py-1 text-xs ring-1 ring-foreground/10 backdrop-blur-sm"
          >
            <Sparkles className="size-3 text-amber-500" />
            한국어 음성 · 실시간 명령 제어
          </Badge>
          <h1 className="font-heading text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            말하면 움직이는
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
              로봇강아지 음성 콘솔
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-balance text-sm text-muted-foreground md:text-base">
            Unitree Go2 EDU에 음성으로 말을 걸어보세요. 대화도 하고,
            &ldquo;앉아&rdquo; · &ldquo;춤춰&rdquo; · &ldquo;한 바퀴 돌아&rdquo;
            같은 명령에 즉시 반응합니다.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <VoiceChat />
        </div>
      </section>

      <footer className="relative z-10 border-t border-foreground/10 px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} swseo-ai-test</span>
          <span>Built with Next.js · Tailwind · shadcn · Web Speech API</span>
        </div>
      </footer>
    </main>
  );
}
