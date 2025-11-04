import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// GET — fetch all transactions (or by user)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");
    const userId =
      userIdParam && !isNaN(Number(userIdParam))
        ? Number(userIdParam)
        : undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid userId" },
        { status: 400 }
      );
    }

    // ✅ Fetch transactions (Deposit & Withdrawal)
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Fetch investments directly from Investment model
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        planName: true,
        amount: true,
        roi: true,
        duration: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });

    // ✅ Split transaction data
    const depositHistory = transactions.filter(
      (tx) => tx.type?.toLowerCase() === "deposit"
    );
    const withdrawalHistory = transactions.filter(
      (tx) => tx.type?.toLowerCase() === "withdrawal"
    );

    // ✅ Format investment history
    const investmentHistory = investments.map((inv) => ({
      id: inv.id,
      planName: inv.planName,
      amount: inv.amount,
      roi: inv.roi,
      duration: inv.duration,
      status: inv.status,
      startDate: inv.startDate,
      endDate: inv.endDate,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        depositHistory,
        withdrawalHistory,
        investmentHistory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch transactions",
        depositHistory: [],
        withdrawalHistory: [],
        investmentHistory: [],
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
