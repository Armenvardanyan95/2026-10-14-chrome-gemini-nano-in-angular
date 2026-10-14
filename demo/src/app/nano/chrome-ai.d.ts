// Minimal typings for Chrome's built-in AI APIs (Prompt, Translator, Language Detector).
type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface AIDownloadMonitor extends EventTarget {
  addEventListener(type: 'downloadprogress', listener: (e: ProgressEvent) => void): void;
}

interface AICreateOptions {
  monitor?: (m: AIDownloadMonitor) => void;
  signal?: AbortSignal;
}

type LanguageModelInput = { type: 'text' | 'image' | 'audio'; languages?: string[] };
type LanguageModelContent =
  | { type: 'text'; value: string }
  | { type: 'image'; value: Blob | HTMLCanvasElement | ImageBitmap | HTMLImageElement }
  | { type: 'audio'; value: Blob | AudioBuffer | ArrayBuffer };
type LanguageModelMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | LanguageModelContent[];
};

interface LanguageModelOptions extends AICreateOptions {
  initialPrompts?: LanguageModelMessage[];
  expectedInputs?: LanguageModelInput[];
  expectedOutputs?: LanguageModelInput[];
}

interface LanguageModelPromptOptions {
  responseConstraint?: object;
  signal?: AbortSignal;
}

interface LanguageModelSession {
  prompt(input: string | LanguageModelMessage[], options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(
    input: string | LanguageModelMessage[],
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> & AsyncIterable<string>;
  clone(): Promise<LanguageModelSession>;
  destroy(): void;
}

declare const LanguageModel: {
  availability(options?: LanguageModelOptions): Promise<AIAvailability>;
  create(options?: LanguageModelOptions): Promise<LanguageModelSession>;
};

interface TranslatorOptions extends AICreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
}

declare const Translator: {
  availability(options: TranslatorOptions): Promise<AIAvailability>;
  create(options: TranslatorOptions): Promise<{ translate(text: string): Promise<string>; destroy(): void }>;
};

declare const LanguageDetector: {
  availability(): Promise<AIAvailability>;
  create(options?: AICreateOptions): Promise<{
    detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]>;
    destroy(): void;
  }>;
};
