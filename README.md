# NutriAI

NutriAI is a React/Vite nutrition tracker with a Node/Express backend and PostgreSQL storage.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and set your PostgreSQL connection string:

   ```bash
   cp .env.example .env
   ```

3. Create the database if it does not exist, then run migrations:

   ```bash
   npm run db:migrate
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5174`, and the backend runs on `http://localhost:4001`.

## Environment

- `DATABASE_URL` is required for PostgreSQL.
- `DATABASE_SCHEMA` is optional and keeps NutriAI tables in a separate schema inside an existing database.
- `DATABASE_SSL=true` can be used for hosted PostgreSQL providers that require SSL.
- `GEMINI_API_KEY` is optional but preferred for AI, photo, and audio features. The default model is `gemini-2.5-flash-lite`.
- `OPENAI_API_KEY` is an optional fallback if Gemini is not configured.
- If no AI key is set, AI features return fallback data so the app remains usable.

## Useful Scripts

- `npm run client` starts only the Vite frontend.
- `npm run server` starts only the Express backend.
- `npm run db:migrate` applies the PostgreSQL schema.
- `npm run build` builds the frontend.
- `npm run lint` runs ESLint.
