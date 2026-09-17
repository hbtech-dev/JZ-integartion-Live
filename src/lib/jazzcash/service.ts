import { generateJazzCashSecureHash, verifyJazzCashResponse } from './crypto';
import { JAZZCASH_CONFIG } from './config';
import {
  JazzCashConfig,
  JazzCashPaymentPayload,
  PaymentInitiationResult,
  JazzCashResponseData,
} from './types';

export const JAZZCASH_ENDPOINTS = {
  v1_production: 'https://pgw.jazzcash.com.pk/api/payment/DoTransaction',
  v1_sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  v2_production: 'https://pgw.jazzcash.com.pk/api/payment/DoTransaction',
  v2_sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTxn',
  sandbox: 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API/1.1/Purchase/DoMWalletTxn',
  production: 'https://pgw.jazzcash.com.pk/api/payment/DoTransaction',
  hostedSandbox: 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
  hostedProduction: 'https://pgw.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform',
  statusInquiryProduction: 'https://pgw.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire',
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
    subMerchantName: overrides?.subMerchantName || JAZZCASH_CONFIG.subMerchantName,
    environment: overrides?.environment || JAZZCASH_CONFIG.environment,
    apiVersion: overrides?.apiVersion || JAZZCASH_CONFIG.apiVersion,
    returnUrl: overrides?.returnUrl || JAZZCASH_CONFIG.returnUrl,
    ipnUrl: overrides?.ipnUrl || JAZZCASH_CONFIG.ipnUrl,
    itnUrl: overrides?.itnUrl || JAZZCASH_CONFIG.itnUrl,
    apiUrl: overrides?.apiUrl || JAZZCASH_CONFIG.apiUrl,
    hostedUrl: overrides?.hostedUrl || JAZZCASH_CONFIG.hostedUrl,
    statusInquiryUrl: overrides?.statusInquiryUrl || JAZZCASH_CONFIG.statusInquiryUrl,
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
  const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const txnExpiryDateTime = formatJazzCashDateTime(expiryDate);
  const txnRefNo = generateTxnRefNo();
  const billReference = params.billReference || `INV-${Date.now().toString().slice(-6)}`;
  const description = params.description || `Payment of PKR ${params.amount} via JazzCash`;

  const apiVersion = config.apiVersion || '1.1';

  // Build payload strictly following verified PGW MWALLET API specification
  const payload: Record<string, string> = {
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
    pp_SubMerchantName: config.subMerchantName || 'UltraDigital',
    pp_ReturnURL: config.returnUrl,
    ppmpf_1: cleanPhone,
    ppmpf_2: '',
    ppmpf_3: '',
    ppmpf_4: '',
    ppmpf_5: '',
  };

  // Calculate HMAC-SHA256 signature
  const secureHash = generateJazzCashSecureHash(payload, config.integritySalt);
  payload.pp_SecureHash = secureHash;

  // Real PGW Production Gateway Request
  try {
    const endpoint = config.apiUrl || JAZZCASH_ENDPOINTS.v1_production;

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

/**
 * Performs a live Status Inquiry against JazzCash Payment Gateway.
 */
export async function checkPaymentStatusInquiry(txnRefNo: string) {
  const config = getJazzCashConfig();
  const payload: Record<string, string> = {
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: txnRefNo,
  };
  payload.pp_SecureHash = generateJazzCashSecureHash(payload, config.integritySalt);

  const endpoint = config.statusInquiryUrl || JAZZCASH_ENDPOINTS.statusInquiryProduction;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to query transaction status';
    return {
      pp_ResponseCode: '999',
      pp_ResponseMessage: errorMsg,
      error: errorMsg,
    };
  }
}

