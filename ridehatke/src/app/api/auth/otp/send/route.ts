import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configure nodemailer transporter using Ethereal (Free testing email)
// Or replace with your real SMTP later (Gmail, SendGrid, etc.)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
      user: 'jessy.feeney@ethereal.email', // Shared ethereal account for testing
      pass: 'PjZtGZtYp9v2A9JtYp'
  }
});

export async function POST(req: Request) {
  try {
    const { identifier } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
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

    // Check if it's an email
    if (identifier.includes('@')) {
      try {
        await transporter.sendMail({
          from: '"RideHatke Security" <no-reply@ridehatke.com>',
          to: identifier,
          subject: 'Your RideHatke Login Code',
          html: `<div style="font-family: Arial; text-align: center; padding: 20px;">
                  <h2>Welcome to RideHatke 🚕</h2>
                  <p>Your one-time password (OTP) is:</p>
                  <h1 style="color: #2563eb; letter-spacing: 5px;">${otpCode}</h1>
                  <p>This code will expire in 10 minutes.</p>
                 </div>`
        });
        console.log(`✅ Email OTP sent to ${identifier}: ${otpCode}`);
      } catch (err) {
        console.error("Failed to send email", err);
        // Fallback for demo
        console.log(`⚠️ Mock Email OTP for ${identifier}: ${otpCode}`);
      }
    } else {
      // It's a phone number. 
      // TODO: Add Twilio or MSG91 API integration here in the future
      console.log(`\n📱 ============================================`);
      console.log(`🚀 SMS SIMULATION (No real SMS cost)`);
      console.log(`To: ${identifier}`);
      console.log(`Message: Your RideHatke code is ${otpCode}. Valid for 10 min.`);
      console.log(`============================================\n`);
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" }, { status: 200 });

  } catch (error) {
    console.error("OTP send failed:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
