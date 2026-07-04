import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configure nodemailer transporter using environment variables or fallback to Ethereal
const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER || 'jessy.feeney@ethereal.email';
const smtpPass = process.env.SMTP_PASS || 'PjZtGZtYp9v2A9JtYp';

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for port 465, false for other ports
  auth: {
      user: smtpUser,
      pass: smtpPass
  }
});

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    // Generate a 4-digit random OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save to Database
    await prisma.otp.create({
      data: {
        identifier,
        code: otpCode,
        expiresAt,
      }
    });

    // Send email via configured transporter
    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'RideHatke Security'}" <${process.env.SMTP_FROM_EMAIL || 'no-reply@ridehatke.com'}>`,
        to: identifier,
        subject: 'Your RideHatke Login Code',
        html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #1e293b;">
                <h2 style="color: #2563eb;">Welcome to RideHatke 🚕</h2>
                <p style="font-size: 1.1rem;">Your one-time password (OTP) is:</p>
                <h1 style="color: #db2777; letter-spacing: 5px; font-size: 2.5rem; background: #f8fafc; padding: 15px; border-radius: 12px; display: inline-block; min-width: 150px; margin: 15px 0;">${otpCode}</h1>
                <p style="color: #64748b;">This code will expire in 10 minutes.</p>
               </div>`
      });
      console.log(`✅ Email OTP sent to ${identifier}: ${otpCode}`);
    } catch (err) {
      console.error("Failed to send email:", err);
      // Fallback for local demo/development
      console.log(`⚠️ Mock Email OTP for ${identifier}: ${otpCode}`);
      
      // If we failed to send using a non-default SMTP user, throw error to notify user
      if (process.env.SMTP_USER && process.env.SMTP_USER !== 'jessy.feeney@ethereal.email') {
        throw err;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent successfully",
      code: process.env.NODE_ENV === 'development' ? otpCode : undefined
    }, { status: 200 });

  } catch (error: any) {
    console.error("OTP send failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to send OTP" }, { status: 500 });
  }
}
