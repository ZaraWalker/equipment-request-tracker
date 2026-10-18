# Priority Filter Specification

## Goal

Help managers quickly find equipment requests that need attention by filtering existing requests by priority, while preserving every request.

## User Need

Managers need to see all eligible requests by default and narrow the list to High, Normal, or Low priority. High-priority requests count as needing attention. Managers also need to review and correct requests with missing or unrecognized priorities or dates so those requests can appear in the regular results.

## Functional Rules

1. **Default and filter choices**
   - Provide All Priorities, High, Normal, and Low choices.
   - Select All Priorities on initial load and after every page refresh.
   - All Priorities displays every request eligible for regular results.
   - Selecting High, Normal, or Low displays only eligible requests with that exact priority.
   - Filter choices do not survive refresh. Filtering never changes or saves request data.
2. **Ordering**
   - Sort All Priorities and each priority-filtered result by request date, newest first.
   - Request date means the existing request creation date (`createdAt`), rather than the equipment needed date (`neededBy`).
   - For identical request dates, sort High before Normal before Low.
   - For identical dates and priorities, preserve the requests' existing relative order.
   - Priority controls filtering and date ties; request status does not independently affect visibility or ordering.
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
   - After a successful save, remove the request from Missing/Unrecognized and include it in All Priorities and its matching priority results, using the ordering rules above.
   - A correction does not change the currently selected filter. The corrected request appears in the regular list only when it matches that selection.
   - Saved corrections survive refresh in the same browser on the same device.
   - If saving fails, keep the request in its original section, retain its previously saved values, and clearly indicate that the correction was not saved.
5. **Empty results**
   - When the regular results contain no requests matching the current selection, display exactly: No Requests Match Your Search.
   - Requests awaiting review remain accessible in Missing/Unrecognized even when regular results are empty.
6. **Refresh performance**
   - Within 3 seconds of starting a page reload, display All Priorities with all priority filters cleared.
   - Apply this target to the existing request collection in the supported browser on the same device.

## Constraints

- Work without a login, database, external service, framework, or new production dependency.
- Use the existing browser-local storage approach for saved corrections.
- Preserve every existing request, including requests requiring review. Do not delete, drop, or silently overwrite request data during loading, filtering, ordering, or saving.
- Viewing, filtering, and ordering must not modify stored requests.
- Manager approval is a user workflow without authenticated role enforcement.
- Keep controls keyboard accessible, with visible labels and focus indicators.
- This specification defines future behavior only; creating it does not implement the feature.

## Acceptance Criteria

1. **Initial display:** Given eligible requests at all three priorities, opening the page selects All Priorities and displays them newest first, regardless of priority.
2. **Priority filtering:** Selecting each of High, Normal, and Low displays only eligible requests with the selected priority, newest first.
3. **Date and priority ties:** Requests with identical dates appear High, then Normal, then Low. Requests with identical dates and priorities retain their existing relative order.
4. **Refresh:** After selecting any individual priority, refreshing selects and displays All Priorities within 3 seconds. The previous filter is not restored.
5. **Review classification:** Requests with a missing priority, an unrecognized priority, a missing date, an invalid date, or any combination appear once in Missing/Unrecognized and do not appear in regular results.
6. **Successful correction:** A manager reviews a flagged request, corrects all invalid priority/date values, approves it, and saves successfully. It leaves Missing/Unrecognized and appears in All Priorities and its matching priority results in the correct order.
7. **Incomplete correction:** A request with multiple invalid fields remains excluded from regular results until every invalid priority/date field is corrected, approved, and successfully saved.
8. **Correction persistence:** Refreshing in the same browser on the same device retains saved priority/date corrections while resetting the filter to All Priorities.
9. **Failed save:** A failed correction save leaves the request in its original section with its previously saved values and shows a clear failure indication.
10. **Empty results:** A selection with no eligible matches shows exactly No Requests Match Your Search. The review section remains accessible if it contains requests.
11. **Data preservation:** Comparing requests before and after changing filters, sorting, and refreshing shows no lost requests or unintended data changes. Successful corrections alter only the intended priority/date fields.
12. **No authentication or database:** Filtering, review, approval, and saved corrections work using the existing browser-local application without a login or database.
13. **Accessibility:** Managers can operate the filter and review/save controls with a keyboard and identify controls and keyboard focus visually.

## Out of Scope

- Implementing the feature as part of this specification-writing task.
- Persistence or synchronization across browsers or devices.
- Login, accounts, authenticated manager roles, or permission enforcement.
- A database, backend service, or shared remote storage.
- Request deletion or edits to fields other than the intended priority and request-date corrections.
- Status-based filtering or ordering, free-text search, and additional filter types.
- Persisting filter choices across refreshes.
- Changes to unrelated features or a broader interface redesign.
