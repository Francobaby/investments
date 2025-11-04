import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWithdrawalRequestEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { notDeepEqual } from "node:assert";

export const runtime = "nodejs";

type WithdrawalRequest = {
  userId: number;
  amount: number;
  currency: string;
  address: string;
};

// GET — list withdrawals (optionally by userId)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const withdrawals = await prisma.withdrawal.findMany({
      // NEW Made sure only rejected or approved withdrawals pass through
      where: userId ? { userId: Number(userId), status: {not: "Pending"}} : {},
      include: {
        user: { select: { id: true, email: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: withdrawals });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

// POST — create a withdrawal
export async function POST(req: Request) {
  try {
    const { userId, amount, currency, address }: WithdrawalRequest =
      await req.json();

    if (!userId || !amount || !currency || !address) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );

    // Check available balance: mainBalance minus locked investments
    const availableBalance = user.mainBalance - user.investmentBalance;
    if (availableBalance < amount)
      return NextResponse.json(
        { success: false, message: "Insufficient available balance (locked funds in investments)" },
        { status: 400 }
      );

    // Use UUID for transaction reference
    const transactionRef = uuidv4();

    const withdrawal = await prisma.withdrawal.create({
      data: { userId, amount, currency, address, status: "Pending" },
    });

    // Do NOT deduct balance here - wait for admin approval
    // Only increment totalWithdrawals on approval

    await prisma.transaction.create({
      data: {
        userId,
        type: "withdraw",
        amount,
        description: `Withdrawal request of ${amount} ${currency}`,
        status: "Pending",
        transactionRef: transactionRef,
      },
    });

    // Send admin notification email (mirroring deposit flow)
    try {
      await sendWithdrawalRequestEmail({
        withdrawalId: withdrawal.id,
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        amount,
        currency,
        address,
        transactionRef,
      });
      console.log("Admin notification email sent for withdrawal request");
    } catch (emailError) {
      console.warn("Failed to send admin notification email:", emailError);
      // Continue without failing the request
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal submitted successfully and pending admin approval.",
      transactionRef: transactionRef,
      data: withdrawal
    }, { status: 201 });
  } catch (error) {
    console.error("Withdrawal creation error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create withdrawal" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
