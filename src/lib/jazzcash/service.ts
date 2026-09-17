import { generateJazzCashSecureHash, verifyJazzCashResponse } from './crypto';
import { JAZZCASH_CONFIG } from './config';
import {
  JazzCashConfig,
  JazzCashPaymentPayload,
  PaymentInitiationResult,
  JazzCashResponseData,
} from './types';

export const JAZZCASH_ENDPOINTS = {
  v1_production: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  v1_sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  v2_production: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTxn',
  v2_sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTxn',
  sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  production: 'https://payments.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  hostedSandbox: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
  hostedProduction: 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
};

export const JAZZCASH_RESPONSE_CODES: Record<string, string> = {
  '000': 'Transaction Successful! Thank you for using JazzCash.',
  '121': 'Transaction in Pending state. Please approve the MPIN prompt on your mobile.',
  '124': 'Transaction timeout. Customer did not approve prompt in time.',
  '110': 'Insufficient funds in the JazzCash wallet.',
  '113': 'Invalid MPIN or authorization rejected by customer.',
  '157': 'Customer mobile account is inactive or blocked.',
  '199': 'Duplicate transaction reference or invalid credentials.',
  '999': 'System Error or Communication Failure at JazzCash Gateway.',
};

/**
 * Returns JazzCash config resolved directly from the config file or runtime overrides.
 */
export function getJazzCashConfig(overrides?: Partial<JazzCashConfig>): JazzCashConfig {
  return {
    merchantId: overrides?.merchantId || JAZZCASH_CONFIG.merchantId,
    password: overrides?.password || JAZZCASH_CONFIG.password,
    integritySalt: overrides?.integritySalt || JAZZCASH_CONFIG.integritySalt,
    environment: overrides?.environment || JAZZCASH_CONFIG.environment,
    apiVersion: overrides?.apiVersion || JAZZCASH_CONFIG.apiVersion,
    returnUrl: overrides?.returnUrl || JAZZCASH_CONFIG.returnUrl,
    ipnUrl: overrides?.ipnUrl || JAZZCASH_CONFIG.ipnUrl,
    itnUrl: overrides?.itnUrl || JAZZCASH_CONFIG.itnUrl,
    apiUrl: overrides?.apiUrl || JAZZCASH_CONFIG.apiUrl,
  };
}

/**
 * Formats a Date object to JazzCash timestamp: YYYYMMDDHHMMSS in Pakistan Time (PKT, UTC+5).
 */
