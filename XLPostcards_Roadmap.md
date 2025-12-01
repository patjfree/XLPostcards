# XLPostcards Roadmap & Architecture Summary

## High-Level Architecture

### Mobile App
- Expo / React Native
- Firebase Auth for login/password
- Sends Firebase ID token to backend
- Calls Python API on Railway

### Backend (Python on Railway)
- Handles: Stripe payments, webhooks, credit ledger
- Generates postcard images
- Communicates with Stannp API
- Stores all data in Postgres (Railway)
- Verifies Firebase tokens using Firebase Admin SDK
- Sends push notifications (Expo Push)

### Database (Postgres on Railway)
Stores:
- Users (linked by firebase_uid)
- Wallet / credits ledger
- Addresses
- Postcards sent
- Ads served
- Push tokens
- Holiday border selections
- Birthdays for reminders

### Auth
- Firebase Auth only (no custom auth)
- App receives ID token and sends it to backend
- Backend verifies ID token and maps to Postgres user row

---

## Feature Roadmap

### Phase 1 — User Accounts & Wallet System
- Firebase Auth login
- Postgres users table tracking firebase_uid
- Stripe purchases add credits
- Credits stored as ledger entries
- Show credit balance in app

### Phase 2 — International Postcards + Holiday Borders
- Domestic vs International support
- International costs 1.5 credits
- Holiday borders / seasonal overlays
- Backend stores available borders

### Phase 3 — Address Book + Bulk Sending
- Save addresses in Postgres
- Multi-select sending
- Cleaning and formatting of recipient names
- CSV upload via future web dashboard
- Store birthdays for reminders

### Phase 4 — Postcard History + PDF Archiving
- Postcard storage (front/back URLs)
- Stannp job IDs
- Resend postcard
- PDF versions stored in backend

### Phase 5 — Ads System
- Ads stored in Postgres
- Dynamic selection (random or targeted)
- Record which user got which ad
- Backend chooses ad for each postcard

### Phase 6 — Web App
- Web postcard builder
- Login via Firebase Auth
- Address book and credits sync
- Send postcards from web

### Phase 7 — Notifications & Reminders
- Store birthdays in address table
- Backend cron sends reminders
- Expo push notifications
- Holiday reminders
- Optional “send now?” postcard template

---

## Summary
- **Firebase Auth** handles identity
- **Railway Python backend** handles business logic
- **Railway Postgres** stores all structured data
- **Expo app** consumes the API and handles UI
- Credits, international routing, borders, ads, history, notifications all run through your backend + DB

