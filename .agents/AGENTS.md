# HotelOps AI Framework & Rules

As an AI assistant working on the HotelOps project, you MUST strictly adhere to the following framework at all times. Failure to follow these rules will result in UI regressions and functional bugs.

## 1. Strict UI Kit Adherence
- **Never** use raw HTML tags (e.g., `<button>`, `<input>`, `<select>`) or generic Tailwind classes (e.g., `bg-blue-600`, `text-red-500`) for standard interactive elements.
- **Always** import and use the established UI Kit components located in `src/components/ui/` (e.g., `<Button>`, `<Input>`, `<Select>`, `<Card>`, `<Badge>`).
- For destructive actions or confirmations, **always** use the custom `<ConfirmDialog>` component instead of the native browser `window.confirm()`.

## 2. Pattern Matching (Look Before Leaping)
- Before creating a new layout, form, or table, use `grep_search` to investigate how it is implemented on existing pages (like `rooms/page.tsx`).
- Copy the exact layout structure, spacing (e.g., `space-y-6`), and loading skeletons (e.g., `TableSkeleton`, `CardGridSkeleton`) used in the rest of the app to ensure 100% visual consistency.

## 3. Preserve Existing Architecture
- **State Management**: The app uses `useSWR` for data fetching with **Optimistic UI updates** (`mutate(..., { optimisticData: ... })`). If you add new CRUD actions, you MUST implement them using this exact optimistic update pattern.
- Never use lazy fallbacks like `window.location.reload()` to refresh data.

## 4. Mandatory Verification
- Never submit unverified code. 
- Before declaring a feature complete, you must run `npm run build` (or `npx next build`) to verify there are absolutely zero TypeScript or compilation errors.
