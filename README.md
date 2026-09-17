# JazzCash Merchant Account Integration (Next.js Full-Stack)

A complete, production-ready Next.js web application with App Router, TypeScript, and full backend integration for **JazzCash Merchant Mobile Wallet (MWallet) API v2.0**.

---

## Features

- **Direct MWallet Payment UI**: Enter Pakistani mobile number (`03XXXXXXXXX` / `+923XXXXXXXXX`) and amount in PKR to trigger a direct debit with USSD/MPIN push to the customer's phone.
- **Smart Carrier Detection**: Automatic identification of Jazz, Warid, Zong, Telenor, and Ufone numbers.
- **Secure Hash Generation**: Implements official JazzCash **HMAC-SHA256** hash generation (alphabetical key sorting + Integrity Salt concatenation + uppercase hex digest).
- **Backend API Routes**:
  - `/api/jazzcash/mwallet`: Dispatches MWallet debit request to JazzCash.
  - `/api/jazzcash/callback`: Handles IPN / return URL callbacks and verifies incoming `pp_SecureHash` signature.
  - `/api/jazzcash/config`: Secure configuration status.
- **Built-in Sandbox Simulator Mode**: Test payments immediately with instant simulated MPIN approvals or simulate errors (e.g. number ending in `0000` for low balance, `1111` for invalid MPIN) without waiting for live merchant keys.
- **In-App Merchant Config Drawer**: Switch between **Simulator**, **Sandbox**, and **Production** on the fly.
- **Session History & Receipts**: Instant digital transaction receipt with reference numbers, RRN, status codes, and copyable links.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your JazzCash merchant credentials:

```env
# Environment: 'simulator' (instant test mode) | 'sandbox' | 'production'
JAZZCASH_ENVIRONMENT=simulator

# Credentials from JazzCash Sandbox or Production Merchant Portal
JAZZCASH_MERCHANT_ID=MC12345
JAZZCASH_PASSWORD=password123
JAZZCASH_INTEGRITY_SALT=salt1234567890

# Return URL
JAZZCASH_RETURN_URL=http://localhost:3000/api/jazzcash/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

1. **User enters Phone Number & Amount** on the UI.
2. The frontend sends a request to the Next.js API route `POST /api/jazzcash/mwallet`.
3. The server formats the timestamp to Pakistan Time (`YYYYMMDDHHMMSS`), converts the amount into Paisas (PKR * 100), sorts all payload fields alphabetically, and calculates the `pp_SecureHash` using HMAC-SHA256 with your `JAZZCASH_INTEGRITY_SALT`.
4. The request is dispatched to the JazzCash API (`https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTxn` or production).
5. JazzCash triggers a USSD prompt / App push notification to the customer's phone to enter their 4-digit MPIN.
6. The transaction outcome is returned and displayed on the receipt modal.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/jazzcash/
│   │   │   ├── mwallet/route.ts      # MWallet payment handler
│   │   │   ├── callback/route.ts     # JazzCash return & IPN callback handler
│   │   │   └── config/route.ts       # Config inspector
│   │   ├── globals.css               # Bespoke FinTech design system
│   │   ├── layout.tsx                # App layout & SEO metadata
│   │   └── page.tsx                  # Interactive payment checkout UI
│   └── lib/
│       └── jazzcash/
│           ├── types.ts              # TypeScript schemas & payloads
│           ├── crypto.ts             # HMAC-SHA256 hash generator & verifier
│           └── service.ts            # Payment logic & response code mapping
├── .env.example                      # Env template
├── .env.local                        # Local configuration
├── package.json
└── tsconfig.json
```
