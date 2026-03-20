import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import { getPool } from "../db/pool.js";

const CreateExpenseSchema = z.object({
  voucherDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite().positive(),
  paymentMode: z.enum(["cash", "bank", "upi", "card", "other"]),
  narration: z.string().trim().max(500).optional().nullable(),
  reference: z.string().trim().max(200).optional().nullable(),
});

function paymentModeToLedgerCode(paymentMode: "cash" | "bank" | "upi" | "card" | "other") {
  if (paymentMode === "cash") return "CASH";
  if (paymentMode === "upi") return "UPI";
  if (paymentMode === "card") return "CARD";
  return "BANK";
}

export async function registerAccountingRoutes(app: FastifyInstance) {
  // Minimal Expense/Payment voucher:
  // Dr EXPENSE_MISC, Cr Cash/Bank/UPI/Card
  app.post("/accounting/expenses", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { voucherDate, amount, paymentMode, narration, reference } = parsed.data;

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query("begin");

      const sourceId = randomUUID();

      const voucherNoRes = await client.query(
        `select 'PAY-' || to_char($1::date, 'YYYYMM') || '-' || lpad(nextval('accounting_voucher_no_seq')::text, 5, '0') as voucher_no`,
        [voucherDate],
      );
      const voucherNo = voucherNoRes.rows[0]?.voucher_no as string;

      const paymentLedgerCode = paymentModeToLedgerCode(paymentMode);
      const combinedNarration = [
        narration?.trim() ? narration.trim() : "Expense",
        reference?.trim() ? `Ref: ${reference.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const voucherRes = await client.query(
        `insert into accounting_vouchers (
            voucher_type,
            voucher_no,
            voucher_date,
            party_student_id,
            party_name,
            narration,
            source_type,
            source_id
          )
         values ('Payment', $1, $2::date, null, null, $3, 'manual', $4::uuid)
         returning id, voucher_no, voucher_date::text as voucher_date, voucher_type`,
        [voucherNo, voucherDate, combinedNarration || null, sourceId],
      );

      const voucher = voucherRes.rows[0] as { id: string; voucher_no: string; voucher_date: string; voucher_type: string };

      await client.query(
        `insert into accounting_voucher_lines (voucher_id, ledger_code, debit, credit)
         values ($1::uuid, 'EXPENSE_MISC', $2, 0)`,
        [voucher.id, amount],
      );
      await client.query(
        `insert into accounting_voucher_lines (voucher_id, ledger_code, debit, credit)
         values ($1::uuid, $2, 0, $3)`,
        [voucher.id, paymentLedgerCode, amount],
      );

      await client.query("commit");

      return reply.code(201).send({
        id: voucher.id,
        voucherNo: voucher.voucher_no,
        voucherDate: voucher.voucher_date,
        voucherType: voucher.voucher_type,
        amount,
        paymentLedgerCode,
      });
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });
}
