# Priority filter verification

This checklist corresponds to acceptance criteria 1–17 in `priority-filter-spec.md`.

## Run and prepare

- Run `npm test` for the dependency-free Node tests, then `npm start` for the application.
- Open `http://127.0.0.1:8000/index.html`. The explicit filename avoids an existing Windows development-server issue where the root URL returns 404.
- Use a separate browser profile for fixtures. Requests live under the existing `mis4173-equipment-requests` localStorage key; do not replace real request data with test fixtures.
- Prepare requests at all three priorities and both statuses, with different dates, identical dates, and identical dates/priorities. Include legacy requests lacking status, and requests lacking priority or creation date, with unrecognized priority, invalid creation date, and combinations of those problems. Request date is `createdAt`, not `neededBy`.

## Acceptance checks

| AC | How to test | Expected result |
| --- | --- | --- |
| 1 | Open the prepared collection with All Priorities. | Pending precedes Completed; requests within each section are newest first, even when the newest request is Low. |
| 2 | Select High, Normal, and Low in turn. | Both sections remain visible, contain only the selected priority, and retain status controls and newest-first ordering. |
| 3 | Inspect equal-date requests in All Priorities. | High precedes Normal, then Low; equal-date/equal-priority requests retain their original relative order. |
| 4 | Select an individual priority and reload. Measure from navigation start until both sections render. | All Priorities is selected and displayed within 3 seconds; previous filter is cleared. |
| 5 | Load each missing/invalid priority/date fixture; change priority filters. | Each flagged request appears exactly once in Missing/Unrecognized, never in Pending or Completed, regardless of filter. |
| 6 | Correct all flagged fields and choose Approve and save corrections. | The request leaves review and enters its status section in All Priorities and its matching priority view, in the right order. The active filter stays selected. |
| 7 | On a request with two invalid fields, correct only one and attempt approval. Also try changing its status. | Incomplete correction is rejected. Status changes do not release the request from review. |
| 8 | Successfully save corrections and a status change, select Low, then reload. | Saved values survive; selection resets to All Priorities. |
| 9 | Cause storage writes to fail, then submit a valid priority/date correction. | A clear not-saved message appears; original values and review membership remain. Reload retains original data. |
| 10 | Select a priority with no eligible matches, including when review requests exist. | Exact message: No Requests Match Your Search. Both status sections and the review section remain accessible. |
| 11 | Snapshot stored JSON before filtering, then compare after every filter and reload. Compare before/after successful manager saves too. | Filtering writes nothing; request count, identity, and unrelated fields survive. Only intended fields change, with Pending initialization for legacy missing status. |
| 12 | Perform filtering, correction approval, completion, reopening, and refresh on the local application. | No login, database, or external service is required. |
| 13 | Use Tab, arrow keys, and Enter to operate the filter, correction fields, approval button, status selector, and save button. | Controls have visible labels/focus indicators, can be operated by keyboard, and report save results. Scrollable tables can receive keyboard focus. |
| 14 | Submit a new request and load a legacy record lacking status. Inspect requester controls and table columns. | Both requests are Pending; requester form has no status control; Status follows Priority; manager choices are only Pending and Completed. |
| 15 | Under High, mark a Pending High request Completed and save; reopen and save. | It moves between the two sections with correct ordering and no filter change. Other fields are unchanged. |
| 16 | Cause storage writes to fail and try completing a Pending request. | Error appears, saved status and section remain Pending, selector resets to saved status, and reload does not show a successful change. |
| 17 | Test an empty collection, a Pending-only collection, and a Completed-only collection, under every filter and after reload. | Pending and Completed headings are always visible in that order, including empty sections. |

For AC 9 and 16, a disposable browser test can temporarily replace `Storage.prototype.setItem` with a function that throws `Error("Storage quota exceeded")`. Reload restores the normal method. Automated store tests also inject failing storage and confirm that neither input records nor saved JSON change.

## Recorded implementation verification

- All 16 Node tests passed (`node --test`, the command configured by `npm test`). The environment had no npm executable; the same package test script was also run with bundled pnpm.
- Browser checks passed in headless Microsoft Edge 155.0.4283.62 against a disposable local profile. Checks covered all 17 criteria, including failure injection, no-data and one-status-only views, keyboard filter/status controls, new-request defaults, and escaped user content. No browser script errors occurred.
- All Priorities rendered 180 ms after navigation began in the measured reload with 12 fixture requests. This verifies the small exercise dataset on this device, not an unlimited-data performance guarantee.
- A visual check used the existing page layout. No frameworks, production dependencies, or external services were added.
- Manager controls are a workflow distinction, not access control, as required by the no-login constraint. Persistence remains specific to this browser and device; clearing browser storage removes locally saved data.
- Unreadable stored JSON is left untouched and saving is disabled instead of overwriting the existing collection. Recovery of malformed storage is outside this feature.
