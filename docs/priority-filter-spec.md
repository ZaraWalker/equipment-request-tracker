# Priority Filter Specification

## Goal

Help managers quickly find equipment requests that need attention by filtering existing requests by priority, while distinguishing pending and completed work and preserving every request.

## User Need

Managers need to see all eligible requests by default and narrow the list to High, Normal, or Low priority. High-priority requests count as needing attention. Managers need to see Pending requests before Completed requests and update work status when requests are fulfilled or reopened. Managers also need to review and correct requests with missing or unrecognized priorities or dates so those requests can appear in the regular results.

## Functional Rules

1. **Default and filter choices**
   - Provide All Priorities, High, Normal, and Low choices.
   - Select All Priorities on initial load and after every page refresh.
   - All Priorities displays every request eligible for regular results.
   - Selecting High, Normal, or Low displays only eligible requests with that exact priority.
   - Filter choices do not survive refresh. Filtering never changes or saves request data.
2. **Ordering**
   - All Priorities and each individual priority view show two regular-result sections: Pending first, Completed second.
   - Display both sections initially and after refresh, including when either section is empty.
   - Within each section, sort by request date, newest first.
   - Request date means the existing request creation date (`createdAt`), rather than the equipment needed date (`neededBy`).
   - For identical request dates, sort High before Normal before Low.
   - For identical dates and priorities, preserve the requests' existing relative order.
   - Status determines the section; priority determines filter matches and date ties within that section. Both statuses remain visible under every priority selection.
3. **Missing/Unrecognized section**
   - Use one section named Missing/Unrecognized, replacing the previously proposed separate sections.
   - Place any request with a missing or unrecognized priority and/or a missing or invalid request date in this section.
   - Valid priorities are High, Normal, and Low. A valid request date must be a nonempty, parseable date.
   - A request with multiple problems appears once in this section.
   - Keep this section visible independently of the selected priority filter so requests awaiting review remain accessible.
   - Exclude these requests from regular All Priorities and priority-filtered results until review, correction, approval, and saving succeed.
   - Do not silently assign a default priority or date to an existing request that requires review.
4. **Manager review and correction**
   - Managers can review both missing and unrecognized values.
   - Managers assign a valid priority and/or correct the request date as needed, approve the request, and save the correction.
   - Require all missing or invalid priority and request-date values to be corrected before the request enters regular results.
   - Change only the priority and/or request-date fields intentionally corrected by the manager. Preserve the request identity and all other data.
   - After a successful save, remove the request from Missing/Unrecognized and include it in the appropriate Pending or Completed section of All Priorities and its matching priority results, using the ordering rules above.
   - A correction does not change the currently selected filter. The corrected request appears in the regular list only when it matches that selection.
   - Saved corrections survive refresh in the same browser on the same device.
   - If saving fails, keep the request in its original section, retain its previously saved values, and clearly indicate that the correction was not saved.
5. **Empty results**
   - When the regular results contain no requests matching the current selection, display exactly: No Requests Match Your Search.
   - Requests awaiting review remain accessible in Missing/Unrecognized even when regular results are empty.
6. **Refresh performance**
   - Within 3 seconds of starting a page reload, display All Priorities with all priority filters cleared.
   - Apply this target to the existing request collection in the supported browser on the same device.

7. **Request status and manager updates**
   - Status is a separate field displayed after the request's priority. Every request, whether High, Normal, or Low, has either Pending or Completed status.
   - Pending means the request has not been completed. Completed means the request has been fulfilled.
   - The system automatically assigns Pending to new requests. Existing requests without a status default to Pending.
   - Requesters cannot set or change status. Only Pending and Completed are permitted and displayed; status controls must not allow another value.
   - Managers can mark a fulfilled request Completed or reopen it as Pending if the requester has not been satisfied.
   - Use an explicit manager update-and-save process similar to priority and date corrections. Status describes work progress, independently of approval.
   - Keep status controls available in All Priorities and when filtering by High, Normal, or Low.
   - A successful status save changes only the intended status field, preserves all other request data, and moves an eligible request to its new section using the agreed ordering without changing the selected priority filter.
   - Requests requiring priority/date review remain in Missing/Unrecognized until those problems are resolved; status changes do not bypass that review.
   - Saved status changes survive refresh in the same browser on the same device.
   - A failed status save retains the previously saved status and section and clearly indicates that the change was not saved.
   - Missing/Unrecognized remains a review section for priority/date problems; it is not a work-status section.

## Constraints

- Work without a login, database, external service, framework, or new production dependency.
- Use the existing browser-local storage approach for saved priority/date corrections and status changes.
- Preserve every existing request, including requests requiring review. Do not delete, drop, or silently overwrite request data during loading, filtering, ordering, or saving.
- Viewing, filtering, and ordering must not modify stored requests. Defaulting a legacy request with no status to Pending is system initialization, not a filter side effect.
- Manager approval and status updates are manager workflows without authenticated role enforcement. Keep status editing out of the requester workflow.
- Keep controls keyboard accessible, with visible labels and focus indicators.
- This specification defines future behavior only; creating it does not implement the feature.

