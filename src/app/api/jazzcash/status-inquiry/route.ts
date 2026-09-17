import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatusInquiry } from '@/lib/jazzcash/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pp_TxnRefNo } = body;

    if (!pp_TxnRefNo) {
      return NextResponse.json(
        { error: 'pp_TxnRefNo is required' },
        { status: 400 }
      );
    }

    const data = await checkPaymentStatusInquiry(pp_TxnRefNo);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal status inquiry error';
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
