# Nano Expenses — Gemini Nano in Angular
Run: `npm install`, then `npm start`, then open http://localhost:4200 in desktop Chrome 148+ (about 22 GB of free disk space; image input needs a GPU).
Click **Enable on-device AI** once (the first time downloads Gemini Nano). Then try the files in `samples/`: paste `hotel-email.txt` or `restaurante-es.txt`, and drop in `ramen-receipt-ja.svg`.
Command bar: "mark the last two as client dinner", "set the hotel to lodging", "delete the ramen".
Code: `src/app/nano/nano.service.ts` (all AI calls), `expenses/expense.model.ts` (JSON schemas), `app.ts` (Signal Form + flow).