## Acceptance Criteria

1. **Initial display:** Given eligible requests at all three priorities and both statuses, opening the page selects All Priorities and shows Pending first, then Completed. Each section lists its requests newest first, regardless of priority.
2. **Priority filtering:** Selecting each of High, Normal, and Low shows only eligible requests with the selected priority in the Pending and Completed sections. Each section remains newest first, and status controls remain available.
3. **Date and priority ties:** Within each status section, requests with identical dates appear High, then Normal, then Low. Requests with identical dates and priorities retain their existing relative order.
4. **Refresh:** After selecting any individual priority, refreshing selects and displays All Priorities within 3 seconds. The previous filter is not restored, and both status sections appear.
5. **Review classification:** Requests with a missing priority, an unrecognized priority, a missing date, an invalid date, or any combination appear once in Missing/Unrecognized and do not appear in the regular status sections.
6. **Successful correction:** A manager reviews a flagged request, corrects all invalid priority/date values, approves it, and saves successfully. It leaves Missing/Unrecognized and appears in the appropriate status section of All Priorities and its matching priority results in the correct order.
7. **Incomplete correction:** A request with multiple invalid fields remains excluded from regular results until every invalid priority/date field is corrected, approved, and successfully saved. Changing status does not bypass this rule.
8. **Persistence:** Refreshing in the same browser on the same device retains saved priority/date corrections and status changes while resetting the filter to All Priorities.
9. **Failed correction save:** A failed priority/date correction save leaves the request in its original section with its previously saved values and shows a clear failure indication.
10. **Empty results:** A selection with no eligible matches across both status sections shows exactly No Requests Match Your Search. Both status sections remain displayed, and the review section remains accessible if it contains requests.
11. **Data preservation:** Comparing requests before and after changing filters, sorting, and refreshing shows no lost requests or unintended data changes. Successful manager saves alter only the intended priority/date or status fields. Legacy requests without status receive the specified Pending default without changing other fields.
12. **No authentication or database:** Filtering, review, approval, status updates, and persistence work using the existing browser-local application without a login or database.
13. **Accessibility:** Managers can operate the filter, review/save, and status controls with a keyboard and identify controls and keyboard focus visually.
14. **Status assignment and display:** A new request automatically receives Pending without requester input. An existing request without status defaults to Pending. Each displayed request shows its status after its priority; only Pending and Completed are permitted, and requesters have no status-editing controls.
15. **Completion and reopening:** A manager marks an eligible Pending request Completed and saves; it moves to Completed. Reopening it as Pending and saving moves it back to Pending. Each move follows the section ordering rules and leaves the current priority filter unchanged.
16. **Failed status save:** When a status save fails, the request retains its previously saved status and section and a clear failure indication appears. Refresh does not show the failed status change as saved.
17. **Status section visibility:** With only Pending requests, only Completed requests, or no eligible requests, both regular status sections remain visible in the correct order on initial load, after refresh, and under every priority filter.

## Verification Results

All 17 acceptance criteria passed verification of implementation commit `76a519b`. Evidence includes 16 passing Node tests and Microsoft Edge browser checks, including keyboard operation and simulated save failures. Measured refresh time was 180 ms with 12 fixture requests on the test device.

| Criterion | Result |
| --- | --- |
| 1. Initial display | Pass |
| 2. Priority filtering | Pass |
| 3. Date and priority ties | Pass |
| 4. Refresh | Pass |
| 5. Review classification | Pass |
| 6. Successful correction | Pass |
| 7. Incomplete correction | Pass |
| 8. Persistence | Pass |
| 9. Failed correction save | Pass |
| 10. Empty results | Pass |
| 11. Data preservation | Pass |
| 12. No authentication or database | Pass |
| 13. Accessibility | Pass |
| 14. Status assignment and display | Pass |
| 15. Completion and reopening | Pass |
| 16. Failed status save | Pass |
| 17. Status section visibility | Pass |

See [Priority filter verification](priority-filter-testing.md) for each criterion's test procedure, expected result, environment, and limits.

## Out of Scope

- Implementing the feature as part of this specification-writing task.
- Persistence or synchronization across browsers or devices.
- Login, accounts, authenticated manager roles, or permission enforcement.
- A database, backend service, or shared remote storage.
- Request deletion or edits to fields other than the intended priority, request-date, and manager status changes.
- A separate status filter, free-text search, additional filter types, and status values beyond Pending and Completed.
- Persisting filter choices across refreshes.
- Changes to unrelated features or a broader interface redesign.
