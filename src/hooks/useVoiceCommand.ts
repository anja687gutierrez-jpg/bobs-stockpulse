"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type CommandAction =
  | { type: "search"; query: string }
  | { type: "navigate"; page: string }
  | { type: "add_favorite" }
  | { type: "remove_favorite" }
  | { type: "set_alert"; price: number; direction: "above" | "below" }
  | { type: "sign_out" };

export type { CommandAction };

const COMMAND_PATTERNS: {
  pattern: RegExp;
  parse: (match: RegExpMatchArray) => CommandAction;
}[] = [
  {
    pattern: /(?:search|look up|show me|find)\s+(.+)/i,
    parse: (m) => ({ type: "search", query: m[1].trim() }),
  },
  {
    pattern: /(?:go to|show|open)\s+(analysis|metrics|compare)/i,
    parse: (m) => ({ type: "navigate", page: m[1].toLowerCase() }),
  },
  {
    pattern: /(?:add to favo|favorite|save this)/i,
    parse: () => ({ type: "add_favorite" }),
  },
  {
    pattern: /(?:remove|unfavorite)/i,
    parse: () => ({ type: "remove_favorite" }),
  },
  {
    pattern: /(?:set alert|alert)\s*(?:at|above)\s*\$?(\d+\.?\d*)/i,
    parse: (m) => ({ type: "set_alert", price: parseFloat(m[1]), direction: "above" }),
  },
  {
    pattern: /(?:set alert|alert)\s*(?:below)\s*\$?(\d+\.?\d*)/i,
    parse: (m) => ({ type: "set_alert", price: parseFloat(m[1]), direction: "below" }),
  },
  {
    pattern: /(?:sign out|log out)/i,
    parse: () => ({ type: "sign_out" }),
  },
];

function parseCommand(transcript: string): CommandAction | null {
  for (const { pattern, parse } of COMMAND_PATTERNS) {
    const match = transcript.match(pattern);
    if (match) return parse(match);
  }
  return null;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseVoiceCommandOptions {
  onCommand: (action: CommandAction) => void;
}

export function useVoiceCommand({ onCommand }: UseVoiceCommandOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const isSupported = typeof window !== "undefined" && getSpeechRecognitionConstructor() !== null;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    // Clean up any previous instance
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        const action = parseCommand(finalTranscript);
        if (action) {
          onCommandRef.current(action);
        }
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setTranscript("");
    setIsListening(true);
    recognition.start();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported };
}
