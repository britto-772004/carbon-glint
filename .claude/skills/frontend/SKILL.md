---
name: frontend
description: Build or change the Carbon Glint web app (apps/web). Use whenever creating or editing a page, screen, container, component, form, MUI styling/theme, API call from the UI, or web test. Enforces container/component split, Material UI for all UI, and the generated @carbon-glint/sdk as the only API client.
---

# Frontend: containers, components, Material UI, generated SDK

Stack: React 19 · Vite · TypeScript · Material UI (MUI v9) · TanStack Query · `@carbon-glint/sdk` (generated from OpenAPI) · Vitest + Testing Library + MSW. Served by Caddy on the same VM.

## Non-negotiable rules (ESLint enforces most of them)

1. **The API is reached only through `@carbon-glint/sdk`.** No `fetch`, axios or hand-built URLs. No hand-written request/response types: import them from the SDK (`import type { Health } from '@carbon-glint/sdk'`). If an endpoint or field is missing, change the OpenAPI spec first (**backend** skill), then `pnpm generate`.
2. **Containers** (`src/containers/XContainer.tsx`) hold **state and API calls only**:
   - React Query hooks with generated options (`useQuery(getXOptions(...))`, `useMutation(createXMutation())`), `useState` for UI state, navigation, and derived values.
   - They render **exactly one component** and pass props down. No MUI, no HTML elements, no styling. (ESLint blocks `@mui/*` in containers.)
3. **Components** (`src/components/X/X.tsx`) are **props in, JSX out**:
   - Only conditional rendering (`if (isLoading) return …`, ternaries, `&&`, `.map`).
   - No `useState`, `useEffect`, `useReducer` or other stateful hooks. No SDK calls or React Query. Only `import type` from the SDK. (All enforced by ESLint.)
   - Events go up through callback props (`onSubmit`, `onRetry`, `onChange`).
   - Small private sub-components in the same file are fine (see `Row` in `HealthStatus.tsx`).
4. **All UI is Material UI.** Use MUI components and `sx`. No raw CSS files, no other UI or CSS libraries, no hard-coded colors. Theme tokens go in `src/theme.ts`.
   - Import by path: `import Button from '@mui/material/Button'`, never `import { Button } from '@mui/material'` (lint error).
   - Use `Stack` or `Grid` for layout, `Typography` for text, `Alert` for errors, `CircularProgress` or `Skeleton` for loading.
   - Accessibility: give interactive elements accessible names, and give loading regions `role="status"`. Tests query by role, so this matters.
5. **No hand-written DTOs.** Component prop types reuse SDK types or are UI-specific (`isLoading`, `error?: string`, callbacks).

## MUI docs via MCP

The project `.mcp.json` registers the official MUI MCP server (`mui-mcp`). Before using an MUI component or API you're unsure of, look it up with its **`fetchDocs`** tool (for example `https://mui.com/material-ui/llms.txt`, then the component's page) rather than guessing. MUI v9 removed or renamed several older props. Don't use `generateReactCode`: it needs a paid key, and its output wouldn't follow the container/component split.

## File layout

```
src/
  containers/ProjectListContainer.tsx        state + SDK
  containers/ProjectListContainer.test.tsx   container test (MSW)
  components/ProjectList/ProjectList.tsx      MUI, props only
  components/ProjectList/ProjectList.test.tsx component test (props only)
  lib/        sdk.ts (configureSdk), queryClient.ts, errors.ts (toErrorMessage)
  providers/  AppProviders.tsx (QueryClient + MUI theme + CssBaseline)
  test/       setup.ts, render.tsx, fixtures.ts, constants.ts, mocks/{handlers,server}.ts
  theme.ts
```

## Recipe: add a feature screen

