# Customer Manager

## Current State

The app has:
- Full sidebar layout with Customers, Jobs, Services, Invoices, Settings, Profile
- Jobs page with list and calendar views, drag-and-drop, copy/paste, and a JobDetailSheet
- JobDetailSheet lets users add visits (VisitCard + VisitFormSheet), with laborHours, laborRate, laborCost, notes, and photos
- InvoicesPage has a "New Invoice" dropdown that opens a CreateInvoiceSheet with line items, tax, totals, and an "Import from Job" button that pulls job services as line items
- Backend supports: listVisitsByJob, addVisit, updateVisit, getJobServices, addInvoice, getInvoicesByCustomer

## Requested Changes (Diff)

### Add
- "Generate Invoice from Visits" action inside the JobDetailSheet — a button that collects all completed visits for the job and pre-populates a new invoice with line items derived from each visit's labor (laborHours × laborRate = laborCost) and notes
- The generated invoice should be pre-linked to the job's customer, have the job address in the notes, and open the CreateInvoiceSheet (or a similar full-featured sheet) pre-filled with those line items so the user can review/edit before saving

### Modify
- JobDetailSheet: add a "Generate Invoice" button in the visits section header (or as a standalone action below the visits list) that is enabled when at least one visit with status "completed" exists
- CreateInvoiceSheet (InvoicesPage): accept optional pre-filled props (customerId, prefilledLineItems, prefilledNotes) so it can be triggered from outside InvoicesPage
- Export CreateInvoiceSheet (or a thin wrapper) so JobDetailSheet can import and open it

### Remove
- Nothing removed

## Implementation Plan

1. Refactor CreateInvoiceSheet into its own file `src/components/CreateInvoiceSheet.tsx` so it can be imported by both InvoicesPage and JobDetailSheet
2. Add optional props to CreateInvoiceSheet: `initialCustomerId?: string`, `initialLineItems?: LineItem[]`, `initialNotes?: string`
3. In JobDetailSheet, add a "Generate Invoice" button that:
   - Filters visits to status === "completed"
   - Builds LineItem[] from each visit: type="labor", description=`Visit on <date>${visit.notes ? ': '+visit.notes : ''}`, quantity=laborHours, unitPrice=laborRate
   - Opens CreateInvoiceSheet with those pre-filled values and the job's customerId
4. Update InvoicesPage to import CreateInvoiceSheet from the new shared file
5. Ensure proper data-ocid markers on new buttons and the shared sheet
