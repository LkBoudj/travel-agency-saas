# Page Checklist Template

**Page:** `__PAGE_NAME__`  
**Route(s):** `__ROUTES__`  
**Perms (if any):** `__PERMS__`  
**Test Date/Time:** `__ISO_DATETIME__`  
**Agency Code (throwaway):** `__CODE__`  
**Owner:** `__EMAIL__`

## Preconditions
- [ ] Fresh agency + owner logged in (shell loaded for correct code)
- [ ] Services healthy (`env-check.md` OK)
- [ ] Network access to backend 3000 and dashboard 5175

## Checks

### General
- [ ] Page loads without errors (console clean / no 500)
- [ ] Title/heading matches expected
- [ ] Breadcrumbs (if any) correct
- [ ] Empty state readable when no data
- [ ] Loading states shown appropriately

### UI
- [ ] Layout/direction OK (RTL spot-check if locale changed to ar)
- [ ] Responsive not obviously broken (desktop target)
- [ ] Buttons/labels consistent with patterns
- [ ] Tables: columns, sorting/filtering (if present), pagination (if present)
- [ ] Forms: labels, placeholders, help text
- [ ] Dialogs/modals: open/close, focus trap (spot), ESC/Cancel OK
- [ ] Toasts/snackbars for success/error

### Data
- [ ] List renders with real API data (or empty state)
- [ ] Create: valid input succeeds; persists after refresh
- [ ] Edit: changes persist after refresh
- [ ] Archive/Cancel/Disable (one-way actions): state reflects server truth; cannot restore if stated one-way
- [ ] Details view (code-based) correct
- [ ] Search/filter works (if present)

### Actions
- [ ] Primary action(s) present when permitted
- [ ] Secondary actions present/disabled appropriately
- [ ] Row actions hidden when no permission (UX)
- [ ] Confirmation flows shown for destructive actions
- [ ] Required validation messages clear
- [ ] Server-side validation errors mapped/readable

### Guards/Errors
- [ ] Guards enforced (direct URL behavior matches app)
- [ ] 401/403 mapped correctly; UX not misleading
- [ ] Network error handling (if observed) readable
- [ ] Backend reject logged if UI allows but backend rejects

### Notes
- Any deviations observed vs expected (link to `bugs.md` by ID if filed)

## Result
- [ ] PASS / [ ] WARN / [ ] FAIL / [ ] BLOCKED

## Notes
`__DETAILED_OBSERVED_VS_EXPECTED__`