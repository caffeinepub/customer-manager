# Customer Manager

## Current State
The app has a full-stack field service management platform with:
- Sidebar navigation covering Dashboard, Customers, Jobs, Services, Estimates, Invoices, Payments, Financials, Mileage Log, Assets, Settings, and Profile
- Authorization via `MixinAuthorization` / `AccessControl` with roles: admin, user, guest
- `UserProfile` stored per `Principal` with fields: name, email, phone, role, isActive
- `usePermissions` hook manages a local `PermissionMatrix` (owner/admin/tech/readonly roles with per-view toggles, stored in localStorage)
- Settings page has a "Users & Permissions" card with the permission matrix table (visible to owner/admin)
- Profile page allows the current user to edit their own profile
- Backend exposes: `getCallerUserProfile`, `getUserProfile(user)`, `saveCallerUserProfile`, `assignCallerUserRole`, `getCallerUserRole`, `isCallerAdmin`
- No dedicated Users Management page exists

## Requested Changes (Diff)

### Add
- A new `UsersPage` (`src/frontend/src/pages/UsersPage.tsx`) that allows owner/admin to:
  - View a list of all registered users (users who have saved a profile)
  - See each user's name, email, phone, role, and active status
  - Edit a user's role (owner can change any role; admin can change tech/readonly only)
  - Toggle a user's `isActive` status
  - Remove / deactivate a user
- Since the backend only stores profiles keyed by Principal and there's no `listAllUsers` endpoint, the page will manage a local registry of known user principals (stored in localStorage alongside their profiles) and fetch their profiles on demand
- Add `users` as a new `AppView` in `usePermissions.ts` (only owner/admin access by default)
- Add `users` to the `Page` union type in `App.tsx` and wire `UsersPage` into the router
- Add a "Users" nav item to `AppSidebar.tsx` (in the Settings section, admin-only visible)
- Add `users` to `PERMISSION_VIEWS` so it appears in the Settings permissions table
- Add a helper in `useQueries.ts`: `useAssignUserRole` mutation (wraps `assignCallerUserRole`)

### Modify
- `App.tsx`: add `{ view: "users" }` to the `Page` union and render `UsersPage`
- `AppSidebar.tsx`: add "Users" nav item with `UserCog` icon, after Settings and before My Profile
- `usePermissions.ts`: add `users` view, default access owner=true, admin=true, tech=false, readonly=false
- `useQueries.ts`: add `useAssignUserRole` mutation

### Remove
- Nothing removed

## Implementation Plan
1. Add `useAssignUserRole` mutation to `useQueries.ts`
2. Create `UsersPage.tsx` with:
   - A local registry (localStorage key `"known_users"`) that stores `{ principal: string, name: string, email: string }[]`
   - On load, fetch profiles for all known principals via `getUserProfile`
   - Display a table: Name, Email, Phone, Role (editable select), Active (toggle switch)
   - "Add User by Principal" dialog: input a Principal text, look up their profile, add to registry
   - Role assignment calls `assignCallerUserRole` — note: this assigns the CALLER's role, so the pattern is limited; the UI should reflect this limitation (owner can assign roles, others cannot)
   - Invite note explaining users must sign in first to appear
3. Update `usePermissions.ts` to include `users` view
4. Update `App.tsx` to include `users` page and `UsersPage`
5. Update `AppSidebar.tsx` to include "Users" nav item
6. Update `useQueries.ts` with `useAssignUserRole`
