import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const plans = [
  { id: 1, name: "Mining", roi: 0.05, durationDays: 30, min: 1000 },
  { id: 2, name: "Premium", roi: 0.1, durationDays: 60, min: 5000 },
  { id: 3, name: "Gold", roi: 0.15, durationDays: 90, min: 10000 },
];

interface InvestmentRequestBody {
  user: string;
  planId: number;
  amount: number;
}

export async function POST(req: Request) {
  try {
    const data: InvestmentRequestBody = await req.json();
    const { user, planId, amount } = data;

    // ✅ Validate input
    if (!user || !planId || !amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid user, plan, or amount" },
        { status: 400 }
      );
    }

    // ✅ Find the investment plan
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // ✅ Check minimum investment
    if (amount < plan.min) {
      return NextResponse.json(
        { error: `Minimum investment for ${plan.name} is $${plan.min}` },
        { status: 400 }
      );
    }

    // ✅ Find user
    const foundUser = await prisma.user.findUnique({
      where: { email: user },
      select: {
        id: true,
        mainBalance: true,
        investmentBalance: true,
        firstName: true,
      },
    });

    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ Check balance
    if (foundUser.mainBalance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // ✅ Perform atomic transaction (user + investment + transaction record)
    const result = await prisma.$transaction(async (tx) => {
      // Update user balances
      const updatedUser = await tx.user.update({
        where: { id: foundUser.id },
        data: {
          mainBalance: { decrement: amount },
          investmentBalance: { increment: amount },
        },
      });

      // Create investment record
      const newInvestment = await tx.investment.create({
        data: {
          userId: foundUser.id,
          planId: plan.id,
          planName: plan.name,
          amount,
          roi: plan.roi,
          duration: plan.durationDays.toString(),
          durationDays: plan.durationDays,
          status: "Active",
          createdAt: new Date(),
        },
      });

      // Create transaction log for audit & history
      await tx.transaction.create({
        data: {
          userId: foundUser.id,
          amount,
          type: "Investment",
          status: "Completed",
          paymentMethod: "Balance",
          transactionRef: `INV-${Date.now()}`,
          description: `Investment in ${plan.name} plan`,
          createdAt: new Date(),
        },
      });

      // Check for referral reward (first investment >= $100)
      if (amount >= 100) {
        const userWithReferral = await tx.user.findUnique({
          where: { id: foundUser.id },
          select: { referredById: true },
        });

        if (userWithReferral?.referredById) {
          // Check if this is the first qualifying investment for this user
          const previousQualifyingInvestments = await tx.investment.count({
            where: {
              userId: foundUser.id,
              amount: { gte: 100 },
              createdAt: { lt: newInvestment.createdAt },
            },
          });

          if (previousQualifyingInvestments === 0) {
            // Award 300 points to referrer
            await tx.user.update({
              where: { id: userWithReferral.referredById },
              data: { rewardPoints: { increment: 300 } },
            });

            // Log in reward ledger
            await tx.rewardLedger.create({
              data: {
                userId: userWithReferral.referredById,
                type: "earned",
                points: 300,
                description: `Referral reward for first investment of $${amount} by referred user`,
                refId: newInvestment.id,
              },
            });
          }
        }
      }

      return { updatedUser, newInvestment };
    });

    // ✅ Return response
    return NextResponse.json({
      success: true,
      message: `Investment in ${plan.name} successful.`,
      updatedBalances: {
        mainBalance: result.updatedUser.mainBalance,
        investmentBalance: result.updatedUser.investmentBalance ?? 0,
      },
      investment: result.newInvestment,
    });
  } catch (err: any) {
    console.error("Error creating investment:", err);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while creating investment. Please try again.",
      },
      { status: 500 }
    );
  }
}

// ✅ Fetch user investments
//NEW Frontend Should call this api so that investment plans can shown in the front end
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get("user");

    if (!user) {
      return NextResponse.json({ error: "Missing user" }, { status: 400 });
    }

    const foundUser = await prisma.user.findUnique({
      where: { email: user },
    });

    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userInvestments = await prisma.investment.findMany({
      where: { userId: foundUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(userInvestments);
  } catch (err) {
    console.error("Error fetching investments:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
