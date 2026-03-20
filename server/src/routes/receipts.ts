import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getPool } from "../db/pool.js";

const CreateReceiptSchema = z.object({
  studentId: z.string().uuid(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite().positive(),
  paymentMode: z.enum(["cash", "bank", "upi", "card", "other"]),
  reference: z.string().trim().max(200).optional().nullable(),
  narration: z.string().trim().max(500).optional().nullable(),
});

export async function registerReceiptRoutes(app: FastifyInstance) {
  app.post("/receipts", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CreateReceiptSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", errors: parsed.error.issues });
    }

    const { studentId, receiptDate, amount, paymentMode, reference, narration } = parsed.data;

    const pool = getPool();

    const client = await pool.connect();
    try {
      await client.query("begin");

      const studentRes = await client.query(
        `select id, full_name
         from students
         where id = $1
         limit 1`,
        [studentId],
      );
      const student = studentRes.rows[0] as { id: string; full_name: string } | undefined;
      if (!student) {
        await client.query("rollback");
        return reply.code(404).send({ message: "Student not found" });
      }

      // Receipt no pattern: RCPT-YYYYMM-00001 (sequence is global)
      const insertRes = await client.query(
        `insert into receipts (receipt_no, receipt_date, student_id, amount, payment_mode, reference, narration)
         values (
           'RCPT-' || to_char($1::date, 'YYYYMM') || '-' || lpad(nextval('receipt_no_seq')::text, 5, '0'),
           $1::date,
           $2,
           $3,
           $4,
           $5,
           $6
         )
         returning id, receipt_no, receipt_date::text as receipt_date, student_id, amount::text as amount, payment_mode, reference, narration, created_at`,
        [receiptDate, studentId, amount, paymentMode, reference ?? null, narration ?? null],
      );

      const receipt = insertRes.rows[0] as { id: string; receipt_no: string };

      const ledgerCode =
        paymentMode === "cash"
          ? "CASH"
          : paymentMode === "upi"
            ? "UPI"
            : paymentMode === "card"
              ? "CARD"
              : "BANK";

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
         values ('Receipt', $1, $2::date, $3::uuid, $4, $5, 'receipt', $6::uuid)
         on conflict (source_type, source_id)
         do update set
           voucher_no = excluded.voucher_no,
           voucher_date = excluded.voucher_date,
           party_student_id = excluded.party_student_id,
           party_name = excluded.party_name,
           narration = excluded.narration,
           updated_at = now()
         returning id`,
        [receipt.receipt_no, receiptDate, studentId, student.full_name, narration ?? null, receipt.id],
      );

      const voucherId = voucherRes.rows[0]?.id as string;
      await client.query(`delete from accounting_voucher_lines where voucher_id = $1::uuid`, [voucherId]);

      await client.query(
        `insert into accounting_voucher_lines (voucher_id, ledger_code, debit, credit)
         values ($1::uuid, $2, $3, 0)`,
        [voucherId, ledgerCode, amount],
      );
      await client.query(
        `insert into accounting_voucher_lines (voucher_id, ledger_code, debit, credit)
         values ($1::uuid, 'DEBTORS_CTRL', 0, $2)`,
        [voucherId, amount],
      );

      await client.query("commit");
      return reply.code(201).send(insertRes.rows[0]);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });
}
