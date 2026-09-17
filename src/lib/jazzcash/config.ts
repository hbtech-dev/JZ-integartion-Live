// JazzCash Merchant Configuration File
// Keys are stored directly here as requested.

export const JAZZCASH_CONFIG = {
  // Official Merchant Credentials
  merchantId: 'MC990543',
  password: 'y3ak3p795s',
  integritySalt: '1f755ah3of',

  // Environment: 'production' for live payments | 'sandbox' | 'simulator'
  environment: 'production' as 'production' | 'sandbox' | 'simulator',

  // API Version
  apiVersion: '1.1',

  // Live Gateway Endpoints
  apiUrl: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  hostedUrl: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',

  // Callback & Webhook URLs
  returnUrl: 'https://api.ultradigital.cc/api/result',
  ipnUrl: 'https://api.ultradigital.cc/jazzcash_ipn_v2',
  itnUrl: 'https://onlinepayments.jazzcash.com.pk/payment-orchestrator/payment/api/v1/merchant/callback/simulators/ipn-url',
};
