// src/app/api/depositHistory/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = 'nodejs';
export async function GET(req: Request)
{
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get("user");
    if (!userEmail) return NextResponse.json([], { status: 200 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json([], { status: 200 });

    const deposits = await prisma.deposit.findMany({
      //NEW Added query to make only non pending deposits to be sent
      where: { userId: user.id, status: {not: "Pending"} },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ depositHistory: deposits });
  } catch (err) {
    console.error("GET /depositHistory error:", err);
    return NextResponse.json({ depositHistory: [] }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";