# Customer Manager

## Current State
New project. No existing implementation.

## Requested Changes (Diff)

### Add
- **Customer**: id, name, email, phone, tags, isActive, notes, createdAt, updatedAt
- **Address**: id, customerId, label, street, city, state, postalCode, country, isPrimary, notes, createdAt, updatedAt
- **Job**: id, customerId, addressId, title, description, status (lead/scheduled/in_progress/completed/invoiced/paid/cancelled), source, priority (low/normal/high), estimatedStartDate, estimatedEndDate, totalLaborHours, totalLaborCost, totalMaterialCost, otherCosts, totalCost, totalPrice, profit, notes, hasWarranty, warrantyExpiresAt, invoiceId, createdAt, updatedAt
- **Visit**: id, jobId, scheduledDate, startTime, endTime, status (scheduled/in_progress/completed/cancelled), assignedToUserId, laborHours, laborRate, laborCost, notes, internalNotes, travelDistance, travelTimeMinutes, createdAt, updatedAt
- **Material**: id, visitId, jobId, name, description, sku, quantity, unitCost, totalCost, vendorName, purchaseDate, receiptAttachmentId, createdAt, updatedAt
- **Expense**: id, jobId, visitId, category (fuel/dump_fee/tool/supplies/other), description, amount, date, vendorName, attachmentId, createdAt, updatedAt
- **Invoice**: id, jobId, customerId, invoiceNumber, issueDate, dueDate, status (draft/sent/viewed/overdue/paid/void), subtotal, taxRate, taxAmount, total, amountPaid, balanceDue, notes, terms, createdAt, updatedAt
- **InvoiceLineItem**: id, invoiceId, type (labor/material/fee/discount/other), description, quantity, unitPrice, total, sourceType, sourceId
- **Payment**: id, invoiceId, customerId, amount, date, method (cash/check/card/transfer/other), referenceNumber, notes, createdAt, updatedAt
- **Attachment**: id, type (photo/document/receipt/other), fileUrl, thumbnailUrl, fileName, fileSize, mimeType, customerId, jobId, visitId, invoiceId, uploadedAt, notes, createdAt, updatedAt
- **User**: id, name, email, phone, role (owner/tech/admin), isActive, createdAt, updatedAt
- **Settings**: single-record, defaultLaborRate, defaultTaxRate, currency, invoicePrefix, invoiceStartingNumber, jobStatusOptions, visitStatusOptions, paymentTermsDays, companyName, companyPhone, companyEmail, companyAddress, createdAt, updatedAt

### Modify
- None

### Remove
- None

## Implementation Plan

### Backend
- Motoko actor with stable storage for all 12 entities
- CRUD operations for each entity (create, read, update, delete, list)
- Query functions: listByCustomer (addresses, jobs, invoices, payments, attachments), listByJob (visits, materials, expenses, attachments), listByVisit (materials, expenses, attachments), listByInvoice (line items, payments)
- Settings singleton (get/set)
- Auto-generated IDs and timestamps
- Computed fields: totalCost, balanceDue, totalLaborCost derived from line items

### Frontend
- Sidebar navigation with sections: Dashboard, Customers, Jobs, Visits, Invoices, Payments, Expenses, Materials, Attachments, Users, Settings
- Dashboard: summary cards (open jobs, outstanding invoices, recent activity)
- Customer list with search, filter by active, tag display
- Customer detail view with tabs: Info, Addresses, Jobs, Invoices, Attachments
- Address management embedded in Customer detail
- Job list with filter by status, priority; Job detail with tabs: Overview, Visits, Materials, Expenses, Invoice
- Visit list and detail with labor tracking
- Material list per visit/job
- Expense list with category filter
- Invoice list with status filter; Invoice detail with line items and payment history
- Payment recording form
- Attachment gallery with upload
- User management list and form
- Settings page (single form)
- Sample data for all entities
