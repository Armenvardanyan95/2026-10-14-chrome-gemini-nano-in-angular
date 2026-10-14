import { Injectable, computed, signal } from '@angular/core';
import { Expense, ExpenseCommand, ExpenseDraft } from './expense.model';

@Injectable({ providedIn: 'root' })
export class ExpenseStore {
  private nextId = 1;
  readonly expenses = signal<Expense[]>([]);

  readonly totals = computed(() => {
    const byCurrency = new Map<string, number>();
    for (const e of this.expenses()) {
      byCurrency.set(e.currency, (byCurrency.get(e.currency) ?? 0) + e.amount);
    }
    return [...byCurrency].map(([currency, amount]) => ({ currency, amount }));
  });

  add(draft: ExpenseDraft): Expense {
    const expense: Expense = { ...draft, id: `e${this.nextId++}`, note: '' };
    this.expenses.update((list) => [...list, expense]);
    return expense;
  }

  patch(id: string, changes: Partial<Expense>) {
    this.expenses.update((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  }

  /** Applies a typed command produced by the model. */
  apply(cmd: ExpenseCommand) {
    const ids = new Set(cmd.ids);
    switch (cmd.action) {
      case 'delete':
        this.expenses.update((list) => list.filter((e) => !ids.has(e.id)));
        break;
      case 'set_category':
        if (cmd.category) {
          const category = cmd.category;
          this.expenses.update((list) => list.map((e) => (ids.has(e.id) ? { ...e, category } : e)));
        }
        break;
      case 'set_note':
        this.expenses.update((list) =>
          list.map((e) => (ids.has(e.id) ? { ...e, note: cmd.note ?? '' } : e)),
        );
        break;
    }
  }
}
