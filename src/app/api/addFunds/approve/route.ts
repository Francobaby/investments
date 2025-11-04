import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { RewardService } from "@/lib/services/rewardService";

export const runtime = "nodejs";

// GET /api/addFunds/approve?transactionId=...&action=approve|reject
// Also supports depositId parameter for direct deposit approval
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");
    const depositId = url.searchParams.get("depositId");
    const action = url.searchParams.get("action");

    if ((!transactionId && !depositId) || !action) {
      return NextResponse.json(
        { success: false, message: "Missing transactionId/depositId or action." },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action." },
        { status: 400 }
      );
    }

    // Validate ID
    const id = parseInt(String(transactionId || depositId));
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid transaction or deposit ID" },
        { status: 400 }
      );
    }

    // Basic admin check (email-based for now)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, message: "Admin configuration error." },
        { status: 500 }
      );
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: id },
      include: { user: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found." },
        { status: 404 }
      );
    }

    if (transaction.status !== "Pending") {
      return NextResponse.json(
        { success: false, message: "Transaction already processed." },
        { status: 400 }
      );
    }

    if (transaction.type !== "Deposit") {
      return NextResponse.json(
        { success: false, message: "Only deposits can be approved." },
        { status: 400 }
      );
    }

    // Determine new statuses
    const newTransactionStatus = action === "approve" ? "Success" : "Failed";
    const newDepositStatus = action === "approve" ? "Completed" : "Failed";

    // Atomic update: transaction, deposit, user balance, rewards
    await prisma.$transaction(async (tx) => {
      // Update transaction status
      await tx.transaction.update({
        where: { id: id },
        data: { status: newTransactionStatus },
      });

      // Find and update deposit status
      const deposit = await tx.deposit.findFirst({
        where: {
          userId: transaction.userId,
          amount: transaction.amount,
          status: "Pending",
          createdAt: {
            gte: new Date(transaction.createdAt.getTime() - 1000), // Small tolerance
            lte: new Date(transaction.createdAt.getTime() + 1000),
          },
        },
      });

      if (deposit) {
        await tx.deposit.update({
          where: { id: deposit.id },
          data: { status: newDepositStatus },
        });
      }

      // Update user balance only on approval
      if (action === "approve") {
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            mainBalance: { increment: transaction.amount },
            totalDeposit: { increment: transaction.amount },
          },
        });

        // Award referral reward using RewardService if deposit exists
        if (deposit) {
          await RewardService.awardReferralReward(transaction.userId, transaction.amount, "deposit", deposit.id);
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: `Deposit ${action === "approve" ? "approved" : "rejected"} successfully.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process approval." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
