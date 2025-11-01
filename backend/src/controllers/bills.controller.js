import Societies from "../models/society.model.js";
import Bills from "../models/bills.model.js";
import Razorpay from "razorpay";
import { redis } from "../lib/redis.js";
import crypto from "crypto";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// TO-DO : add manual payment later on
export const createBill = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId } = req.params;
    const { houseNo, amount, dueDate, description } = req.body;

    if (!societyId) return res.status(400).json({ message: "Society ID required" });
    if (!houseNo || !amount || !dueDate || !description) return res.status(400).json({ message: "Missing required fields" });

    const society = await Societies.findById(societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (!society.admins.some(id => id.equals(user._id)) && !society.owner.equals(user._id)) {
      return res.status(403).json({ message: "Not authorized to create bills" });
    }

    const flat = society.flats.find(f => f.houseNo === houseNo);
    if (!flat) return res.status(404).json({ message: "Flat not found" });

    const bill = await Bills.create({
      houseNo,
      societyId,
      amount,
      dueDate,
      description
    });

    flat.bills.push(bill._id);
    await society.save();


    await redis.del(`Society:${societyId}`);
    await redis.del(`Bills:${societyId}`);

    res.status(201).json({ message: "Bill created successfully", bill });
  } catch (error) {
    next(error);
  }
};


export const getBillsForFlat = async (req, res, next) => {
  try {
    const { user } = req;
    const { societyId, houseNo } = req.params;

    const society = await Societies.findById(societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (!society.members.some(id => id.equals(user._id)) &&
        !society.admins.some(id => id.equals(user._id)) &&
        !society.owner.equals(user._id)
    ) return res.status(403).json({ message: "Not authorized" });

    const bills = await Bills.find({ societyId, houseNo }).sort({ dueDate: -1 });//most recent dues
    res.status(200).json({ bills });
  } catch (error) {
    next(error);
  }
};

export const payBill = async (req, res, next) => {
  try {
    const { user } = req;
    const { billId } = req.params;

    const bill = await Bills.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    if (bill.paid) return res.status(400).json({ message: "Bill already paid" });

    const society = await Societies.findById(bill.societyId);
    if (!society) return res.status(404).json({ message: "Society not found" });

    if (!society.members.some(id => id.equals(user._id)) &&
        !society.admins.some(id => id.equals(user._id)) &&
        !society.owner.equals(user._id)
    ) return res.status(403).json({ message: "Not authorized to pay this bill" });

    const amountInPaise = bill.amount * 100; // Razorpay works in smallest currency unit

    if (!society.razorpayAccount?.fundAccountId) {
      return res.status(400).json({ message: "Society fund account not set up" });
    }

    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `bill_${bill._id}`,
      payment_capture: 1,
      transfers: [
        {
          account: society.razorpayAccount.fundAccountId,
          amount: amountInPaise,  // Full amount to sub-account add commision later
          currency: "INR",
          notes: { billId: bill._id.toString() }
        }
      ]
    });

    bill.userIdForPayment = user._id
    await bill.save()

    res.status(200).json({ order, bill });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, billId } = req.body;

    const bill = await Bills.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if ( bill.paid ) return res.status(200).json({ message: "Already paid via webhook"})

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    
    bill.paid = true;
    bill.paidBy = req.user._id;
    bill.paymentDate = new Date();
    bill.paymentId = razorpay_payment_id;
    await bill.save();

    await redis.del(`Bills:${bill.societyId}`);
    await redis.del(`Society:${bill.societyId}`);

    res.status(200).json({ message: "Payment verified and bill marked as paid", bill });
  } catch (error) {
    next(error);
  }
};

export const razorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

   
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: "Webhook signature mismatch" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;
      const billReceipt = payment.notes?.billId;
      if (!billReceipt) return res.status(200).send("No billId in notes");

      const bill = await Bills.findById(billReceipt);
      if (!bill) return res.status(200).send("Bill not found");

    
      if (!bill.paid) {
        bill.paid = true;
        bill.paidBy = bill.userIdForPayment || null;
        bill.paymentDate = new Date(payment.created_at * 1000);
        bill.paymentId = payment.id;
        await bill.save();

        await redis.del(`Bills:${bill.societyId}`);
        await redis.del(`Society:${bill.societyId}`);
      }
    }


    res.status(200).json({ status: "ok" });
  } catch (err) {
    next(err);
  }
};
