import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, identifier } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { identifier },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email address." }, { status: 400 });
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        identifier,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
