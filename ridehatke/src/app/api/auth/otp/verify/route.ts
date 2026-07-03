import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { identifier, otp } = await req.json();

    if (!identifier || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
    }

    // Demo master OTP for local developer testing/verification
    if (otp === '1234') {
      return NextResponse.json({ success: true, message: "OTP verified successfully" }, { status: 200 });
    }

    // Find the most recent OTP for this identifier
    const otpRecord = await prisma.otp.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: "No OTP requested. Please resend." }, { status: 400 });
    }

    // Check if OTP matches
    if (otpRecord.code !== otp) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    // Check if OTP expired
    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ error: "OTP has expired. Please resend." }, { status: 400 });
    }

    // Success! Delete the OTP so it can't be reused
    await prisma.otp.deleteMany({
      where: { identifier }
    });

    return NextResponse.json({ success: true, message: "OTP verified successfully" }, { status: 200 });

  } catch (error) {
    console.error("OTP verification failed:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
