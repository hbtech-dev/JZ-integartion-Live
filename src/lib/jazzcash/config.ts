// JazzCash Merchant Configuration File
// Keys and verified PGW endpoints are stored directly here as requested.

export const JAZZCASH_CONFIG = {
  // Verified Live Merchant Credentials
  merchantId: '10031167',
  password: 'w85zaz4ut3',
  integritySalt: 'bt50121s4d',
  subMerchantName: 'UltraDigital',

  // Environment: 'production' for live payments
  environment: 'production' as 'production' | 'sandbox' | 'simulator',

  // API Version
  apiVersion: '1.1',

  // Live Gateway Endpoints (pgw.jazzcash.com.pk)
  apiUrl: 'https://pgw.jazzcash.com.pk/api/payment/DoTransaction',
  hostedUrl: 'https://pgw.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform',
  statusInquiryUrl: 'https://pgw.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',

  // Callback & Webhook URLs
  returnUrl: 'https://api.ultradigital.cc/api/result',
  ipnUrl: 'https://api.ultradigital.cc/jazzcash_ipn_v2',
  itnUrl: 'https://onlinepayments.jazzcash.com.pk/payment-orchestrator/payment/api/v1/merchant/callback/simulators/ipn-url',
};

