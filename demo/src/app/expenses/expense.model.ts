export const CATEGORIES = ['food', 'transport', 'lodging', 'entertainment', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

/** What the model extracts from a receipt (text or photo). */
export interface ExpenseDraft {
  merchant: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: string; // ISO 4217, e.g. EUR
  category: Category;
  description: string; // in the receipt's own language
}

export interface Expense extends ExpenseDraft {
  id: string;
  note: string;
  language?: string; // detected language of the description
  translation?: string; // description translated to English
}

export const emptyDraft = (): ExpenseDraft => ({
  merchant: '',
  date: '',
  amount: 0,
  currency: 'EUR',
  category: 'other',
  description: '',
});

/** JSON Schema passed to the Prompt API as `responseConstraint`. */
export const expenseSchema = {
  type: 'object',
  required: ['merchant', 'date', 'amount', 'currency', 'category', 'description'],
  additionalProperties: false,
  properties: {
    merchant: { type: 'string' },
    date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    amount: { type: 'number' },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    category: { type: 'string', enum: [...CATEGORIES] },
    description: { type: 'string' },
  },
};

/** What the command bar turns a sentence into. */
export interface ExpenseCommand {
  action: 'set_category' | 'set_note' | 'delete' | 'none';
  ids: string[];
  category?: Category;
  note?: string;
  reply: string;
}

export const commandSchema = {
  type: 'object',
  required: ['action', 'ids', 'reply'],
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['set_category', 'set_note', 'delete', 'none'] },
    ids: { type: 'array', items: { type: 'string' } },
    category: { type: 'string', enum: [...CATEGORIES] },
    note: { type: 'string' },
    reply: { type: 'string' },
  },
};
