import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier } = body;

    // Check if user exists in the database
    const user = await prisma.user.findUnique({
      where: { identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email/phone. Please sign up first." },
        { status: 404 }
      );
    }

    // User found — return success with user data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        identifier: user.identifier,
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Failed to process login" }, { status: 500 });
  }
}