export function formatJazzCashDateTime(date: Date = new Date()): string {
  // Convert to Pakistan Standard Time (UTC+5)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const pktDate = new Date(utc + 3600000 * 5);

  const pad = (n: number) => String(n).padStart(2, '0');
  const year = pktDate.getFullYear();
  const month = pad(pktDate.getMonth() + 1);
  const day = pad(pktDate.getDate());
  const hours = pad(pktDate.getHours());
  const minutes = pad(pktDate.getMinutes());
  const seconds = pad(pktDate.getSeconds());

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Generates a unique Transaction Reference Number
 */
export function generateTxnRefNo(): string {
  const now = new Date();
  const timestamp = formatJazzCashDateTime(now);
  const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 random digits
  return `T${timestamp}${randomSuffix}`;
}

/**
 * Sanitizes Pakistani mobile number to 11 digits: 03XXXXXXXXX
 */
export function sanitizeMobileNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

/**
 * Initiates an MWallet Direct Debit payment request to JazzCash.
 */
export async function initiateMWalletPayment(params: {
  mobileNumber: string;
  amount: number; // in PKR
  cnic?: string; // Last 6 digits
  billReference?: string;
  description?: string;
  configOverrides?: Partial<JazzCashConfig>;
}): Promise<PaymentInitiationResult> {
  const config = getJazzCashConfig(params.configOverrides);
  const cleanPhone = sanitizeMobileNumber(params.mobileNumber);

  if (!cleanPhone || cleanPhone.length !== 11 || !cleanPhone.startsWith('03')) {
    return {
      success: false,
      message: 'Invalid Pakistani mobile number. Must be 11 digits starting with 03 (e.g., 03001234567).',
      txnRefNo: '',
      amount: params.amount,
    };
  }

  if (params.amount <= 0) {
    return {
      success: false,
      message: 'Amount must be greater than PKR 0.',
      txnRefNo: '',
      amount: params.amount,
    };
  }

  // Amount in Paisas (1 PKR = 100 Paisa)
  const amountInPaisa = Math.round(params.amount * 100).toString();
  const txnDateTime = formatJazzCashDateTime();
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // +1 hour expiry
  const txnExpiryDateTime = formatJazzCashDateTime(expiryDate);
  const txnRefNo = generateTxnRefNo();
  const billReference = params.billReference || `INV-${Date.now().toString().slice(-6)}`;
  const description = params.description || `Payment of PKR ${params.amount} via JazzCash`;

  const apiVersion = config.apiVersion || '1.1';

  // Build payload
  const payload: JazzCashPaymentPayload = {
    pp_Version: apiVersion,
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amountInPaisa,
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: billReference,
    pp_Description: description,
    pp_TxnExpiryDateTime: txnExpiryDateTime,
    pp_ReturnURL: config.returnUrl,
    pp_MobileNumber: cleanPhone,
  };

  // CNIC is only for v2.0; API 1.1 / 1.0 does not require it
  if (apiVersion.startsWith('2') && params.cnic && params.cnic.trim().length === 6) {
    payload.pp_CNIC = params.cnic.trim();
  }

  // Calculate HMAC-SHA256 signature
  const secureHash = generateJazzCashSecureHash(payload, config.integritySalt);
  payload.pp_SecureHash = secureHash;

  // 1. Simulated Sandbox Mode (for immediate testing without waiting for live merchant keys)
  if (
    config.environment === 'simulator' ||
    config.merchantId === 'MC12345' ||
    !config.merchantId
  ) {
    // Check simulated test triggers
    if (cleanPhone.endsWith('0000')) {
      return {
        success: false,
        message: JAZZCASH_RESPONSE_CODES['110'] || 'Insufficient funds in the wallet.',
        responseCode: '110',
        txnRefNo,
        amount: params.amount,
        mobileNumber: cleanPhone,
        isSimulated: true,
        rawPayload: payload as Record<string, string>,
      };
    }

    if (cleanPhone.endsWith('1111')) {
      return {
        success: false,
        message: JAZZCASH_RESPONSE_CODES['113'] || 'Invalid MPIN entered on customer phone.',
        responseCode: '113',
        txnRefNo,
        amount: params.amount,
        mobileNumber: cleanPhone,
        isSimulated: true,
        rawPayload: payload as Record<string, string>,
      };
    }

    // Default simulated success
    const mockResponse: JazzCashResponseData = {
      pp_ResponseCode: '000',
      pp_ResponseMessage: 'Thank you for using JazzCash, your transaction was successful.',
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amountInPaisa,
      pp_RetreivalReferenceNo: `RRN${Date.now().toString().slice(-8)}`,
      pp_AuthCode: `AUTH${Math.floor(100000 + Math.random() * 900000)}`,
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: billReference,
    };

    // Calculate response hash for mock
    mockResponse.pp_SecureHash = generateJazzCashSecureHash(mockResponse, config.integritySalt);

    return {
      success: true,
      message: mockResponse.pp_ResponseMessage || 'Payment processed successfully.',
      responseCode: '000',
      txnRefNo,
      amount: params.amount,
      mobileNumber: cleanPhone,
      data: mockResponse,
      rawPayload: payload as Record<string, string>,
      isSimulated: true,
    };
  }

  // 2. Real Sandbox or Production Gateway Request
  try {
    const endpoint =
      config.apiUrl ||
      (config.environment === 'production'
        ? (config.apiVersion?.startsWith('1')
            ? JAZZCASH_ENDPOINTS.v1_production
            : JAZZCASH_ENDPOINTS.v2_production)
        : (config.apiVersion?.startsWith('1')
            ? JAZZCASH_ENDPOINTS.v1_sandbox
            : JAZZCASH_ENDPOINTS.v2_sandbox));

    console.log('\n================ JAZZCASH PAYMENT DISPATCH ================');
    console.log('Target Endpoint:', endpoint);
    console.log('Environment:', config.environment);
    console.log('API Version:', config.apiVersion);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    console.log('HTTP Status:', response.status, response.statusText);
    console.log('Raw Gateway Response:', rawText);
    console.log('===========================================================\n');

    let data: JazzCashResponseData = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        message: `JazzCash Gateway returned HTTP ${response.status}: ${rawText.slice(0, 160)}`,
        responseCode: String(response.status),
        txnRefNo,
        amount: params.amount,
        mobileNumber: cleanPhone,
        rawPayload: payload as Record<string, string>,
        isSimulated: false,
      };
    }

    const isSuccess = data.pp_ResponseCode === '000';
    const friendlyMessage =
      (data.pp_ResponseCode && JAZZCASH_RESPONSE_CODES[data.pp_ResponseCode]) ||
      data.pp_ResponseMessage ||
      `Transaction status ${data.pp_ResponseCode}: ${data.pp_ResponseMessage || 'Declined'}`;

    // Optional verification of incoming response hash
    const isHashValid = data.pp_SecureHash
      ? verifyJazzCashResponse(data, config.integritySalt)
      : true;

    return {
      success: isSuccess && isHashValid,
      message: !isHashValid
        ? 'Response signature mismatch. Transaction cannot be validated.'
        : friendlyMessage,
      responseCode: data.pp_ResponseCode,
      txnRefNo,
      amount: params.amount,
      mobileNumber: cleanPhone,
      data,
      rawPayload: payload as Record<string, string>,
      isSimulated: false,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Connection to JazzCash gateway failed.';
    console.error('JazzCash Gateway Fetch Error:', error);
    return {
      success: false,
      message: `JazzCash Gateway Error: ${errorMsg}`,
      responseCode: '999',
      txnRefNo,
      amount: params.amount,
      mobileNumber: cleanPhone,
      rawPayload: payload as Record<string, string>,
      isSimulated: false,
    };
  }
}

