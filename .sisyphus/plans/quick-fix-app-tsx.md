# Quick Fix: App.tsx TypeScript Errors

## Changes Required

### 1. Remove unused import (Line 5)
```typescript
// DELETE this line:
import TranslationResult from './components/TranslationResult'
```

### 2. Fix historyStore destructuring (Line 20)
```typescript
// BEFORE:
const { loaded: historyLoaded, history } = useHistoryStore()

// AFTER:
const { history } = useHistoryStore()
```

### 3. Fix history badge condition (Line 78)
```typescript
// BEFORE:
{historyLoaded && history.length > 0 && (

// AFTER:
{history.length > 0 && (
```

## Files to Modify
- `/Users/chuangzhou/code/dict-win/src/App.tsx`

## Verification
After changes, run:
```bash
npm run build
```

Expected: Build should succeed without TypeScript errors.
