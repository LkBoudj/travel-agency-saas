# Install — missing dependencies

Run inside this directory (`frontend/agency-dashboard-mantine`):

```
npm install @mantine/core@^9.6.2 @mantine/hooks@^9.6.2 @mantine/form@^9.6.2 @mantine/dates@^9.6.2 @mantine/notifications@^9.6.2 @mantine/modals@^9.6.2 @tabler/icons-react @tanstack/react-query @tanstack/react-query-devtools zod i18next react-i18next date-fns
npm install -D @fontsource-variable/inter
```

> Do NOT use `--force` / `--legacy-peer-deps`. The first line installs every Mantine package at `^9.6.2` in one command so npm resolves a single consistent version (the scaffold currently pins `core`/`hooks` to `9.6.1`, which is why a separate install of `@mantine/dates@9.6.2` alone fails with `ERESOLVE`).

Already installed (no action): `react`, `react-dom`, `react-router-dom`.

After install: add `http://localhost:5175` to `CORS_ORIGINS` in `backend/.env` (required for the app to reach the API in dev).