/**
 * Prepares payload and calculated secure hash for Hosted Checkout / HTML form redirection.
 * This is the standard method used by websites (like Shopify, WooCommerce, and UltraDigital)
 * because it does not require server IP whitelisting. The customer's browser posts directly to JazzCash.
 */
export function generateHostedCheckoutPayload(params: {
  mobileNumber?: string;
  amount: number;
  billReference?: string;
  description?: string;
  configOverrides?: Partial<JazzCashConfig>;
}) {
  const config = getJazzCashConfig(params.configOverrides);
  const amountInPaisa = Math.round(params.amount * 100).toString();
  const txnDateTime = formatJazzCashDateTime();
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const txnExpiryDateTime = formatJazzCashDateTime(expiryDate);
  const txnRefNo = generateTxnRefNo();
  const billReference = params.billReference || `INV-${Date.now().toString().slice(-6)}`;
  const description = params.description || `Payment of PKR ${params.amount}`;
  const cleanPhone = params.mobileNumber ? sanitizeMobileNumber(params.mobileNumber) : '';

  const payload: JazzCashPaymentPayload = {
    pp_Version: config.apiVersion || '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amountInPaisa,
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: billReference,
    pp_Description: description,
    pp_TxnExpiryDateTime: txnExpiryDateTime,
    pp_ReturnURL: config.returnUrl,
  };

  if (cleanPhone) {
    payload.pp_MobileNumber = cleanPhone;
  }

  payload.pp_SecureHash = generateJazzCashSecureHash(payload, config.integritySalt);

  const postUrl =
    config.environment === 'production'
      ? JAZZCASH_ENDPOINTS.hostedProduction
      : JAZZCASH_ENDPOINTS.hostedSandbox;

  return {
    postUrl,
    payload,
    txnRefNo,
  };
}
