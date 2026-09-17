import { NextResponse } from 'next/server';
import { getJazzCashConfig } from '@/lib/jazzcash/service';

export async function GET() {
  const config = getJazzCashConfig();

  // Mask sensitive values for display
  const maskedMerchantId = config.merchantId.length > 4 
    ? `${config.merchantId.slice(0, 3)}****`
    : 'Not Configured';

  const maskedSalt = config.integritySalt.length > 4
    ? `${config.integritySalt.slice(0, 3)}****${config.integritySalt.slice(-2)}`
    : 'Not Configured';

  return NextResponse.json({
    environment: config.environment,
    merchantId: maskedMerchantId,
    integritySalt: maskedSalt,
    hasRealCredentials: config.environment !== 'simulator' && config.merchantId !== 'MC12345',
    returnUrl: config.returnUrl,
    ipnUrl: config.ipnUrl,
    itnUrl: config.itnUrl,
    apiUrl: config.apiUrl,
    apiVersion: config.apiVersion,
  });
}
