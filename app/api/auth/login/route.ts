import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  try {
    const { passphrase } = await request.json();
    const correct = process.env.APP_PASSPHRASE;
    console.log("correct", correct); // Debug log
    console.log("passphrase", passphrase); // Debug log

    if (!correct || passphrase !== correct) {
      return NextResponse.json({ error: "Incorrect passphrase" }, { status: 401 });
    }

    const session = await getSession();
    session.authenticated = true;
    await session.save();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}