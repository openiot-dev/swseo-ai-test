"use client";

import {
  ArrowDown,
  ArrowUp,
  Footprints,
  Hand,
  Loader2,
  Megaphone,
  Mic,
  MicOff,
  PartyPopper,
  Rabbit,
  RotateCw,
  Square,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RobotDog,
  type DogAction,
  type DogComm,
  type DogPose,
} from "@/components/robot-dog";
import { COMMAND_LABEL, parseCommand, type RobotCommand } from "@/lib/commands";
import { cn } from "@/lib/utils";
import {
  cancelSpeech,
  getSpeechRecognition,
  speak,
  speechSynthesisSupported,
  type SpeechRecognitionInstance,
} from "@/lib/speech";

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  command?: RobotCommand;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const SYSTEM_PROMPT = [
  "You are the on-board voice assistant of a Unitree Go2 EDU quadruped robot dog.",
  "Reply in the same language the user used (default: Korean). Keep replies short — 1-2 sentences — since they will be spoken aloud.",
  "If the user issues a movement command, acknowledge it warmly and naturally include the matching Korean action word so the frontend can detect it:",
  "앉기(sit) / 일어나기(stand) / 엎드리기(lay) / 걷기(walk) / 짖기(bark) / 춤(dance) / 회전(spin) / 악수(shake) / 점프(jump) / 정지(stop).",
  'Examples — user: "앉아" → "네, 앉을게요!"; user: "한 바퀴 돌아봐" → "좋아요, 회전합니다!"; user: "오늘 날씨 어때?" → just answer normally without any action word.',
  "Be friendly, like a curious robot puppy.",
].join(" ");

interface AnthropicMessageResponse {
  content?: Array<{ type: string; text?: string }>;
  reply?: string;
}

function extractReply(data: AnthropicMessageResponse): string {
  if (typeof data.reply === "string" && data.reply.trim()) return data.reply.trim();
  if (Array.isArray(data.content)) {
    return data.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text!)
      .join("\n")
      .trim();
  }
  return "";
}

const TRANSIENT_ACTIONS: Partial<Record<RobotCommand, { action: DogAction; ms: number }>> =
  {
    walk: { action: "walk", ms: 3200 },
    bark: { action: "bark", ms: 1500 },
    dance: { action: "dance", ms: 3000 },
    spin: { action: "spin", ms: 1500 },
    shake: { action: "shake", ms: 1100 },
    jump: { action: "jump", ms: 900 },
  };

const QUICK_COMMANDS: { cmd: RobotCommand; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { cmd: "sit", icon: ArrowDown, label: "앉아" },
  { cmd: "stand", icon: ArrowUp, label: "일어나" },
  { cmd: "lay", icon: Rabbit, label: "엎드려" },
  { cmd: "walk", icon: Footprints, label: "걸어" },
  { cmd: "bark", icon: Megaphone, label: "짖어" },
  { cmd: "dance", icon: PartyPopper, label: "춤춰" },
  { cmd: "spin", icon: RotateCw, label: "돌아" },
  { cmd: "shake", icon: Hand, label: "악수" },
];

