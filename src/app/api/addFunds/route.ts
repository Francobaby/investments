import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import emailjs from "@emailjs/browser";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

// ✅ Define the expected shape of the request body
interface AddFundsRequestBody {
  user: string;
  amount: number;
  currency: string;
  address?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { user, amount, currency, address } = body as AddFundsRequestBody;

    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!user || !emailRegex.test(user)) {
      return NextResponse.json(
        { success: false, message: "Valid email is required." },
        { status: 400 }
      );
    }

    // ✅ Amount validation
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid positive amount is required." },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (!currency || !address) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // ✅ Find user
    const foundUser = await prisma.user.findUnique({
      where: { email: user },
      select: { id: true, email: true, firstName: true },
    });

    if (!foundUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    // ✅ Use UUID for transaction reference
    const transactionRef = uuidv4();

    // ✅ Create pending deposit and transaction atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit record with Pending status
      const deposit = await tx.deposit.create({
        data: {
          userId: foundUser.id,
          amount: numericAmount,
          currency: currency,
          address: address,
          status: "Pending",
        },
      });

      // Create transaction record with Pending status
      const transaction = await tx.transaction.create({
        data: {
          userId: foundUser.id,
          amount: numericAmount,
          paymentMethod: currency,
          transactionRef: transactionRef,
          type: "Deposit",
          status: "Pending",
          description: `Deposit via ${currency}`,
        },
      });

      return { deposit, transaction };
    });

    // ✅ Admin email for approval
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.error("ADMIN_EMAIL environment variable is not set");
      return NextResponse.json(
        { success: false, message: "Configuration error. Please try again later." },
        { status: 500 }
      );
    }

    // ✅ Approval URLs
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    console.log("Using baseUrl:", baseUrl);

    const approveUrl = `${baseUrl}/api/addFunds/approve?transactionId=${result.transaction.id}&action=approve`;
    const rejectUrl = `${baseUrl}/api/addFunds/approve?transactionId=${result.transaction.id}&action=reject`;

    // ✅ Send admin email (optional, skip if not configured)
    try {
      emailjs.init("JmQjPLQLPRNYM5Vgp");
      
      await emailjs.send(
        "service_kxp9p3i",
        "templates_695nv8c",
        {
          to_email: adminEmail,
          subject: "Payment Confirmation Awaiting Approval",
          message: `
            A new deposit requires approval.

            👤 User: ${foundUser.email}
            💰 Amount: $${numericAmount}
            💳 Method: ${currency}
            🧾 Wallet Address: ${address}
            🔗 Transaction Ref: ${transactionRef}

            Approve: ${approveUrl}
            Reject: ${rejectUrl}
          `,
        },
        "JmQjPLQLPRNYM5Vgp"
      );
      console.log("Admin email sent successfully");
    } catch (emailError) {
      console.warn("Failed to send admin email:", emailError);
      // Continue without failing the request
    }

    return NextResponse.json(
      {
        success: true,
        message: "Deposit submitted successfully and pending admin approval.",
        transactionRef: transactionRef,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("AddFunds error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to process deposit." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
