# Customer Manager

## Current State
- Full CRM with Customers, Addresses, Jobs, Visits, Invoices, Payments, Financials, and Settings.
- Visits have a `photoIds: string[]` field in both backend and frontend types.
- `VisitFormSheet` has a photo upload UI stub that creates local preview URLs but does NOT actually upload to blob-storage -- photos are never saved.
- `VisitCard` renders placeholder Camera icons for photoIds instead of real images.
- The `Expense` type in the backend has `description`, `amount`, `expenseType`, `dateIncurred`, and `notes` -- no `jobId` or `visitId` foreign keys, no `attachmentId`.
- The Financials page has an Expenses tab (frontend-only local state, not persisted to backend) that lets users add/delete expense entries. These are not linked to jobs or visits.
- blob-storage component is installed and available via `StorageClient`.
- No receipt scanning feature exists anywhere.

## Requested Changes (Diff)

### Add
- **Backend: Expense entity with job/visit linkage** -- update Expense type to include `jobId?: Text`, `visitId?: Text`, `vendorName?: Text`, `receiptBlobId?: Text`. Add `addExpense`, `updateExpense`, `deleteExpense`, `listExpensesByJob`, `listExpensesByVisit`, `listAllExpenses` backend methods.
- **Visit photo upload (wired)** -- In `VisitFormSheet`, actually upload selected photos to blob-storage using `StorageClient`, collect returned blob IDs, and store them in `visit.photoIds`.
- **Visit photo gallery** -- In `VisitCard`, render actual thumbnails using `StorageClient.getDirectURL(blobId)`. Clicking a thumbnail opens a full-size lightbox/modal. Show photo count badge.
- **Job photo gallery tab** -- In `JobDetailSheet`, add a "Photos" tab alongside the Visits list that shows ALL photos across all visits for the job, grouped by visit date.
- **Receipt upload on expenses** -- When adding/editing an expense, allow uploading a receipt image (jpg/png) or PDF. Upload via blob-storage. The receipt blobId is saved to `expense.receiptBlobId`. Show a thumbnail/icon with a "View Receipt" button.
- **Receipt auto-scan** -- After uploading a receipt image, attempt to parse visible text (amount, vendor, date) from the image using a simple client-side heuristic (read EXIF date, or present a "Scan Receipt" flow that pre-fills fields from extracted text). If scanning is not possible, pre-fill the date field from today and prompt user to confirm fields manually.
- **Expenses tab in JobDetailSheet** -- Add an "Expenses" tab in the job detail panel showing expenses for that job, grouped by visit. Allow adding new expenses from there.
- **Expenses viewable by visit** -- In `VisitCard`/visit detail, show associated expenses with totals.
- **Expenses summary on job** -- Show total expenses on the job detail summary card alongside labor cost.

### Modify
- **Backend `Expense` type** -- Add `jobId?: Text`, `visitId?: Text`, `vendorName?: Text`, `receiptBlobId?: Text` fields.
- **`VisitFormSheet`** -- Wire photo upload to blob-storage; replace stub with real StorageClient upload calls.
- **`VisitCard`** -- Render real photo thumbnails using `StorageClient.getDirectURL`. Add lightbox for full-size view.
- **`JobDetailSheet`** -- Add tabs: "Visits", "Photos", "Expenses". Move visits list into Visits tab.
- **Financials Expenses tab** -- Pull expenses from backend instead of local state.

### Remove
- Local-only expense state in FinancialsPage (replace with backend-persisted data).

## Implementation Plan
1. Update backend `main.mo`: extend `Expense` type with jobId/visitId/vendorName/receiptBlobId; add expenseMap storage; add CRUD methods for expenses.
2. Regenerate `backend.d.ts` types.
3. Add expense query/mutation hooks to `useQueries.ts`.
4. Wire `VisitFormSheet` photo upload to StorageClient -- upload files, get blob IDs, store in visit.photoIds.
5. Update `VisitCard` to render real thumbnails via StorageClient.getDirectURL; add lightbox.
6. Update `JobDetailSheet` with Visits / Photos / Expenses tabs.
7. Build `ExpenseFormSheet` component for adding/editing expenses with receipt upload + auto-scan pre-fill.
8. Update FinancialsPage Expenses tab to load from backend.
