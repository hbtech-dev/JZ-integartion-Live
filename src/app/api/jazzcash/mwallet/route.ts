import { NextRequest, NextResponse } from 'next/server';
import { initiateMWalletPayment } from '@/lib/jazzcash/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobileNumber, amount, cnic, billReference, description, configOverrides } = body;

    if (!mobileNumber) {
      return NextResponse.json(
        { success: false, message: 'Customer phone number is required.' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid payment amount in PKR is required.' },
        { status: 400 }
      );
    }

    const result = await initiateMWalletPayment({
      mobileNumber,
      amount: parsedAmount,
      cnic,
      billReference,
      description,
      configOverrides,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
