import { Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, min, pattern, required } from '@angular/forms/signals';
import { DecimalPipe, JsonPipe, PercentPipe } from '@angular/common';
import { CATEGORIES, ExpenseCommand, emptyDraft } from './expenses/expense.model';
import { ExpenseStore } from './expenses/expense.store';
import { NanoService } from './nano/nano.service';

@Component({
  selector: 'app-root',
  imports: [FormField, DecimalPipe, JsonPipe, PercentPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly nano = inject(NanoService);
  protected readonly store = inject(ExpenseStore);
  protected readonly categories = CATEGORIES;

  protected readonly pasted = signal('');
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  // Signal Form: the model fills `draft`, the user reviews and saves.
  protected readonly draft = signal(emptyDraft());
  protected readonly expenseForm = form(this.draft, (p) => {
    required(p.merchant);
    required(p.date);
    min(p.amount, 0.01);
    maxLength(p.currency, 3);
    pattern(p.currency, /^[A-Z]{3}$/);
  });

  protected readonly command = signal('');
  protected readonly lastCommand = signal<ExpenseCommand | null>(null);

  protected enable() {
    return this.task('Loading Gemini Nano…', () => this.nano.enable());
  }

  // 1. Text → form
  protected fromText() {
    return this.task('Reading text…', async () => {
      this.photoUrl.set(null);
      this.draft.set(await this.nano.extractExpense(this.pasted()));
    });
  }

  // 2. Photo → form
  protected fromPhoto(file: Blob | null | undefined) {
    if (!file?.type.startsWith('image/')) return;
    return this.task('Reading photo…', async () => {
      const url = URL.createObjectURL(file);
      this.photoUrl.set(url);
      this.draft.set(await this.nano.extractExpense(await toCanvas(url)));
    });
  }

  protected onPaste(event: ClipboardEvent) {
    const image = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (image) {
      event.preventDefault();
      this.fromPhoto(image);
    }
  }

  // 4. Save, then detect the language and translate if needed
  protected save() {
    if (this.expenseForm().invalid()) return;
    const expense = this.store.add(this.draft());
    this.draft.set(emptyDraft());
    this.pasted.set('');
    this.photoUrl.set(null);

    return this.task('Detecting language…', async () => {
      if (!expense.description) return;
      const language = await this.nano.detectLanguage(expense.description);
      this.store.patch(expense.id, { language });
      if (language !== 'en' && language !== 'und') {
        this.busy.set(`Translating from ${language}…`);
        const translation = await this.nano.translateToEnglish(expense.description, language);
        this.store.patch(expense.id, { translation });
      }
    });
  }

  // 3. Command bar
  protected runCommand() {
    return this.task('Thinking…', async () => {
      const cmd = await this.nano.parseCommand(this.command(), this.store.expenses());
      this.lastCommand.set(cmd);
      this.store.apply(cmd);
      this.command.set('');
    });
  }

  private async task(label: string, fn: () => Promise<void>) {
    this.busy.set(label);
    this.error.set(null);
    try {
      await fn();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.busy.set(null);
    }
  }
}

/** The Prompt API takes a canvas; drawing to one also handles SVG and odd formats. */
async function toCanvas(url: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
