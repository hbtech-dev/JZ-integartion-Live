export interface JazzCashConfig {
  merchantId: string;
  password: string;
  integritySalt: string;
  subMerchantName?: string;
  environment: 'sandbox' | 'production' | 'simulator';
  returnUrl: string;
  ipnUrl?: string;
  itnUrl?: string;
  apiUrl?: string;
  apiVersion?: string;
  hostedUrl?: string;
  statusInquiryUrl?: string;
}


export interface JazzCashPaymentPayload {
  pp_Version: string;
  pp_TxnType: string;
  pp_Language: string;
  pp_MerchantID: string;
  pp_Password: string;
  pp_TxnRefNo: string;
  pp_Amount: string; // Amount in Paisas (e.g. 100 PKR = 10000)
  pp_TxnCurrency: string;
  pp_TxnDateTime: string; // YYYYMMDDHHMMSS
  pp_BillReference: string;
  pp_Description: string;
  pp_TxnExpiryDateTime: string;
  pp_ReturnURL: string;
  pp_SecureHash?: string;
  pp_MobileNumber?: string;
  pp_CNIC?: string;
  [key: string]: string | undefined;
}

export interface JazzCashResponseData {
  pp_ResponseCode?: string;
  pp_ResponseMessage?: string;
  pp_TxnRefNo?: string;
  pp_Amount?: string;
  pp_RetreivalReferenceNo?: string;
  pp_AuthCode?: string;
  pp_SettlementExpiry?: string;
  pp_TxnDateTime?: string;
  pp_BillReference?: string;
  pp_SecureHash?: string;
  [key: string]: string | undefined;
}

export interface PaymentInitiationResult {
  success: boolean;
  message: string;
  responseCode?: string;
  txnRefNo: string;
  amount: number;
  mobileNumber?: string;
  data?: JazzCashResponseData;
  rawPayload?: Record<string, string>;
  isSimulated?: boolean;
}
