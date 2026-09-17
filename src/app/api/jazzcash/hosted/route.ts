import { NextRequest, NextResponse } from 'next/server';
import { generateHostedCheckoutPayload } from '@/lib/jazzcash/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobileNumber, amount, billReference, description, configOverrides } = body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid payment amount in PKR is required.' },
        { status: 400 }
      );
    }

    const result = generateHostedCheckoutPayload({
      mobileNumber,
      amount: parsedAmount,
      billReference,
      description,
      configOverrides,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Hosted checkout generation error';
    return NextResponse.json(
      { success: false, message: errorMsg },
      { status: 500 }
    );
  }
}
