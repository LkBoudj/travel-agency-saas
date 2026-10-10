# Environment Check

## Services
- [ ] Backend: `http://localhost:3000` reachable
- [ ] Backend Swagger: `http://localhost:3000/docs` returns 200
- [ ] Backend health: check `/v1/health` (if exists) or infer via `/docs`
- [ ] Dashboard: `http://localhost:5175` loads (shell/login)
- [ ] Admin (optional): reachable if used

## CORS / Cookies
- [ ] CORS configured for dashboard origin (no CORS errors in console on API calls)
- [ ] Auth cookies set on login (HttpOnly/secure as configured) — inspect devtools Application/Cookies
- [ ] Session persists across navigations

## Ports
- Dashboard 5175: `__CONFIRMED__`
- Backend 3000: `__CONFIRMED__`

## User / Agency Path
- Chosen agency creation path: `__PATH__`
- Fallback path: `__FALLBACK__`
- Platform admin creds available (if using admin): `__NOTES__` (never commit secrets)

## Notes
- Console errors on load: `__NONE_OR_LIST__`
- Network errors on initial calls: `__NONE_OR_LIST__`
- Other: `__NOTES__`