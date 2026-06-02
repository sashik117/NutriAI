# NutriAI Architecture

NutriAI is structured as a small production-style fullstack app. The goal is to keep AI calls, nutrition rules, persistence, and UI rendering separated so the project stays understandable and portfolio-ready.

## High-Level Pipeline

```text
User action
  -> UI component
  -> React hook
  -> domain model / frontend service
  -> API repository
  -> Express route
  -> backend service / AI service
  -> PostgreSQL
  -> TanStack Query refresh
  -> UI update
```

## Frontend Layers

### UI Components

Components render the interface and receive already-prepared state/actions from hooks. Heavy logic is intentionally moved out of screens and shared widgets.

Examples:

- `src/components/food/FoodResultCard.jsx`
- `src/components/food/BarcodeScanner.jsx`
- `src/components/food/LiveCameraAnalyzer.jsx`
- `src/components/meal-plan/ShoppingList.jsx`

### Hooks

Hooks own interaction state, async actions, timers, camera lifecycle, form flows, and mutation coordination.

Examples:

- `src/hooks/useFoodResultEditor.js`
- `src/hooks/useBarcodeScanner.js`
- `src/hooks/usePlateScanner.js`
- `src/hooks/useAuthScreen.js`
- `src/hooks/useWaterReminder.js`
- `src/hooks/useBodyMeasurements.js`

### Domain Models

Domain files contain deterministic business rules and normalization that can be tested without React.

Examples:

- `src/domain/nutrition/MacroCalculator.js`
- `src/domain/food/foodResultModel.js`
- `src/domain/food/editMealModel.js`
- `src/domain/meal-plan/mealPlanModel.js`
- `src/domain/health/activityModel.js`
- `src/domain/progress/bodyMeasurementModel.js`

### Services

Services handle AI-facing workflows, API-facing DTO shaping, barcode/product lookup, voice transcription, recipe suggestions, shopping-list generation, and frontend repository access.

Examples:

- `src/services/plateVisionService.js`
- `src/services/barcodeScannerService.js`
- `src/services/productSearchService.js`
- `src/services/mealPlanService.js`
- `src/services/repositories.js`

## Backend Layers

### API Routes

`server/index.js` owns HTTP endpoints, auth/session behavior, uploads, and response handling.

### Backend Services

Backend services keep AI provider calls and nutrition business rules away from route handlers.

Examples:

- `server/services/aiService.js`
- `server/services/nutritionService.js`

### Backend Domain Rules

`server/domain/nutritionRules.js` centralizes AI-output repair, safe fallback values, nutrition normalization, and JSON coercion.

### Persistence

PostgreSQL is accessed through the server DB layer and schema migrations:

- `server/db.js`
- `server/schema.sql`
- `server/migrate.js`

## AI Boundaries

AI is treated as an external data source, not as business logic.

- Gemini receives strict prompts and JSON schemas.
- AI output is normalized before it reaches the UI.
- Empty, generic, or zero nutrition values are repaired through nutrition rules.
- UI never renders raw JSON or markdown from AI responses.

## Scanner Flow

### Plate Scanner

```text
Camera / gallery image
  -> usePlateScanner
  -> plateVisionService
  -> Gemini Vision
  -> normalizePlateResult
  -> editable FoodResultCard
  -> save food log
```

### Barcode Scanner

```text
BarcodeDetector / label photo
  -> useBarcodeScanner
  -> OpenFoodFacts lookup
  -> Gemini label fallback if missing
  -> normalized product result
  -> editable FoodResultCard
  -> save food log
```

## Verification

Current checks:

```bash
npm run test:domain
npm run lint
npm run typecheck
npm run build
npm run test:smoke
npm run test:e2e
```

`test:domain` checks deterministic nutrition/auth/progress/shopping-list models. `test:smoke` checks that the local frontend routes and backend health endpoint respond before deployment. `test:e2e` uses Playwright to verify mobile routes and the core flow: describe food, receive an editable AI result, save it, and see it in the diary.