1. Make sure the endpoint exists in the SDK (`pnpm generate`). If not, use the **backend** skill first.
2. **Component:** write `components/X/X.tsx` with a props interface and a branch for each state: loading, error, empty, data. Use MUI only.

   ```tsx
   import type { Project } from '@carbon-glint/sdk';
   import Alert from '@mui/material/Alert';
   import List from '@mui/material/List';
   import ListItemText from '@mui/material/ListItemText';
   import Skeleton from '@mui/material/Skeleton';

   export interface ProjectListProps {
     projects?: Project[];
     isLoading: boolean;
     error?: string;
   }

   export function ProjectList({ projects, isLoading, error }: ProjectListProps) {
     if (isLoading) return <Skeleton role="status" variant="rectangular" height={120} />;
     if (error) return <Alert severity="error">{error}</Alert>;
     if (!projects?.length) return <Alert severity="info">No projects yet</Alert>;
     return (
       <List>
         {projects.map((p) => (
           <ListItemText key={p.id} primary={p.name} />
         ))}
       </List>
     );
   }
   ```

3. **Container:** write `containers/XContainer.tsx` to call the SDK and map results to props.

   ```tsx
   import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
   import { listProjectsOptions, listProjectsQueryKey, createProjectMutation } from '@carbon-glint/sdk';
   import { ProjectList } from '../components/ProjectList/ProjectList';
   import { toErrorMessage } from '../lib/errors';

   export function ProjectListContainer() {
     const queryClient = useQueryClient();
     const { data, isPending, error } = useQuery(listProjectsOptions());
     const create = useMutation({
       ...createProjectMutation(),
       onSuccess: () => queryClient.invalidateQueries({ queryKey: listProjectsQueryKey() }),
     });
     return (
       <ProjectList
         projects={data?.items}
         isLoading={isPending}
         error={toErrorMessage(error ?? create.error)}
         onCreate={(name) => create.mutate({ body: { name } })}
       />
     );
   }
   ```

4. Compose containers in `App.tsx` (or a page or router component). Pages are layout only: MUI `Container`/`Grid` plus containers.
5. Add an MSW default handler for each new endpoint in `src/test/mocks/handlers.ts` and a fixture builder in `src/test/fixtures.ts`.
6. Write both test files, then run the definition-of-done commands.

## Testing (required for every change)

| Test                                | What's real                                        | What's mocked            | Assert                                                                                                |
| ----------------------------------- | -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Component** `X.test.tsx`          | the component and the MUI theme                    | nothing (props only)     | **every conditional branch** renders correctly; callbacks fire                                        |
| **Container** `XContainer.test.tsx` | container, React Query, the **real generated SDK** | the network, via **MSW** | what the user sees for success, API error and empty; mutations send the right body and refresh the UI |

- Always render with `renderWithProviders()` from `src/test/render.tsx`. It gives a fresh QueryClient (no retries) and the MUI theme, and returns `user` (user-event).
- Query by role or label (`getByRole('button', { name: 'Retry' })`), not by class or test ID. Use `findBy…` for anything async.
- **MSW is strict.** A request with no handler fails the test (`src/test/setup.ts`). Defaults live in `mocks/handlers.ts`. Override per test with `server.use(http.get(apiUrl('/path'), …))`, using `apiError(status, body)` for spec-shaped errors.
- Type mock bodies with SDK types (`HttpResponse.json<GetHealthResponse>(…)`), and build data with `buildX()` fixtures, so spec changes break tests at compile time.
- To assert a request body: `http.post(apiUrl('/projects'), async ({ request }) => { expect(await request.json()).toEqual(…); return HttpResponse.json(…, { status: 201 }); })`.
- Don't mock `@carbon-glint/sdk` or React Query with `vi.mock`. Mock the network instead.

Reference examples: `src/components/HealthStatus/HealthStatus.test.tsx` and `src/containers/HealthContainer.test.tsx`.

## Definition of done

```bash
pnpm generate
pnpm --filter @carbon-glint/web lint        # includes container/component/MUI/SDK rules
pnpm --filter @carbon-glint/web typecheck
pnpm --filter @carbon-glint/web test
pnpm --filter @carbon-glint/web build
```

To check it visually, run `pnpm db:up && pnpm dev`, then open http://localhost:5173. Vite proxies `/api` to the API on :8080.
