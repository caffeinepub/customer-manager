# Customer Manager (FieldPro)

## Current State
Full-stack handyman management app with: Customers, Addresses, Jobs, Visits, Services, Expenses, Invoices, Payments, Financials, Settings, Profile. Backend is Motoko with authorization + blob-storage. Frontend is React/TypeScript with sidebar navigation across 10 pages.

## Requested Changes (Diff)

### Add

**Operations**
- **Recurring Jobs** -- RecurringJob entity: title, description, customerId, addressId, serviceId, frequency (enum: daily/weekly/biweekly/monthly/quarterly), dayOfWeek (optional), startDate, endDate (optional), isActive, nextOccurrence. CRUD + ability to generate a Job instance from a recurring job. List view in Jobs tab as sub-tab.
- **Job Templates** -- JobTemplate entity: name, description, estimatedHours, laborRate, defaultMaterials (array of {name, quantity, unitCost}), notes, isActive. CRUD. "Create Job from Template" button when creating a job.
- **Time Tracking** -- Add timerStartedAt (optional Time) field to Visit. Backend: startVisitTimer(visitId), stopVisitTimer(visitId) to compute elapsed time into laborHours.

**Customer & Communication**
- **Customer Portal** -- Generate a shareable read-only token per customer (customerPortalToken: Text). Public query getCustomerPortalData(token) returns customer name, job list (status, title, date), upcoming visits, invoice summaries. Frontend: a "Share Portal" button on Customer Detail that copies a link like `?portal=<token>`. Portal renders as a read-only public view.
- **Estimates / Quotes** -- Estimate entity: id, customerId, addressId, title, description, status (enum: draft/sent/accepted/declined/expired), lineItems (same structure as InvoiceLineItem), subtotal, taxRate, taxAmount, total, notes, validUntil (optional), convertedJobId (optional). CRUD. "Convert to Job" action sets convertedJobId and creates a Job.
- **Follow-up Reminders** -- FollowUpReminder entity: id, customerId, jobId (optional), dueDate (Time), note, isDone. CRUD. List shown in Customer Detail and on Dashboard as a "Reminders" card.

**Field Use**
- **Mileage Log** -- MileageLog entity: id, jobId (optional), visitId (optional), date, startLocation, endLocation, distanceMiles, purpose, notes. CRUD + list per job/visit. Summary page showing total miles per job and overall totals (for tax deduction).

**Business Intelligence / Assets**
- **Tool & Vehicle Asset Summary** -- Asset entity: id, name, type (enum: vehicle/tool/equipment/other), make, model, year (optional), serialNumber (optional), purchaseDate (optional), purchaseCost (optional), currentValue (optional), status (enum: active/in_repair/retired), notes. CRUD. Asset Summary page showing all assets with total fleet value, vehicles vs tools breakdown, and per-asset mileage summary (pulling from MileageLog where applicable).

### Modify
- App.tsx: add new page routes for recurring-jobs, job-templates, time-tracking, customer-portal, estimates, reminders, mileage-log, assets
- AppSidebar: add navigation items for Estimates, Reminders, Mileage Log, Assets
- JobsPage: add sub-tabs for Recurring Jobs and Job Templates
- CustomerDetailPage: add Follow-up Reminders section and Share Portal button
- DashboardPage: add Reminders card showing upcoming follow-ups

### Remove
- Nothing removed

## Implementation Plan
1. Extend Motoko backend with: RecurringJob, JobTemplate, Estimate, FollowUpReminder, MileageLog, Asset types and full CRUD + portal token logic + timer functions
2. Add new frontend pages: EstimatesPage, RemindersPage, MileageLogPage, AssetsPage
3. Extend JobsPage with RecurringJobs and JobTemplates sub-tabs
4. Add customer portal route (public, no auth) rendered when URL has `?portal=<token>`
5. Extend CustomerDetailPage with reminder list + portal share button
6. Extend DashboardPage with reminders card
7. Add sidebar nav items for new pages
8. Wire all new backend APIs in frontend
