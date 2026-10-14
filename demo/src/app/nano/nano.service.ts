import { Injectable, signal } from '@angular/core';
import {
  Expense,
  ExpenseCommand,
  ExpenseDraft,
  commandSchema,
  expenseSchema,
} from '../expenses/expense.model';

const SESSION_OPTIONS: LanguageModelOptions = {
  expectedInputs: [{ type: 'text', languages: ['en', 'es', 'ja'] }, { type: 'image' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

const SYSTEM_PROMPT = [
  'You read receipts and booking emails for a travel expense app.',
  'Extract one expense. Use the total amount actually paid, including tax.',
  'Dates are YYYY-MM-DD. Currency is a 3-letter ISO code (¥ is JPY, € is EUR).',
  'Keep "description" short and in the original language of the receipt.',
].join('\n');

export type NanoStatus = AIAvailability | 'unsupported' | 'checking' | 'ready';

@Injectable({ providedIn: 'root' })
export class NanoService {
  readonly status = signal<NanoStatus>('checking');
  readonly downloadProgress = signal(0);
  /** Raw model output as it streams in, shown on screen. */
  readonly stream = signal('');

  private base?: LanguageModelSession;

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability() {
    if (!('LanguageModel' in self)) {
      this.status.set('unsupported');
      return;
    }
    this.status.set(await LanguageModel.availability(SESSION_OPTIONS));
  }

  /** Must run from a click: creating a session can start the model download. */
  async enable() {
    this.base = await LanguageModel.create({
      ...SESSION_OPTIONS,
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      monitor: (m) =>
        m.addEventListener('downloadprogress', (e) => {
          this.status.set('downloading');
          this.downloadProgress.set(e.loaded);
        }),
    });
    this.status.set('ready');
  }

  /** Text or image in, typed expense out. */
  async extractExpense(input: string | HTMLCanvasElement): Promise<ExpenseDraft> {
    const content: LanguageModelContent[] =
      typeof input === 'string'
        ? [{ type: 'text', value: `Extract the expense from this text:\n\n${input}` }]
        : [
            { type: 'text', value: 'Extract the expense from this receipt photo.' },
            { type: 'image', value: input },
          ];
    const json = await this.run([{ role: 'user', content }], expenseSchema);
    return JSON.parse(json);
  }

  /** A sentence in, a typed action out. */
  async parseCommand(sentence: string, expenses: Expense[]): Promise<ExpenseCommand> {
    const list = expenses
      .map((e) => `${e.id}: ${e.date} ${e.merchant}, ${e.amount} ${e.currency}, ${e.category}`)
      .join('\n');
    const prompt = [
      'Current expenses, oldest first:',
      list || '(none)',
      '',
      "Turn the user's request into one action on these expenses.",
      '- "set_category" needs "category"; "set_note" needs "note".',
      '- Use "none" if the request does not fit.',
      '- "reply" is one short sentence describing what you did.',
      '',
      `Request: ${sentence}`,
    ].join('\n');
    const json = await this.run([{ role: 'user', content: prompt }], commandSchema);
    return JSON.parse(json);
  }

  async detectLanguage(text: string): Promise<string> {
    const detector = await LanguageDetector.create();
    const [top] = await detector.detect(text);
    detector.destroy();
    return top?.detectedLanguage ?? 'und';
  }

  async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
    const translator = await Translator.create({ sourceLanguage, targetLanguage: 'en' });
    const result = await translator.translate(text);
    translator.destroy();
    return result;
  }

  /** Each request runs in a fresh clone, so earlier receipts don't leak into later answers. */
  private async run(messages: LanguageModelMessage[], schema: object): Promise<string> {
    if (!this.base) throw new Error('Call enable() first');
    const session = await this.base.clone();
    this.stream.set('');
    try {
      for await (const chunk of session.promptStreaming(messages, { responseConstraint: schema })) {
        this.stream.update((s) => s + chunk);
      }
      return this.stream();
    } finally {
      session.destroy();
    }
  }
}
