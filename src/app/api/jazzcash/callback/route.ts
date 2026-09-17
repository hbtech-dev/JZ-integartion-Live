import { NextRequest, NextResponse } from 'next/server';
import { getJazzCashConfig } from '@/lib/jazzcash/service';
import { verifyJazzCashResponse } from '@/lib/jazzcash/crypto';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let responseData: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        responseData[key] = value.toString();
      });
    } else if (contentType.includes('application/json')) {
      responseData = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        responseData[key] = value;
      });
    }

    const config = getJazzCashConfig();
    const isVerified = verifyJazzCashResponse(responseData, config.integritySalt);

    const isSuccess = responseData.pp_ResponseCode === '000';
    const txnRefNo = responseData.pp_TxnRefNo || '';
    const amount = responseData.pp_Amount ? (parseInt(responseData.pp_Amount, 10) / 100).toString() : '0';
    const responseMsg = responseData.pp_ResponseMessage || (isSuccess ? 'Transaction Successful' : 'Transaction Failed');

    // Redirect to home page with query params or render receipt
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('status', isSuccess ? 'success' : 'failed');
    redirectUrl.searchParams.set('txnRefNo', txnRefNo);
    redirectUrl.searchParams.set('amount', amount);
    redirectUrl.searchParams.set('message', responseMsg);
    redirectUrl.searchParams.set('verified', isVerified ? 'true' : 'false');

    return NextResponse.redirect(redirectUrl);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Callback processing error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const responseData: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    responseData[key] = value;
  });

  return NextResponse.json({
    status: 'received',
    data: responseData,
  });
}