export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interim, setInterim] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pose, setPose] = useState<DogPose>("stand");
  const [action, setAction] = useState<DogAction>("idle");
  const [lastCommand, setLastCommand] = useState<RobotCommand | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const actionTimerRef = useRef<number | null>(null);

  const sttSupported = useMemo(() => getSpeechRecognition() !== null, []);
  const ttsSupported = useMemo(() => speechSynthesisSupported(), []);

  const comm: DogComm = isRecording
    ? "listening"
    : isThinking
      ? "thinking"
      : isSpeaking
        ? "speaking"
        : "idle";

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interim, isThinking]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      cancelSpeech();
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    };
  }, []);

  const applyCommand = useCallback((cmd: RobotCommand) => {
    setLastCommand(cmd);
    if (actionTimerRef.current) {
      clearTimeout(actionTimerRef.current);
      actionTimerRef.current = null;
    }

    if (cmd === "sit") {
      setPose("sit");
      setAction("idle");
      return;
    }
    if (cmd === "lay") {
      setPose("lay");
      setAction("idle");
      return;
    }
    if (cmd === "stand" || cmd === "stop") {
      setPose("stand");
      setAction("idle");
      return;
    }

    const transient = TRANSIENT_ACTIONS[cmd];
    if (!transient) return;
    setPose("stand");
    setAction(transient.action);
    actionTimerRef.current = window.setTimeout(() => {
      setAction("idle");
      actionTimerRef.current = null;
    }, transient.ms);
  }, []);

  const sendToLLM = async (history: Message[], userText: string) => {
    if (!API_BASE_URL) {
      setError("NEXT_PUBLIC_API_BASE_URL is not configured.");
      return;
    }
    setIsThinking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: [
            ...history.map(({ role, content }) => ({ role, content })),
            { role: "user", content: userText },
          ],
        }),
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`API ${response.status}: ${detail}`);
      }
      const data = (await response.json()) as AnthropicMessageResponse;
      const reply = extractReply(data);
      if (!reply) throw new Error("Empty reply from server");

      const replyCommand = parseCommand(reply);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          command: replyCommand ?? undefined,
        },
      ]);

      if (ttsSupported) {
        setIsSpeaking(true);
        await speak(reply, "ko-KR");
        setIsSpeaking(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsThinking(false);
    }
  };

  const startRecording = () => {
    setError(null);
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("이 브라우저는 음성 인식을 지원하지 않습니다. (Chrome/Edge 권장)");
      return;
    }
    cancelSpeech();
    setIsSpeaking(false);

    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.continuous = false;
    finalTranscriptRef.current = "";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) finalTranscriptRef.current += finalText;
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterim("");
      const text = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (!text) return;

      const cmd = parseCommand(text);
      if (cmd) applyCommand(cmd);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        command: cmd ?? undefined,
      };
      setMessages((prev) => {
        const next = [...prev, userMsg];
        void sendToLLM(prev, text);
        return next;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  const stopSpeaking = () => {
    cancelSpeech();
    setIsSpeaking(false);
  };

  return (
    <div className="space-y-5">
      <RobotDog pose={pose} action={action} comm={comm} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Voice Chat</CardTitle>
              <CardDescription>
                음성으로 대화하거나 명령하면 로봇강아지가 즉시 반응합니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant={sttSupported ? "secondary" : "destructive"}>
                STT {sttSupported ? "OK" : "미지원"}
              </Badge>
              <Badge variant={ttsSupported ? "secondary" : "destructive"}>
                TTS {ttsSupported ? "OK" : "미지원"}
              </Badge>
              {lastCommand && (
                <Badge className="gap-1">
                  <Footprints className="size-3" />
                  {COMMAND_LABEL[lastCommand]}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map(({ cmd, icon: Icon, label }) => (
              <Button
                key={cmd}
                size="sm"
                variant="outline"
                onClick={() => applyCommand(cmd)}
                className="rounded-full"
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[360px] rounded-md border bg-muted/30 p-4">
            {messages.length === 0 && !interim && !isThinking ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    command={m.command}
                  />
                ))}
                {interim && (
                  <MessageBubble role="user" content={interim} pending />
                )}
                {isThinking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    생각 중…
                  </div>
                )}
                <div ref={scrollEndRef} />
              </div>
            )}
          </ScrollArea>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={!sttSupported || isThinking}
              >
                <Mic />
                말하기
              </Button>
            ) : (
              <Button size="lg" variant="destructive" onClick={stopRecording}>
                <Square />
                녹음 중지
              </Button>
            )}
            {isSpeaking && (
              <Button size="lg" variant="outline" onClick={stopSpeaking}>
                <MicOff />
                음성 중지
              </Button>
            )}
            {isRecording && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                듣는 중…
              </span>
            )}
            {isSpeaking && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="size-4" />
                재생 중…
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <p>마이크로 말하거나 위 버튼으로 명령해 보세요.</p>
      <p className="text-xs">
        예) &ldquo;앉아&rdquo;, &ldquo;춤춰봐&rdquo;, &ldquo;한 바퀴 돌아&rdquo;,
        &ldquo;악수&rdquo;
      </p>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pending,
  command,
}: {
  role: Role;
  content: string;
  pending?: boolean;
  command?: RobotCommand;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-1.5 rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background border",
          pending && "opacity-60 italic",
        )}
      >
        <div>{content}</div>
        {command && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              isUser
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            <Footprints className="size-3" />
            명령: {COMMAND_LABEL[command]}
          </div>
        )}
      </div>
    </div>
  );
}
