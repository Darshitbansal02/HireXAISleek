import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Here you would typically:
    // 1. Validate input
    // 2. Hash password
    // 3. Save to database
    // 4. Generate JWT
    // For now, we'll mock the response

    return NextResponse.json(
      { 
        message: "Registration successful",
        user: { id: "123", name, email, role }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 400 }
    );
  }
}