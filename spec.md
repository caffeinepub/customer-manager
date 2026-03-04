# Customer Manager

## Current State

The app has a full-stack Motoko + React setup with:
- Entities: Customer, Address, Job, Service, Invoice, Payment, Expense, Attachment, UserProfile, Settings
- Pages: Dashboard, Customers, CustomerDetail, Jobs, Invoices, Services, Settings, Profile
- Backend APIs: addJob, getJob, getJobsByAddress, listAddressesByCustomer, listActiveCustomers, etc.
- Jobs page shows a filterable table of all jobs with status, cost, customer, address and dates
- Jobs have `startTime` and `endTime` (nanosecond timestamps) stored in the backend

## Requested Changes (Diff)

### Add
- A **Calendar view** accessible from the Jobs tab (as a view toggle alongside the existing list view)
- Calendar displays jobs as events using their `startTime` and `endTime` fields
- Calendar supports month, week, and day views
- Clicking a job event on the calendar opens a detail popover with: customer name, address, status, cost, start/end time, and a link to the customer detail page
- Ability to **schedule a job** by clicking an empty time slot on the calendar, which opens the existing Add Job dialog pre-filled with the selected date/time
- A view-toggle button in the Jobs page header to switch between List and Calendar views

### Modify
- Jobs page header: add a toggle (List / Calendar) in addition to the existing "Add Job" button
- The existing status filter tabs remain visible in list view but are hidden in calendar view

### Remove
- Nothing removed

## Implementation Plan

1. Install a calendar library (`react-big-calendar` or build a lightweight custom calendar using date-fns) in the frontend package
2. Create a `JobCalendar` component that:
   - Accepts the jobs array (with enriched customer/address data)
   - Renders month/week/day views
   - Maps job `startTime`/`endTime` (BigInt nanoseconds) to JS Date objects
   - Renders each job as a colored event block styled by status
3. Create a `JobEventPopover` component shown when clicking a calendar event:
   - Shows customer name, address, status badge, cost, start/end time
   - "View Customer" link that navigates to customer-detail
4. Add a view toggle (List | Calendar) to the Jobs page header
5. Wire the calendar's "click empty slot" handler to open the AddJobDialog with the clicked date/time pre-populated
6. Style the calendar to match the app's OKLCH design tokens (no default calendar CSS conflicts)
