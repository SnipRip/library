import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getPool } from "../db/pool.js";

function isISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseISODate(value: unknown, fallback: string): string {
  if (!isISODate(value)) return fallback;
  // Basic sanity check: Date parsing.
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return fallback;
  return value;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PartyLedgerQuerySchema = z.object({
  studentId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const CompanyLedgerQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const BookQuerySchema = z.object({
  ledgerCode: z.enum(["CASH", "BANK", "UPI", "CARD"]).optional().default("CASH"),
  from: z.string().optional(),
  to: z.string().optional(),
});

const TrialBalanceQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const ProfitLossQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const BalanceSheetQuerySchema = z.object({
  asOf: z.string().optional(),
});

type LedgerRow = {
  id: string;
  txn_date: string;
  voucher_type: string;
  voucher_no: string;
  narration: string;
  debit: string | number;
  credit: string | number;
};

export async function registerReportRoutes(app: FastifyInstance) {
  // Profit & Loss (P&L)
  app.get("/reports/profit-loss", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = ProfitLossQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();
    const toDefault = todayISO();
    const fromDefault = `${toDefault.slice(0, 8)}01`;
    const from = parseISODate(parsed.data.from, fromDefault);
    const to = parseISODate(parsed.data.to, toDefault);
    if (from > to) {
      return reply.code(400).send({ message: "Invalid date range: from must be <= to" });
    }

    const sumsRes = await pool.query(
      `with sums as (
         select
           l.ledger_code,
           sum(l.debit) as debit,
           sum(l.credit) as credit
         from accounting_voucher_lines l
         join accounting_vouchers v on v.id = l.voucher_id
         where v.voucher_date >= $1::date
           and v.voucher_date <= $2::date
         group by l.ledger_code
       )
       select
         lg.code,
         lg.name,
         lg.nature,
         coalesce(s.debit, 0)::text as debit,
         coalesce(s.credit, 0)::text as credit
       from accounting_ledgers lg
       left join sums s on s.ledger_code = lg.code
       where lg.nature in ('income', 'expense')
       order by lg.nature asc, lg.name asc`,
      [from, to],
    );

    let totalIncome = 0;
    let totalExpense = 0;

    const incomeEntries: Array<{ ledgerCode: string; ledgerName: string; amount: number }> = [];
    const expenseEntries: Array<{ ledgerCode: string; ledgerName: string; amount: number }> = [];

    for (const r of sumsRes.rows as Array<{ code: string; name: string; nature: string; debit: string | number; credit: string | number }>) {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;

      if (r.nature === "income") {
        const amount = Math.max(0, credit - debit);
        totalIncome += amount;
        if (amount !== 0) incomeEntries.push({ ledgerCode: r.code, ledgerName: r.name, amount });
      } else if (r.nature === "expense") {
        const amount = Math.max(0, debit - credit);
        totalExpense += amount;
        if (amount !== 0) expenseEntries.push({ ledgerCode: r.code, ledgerName: r.name, amount });
      }
    }

    const netProfit = totalIncome - totalExpense;

    return reply.send({
      from,
      to,
      income: incomeEntries,
      expenses: expenseEntries,
      totals: {
        income: totalIncome,
        expenses: totalExpense,
        net: Math.abs(netProfit),
        netType: netProfit >= 0 ? ("Profit" as const) : ("Loss" as const),
      },
      note: "Profit & Loss is computed from voucher postings (income and expense ledgers).",
    });
  });

  // Balance Sheet (as-of)
  app.get("/reports/balance-sheet", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = BalanceSheetQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();
    const asOf = parseISODate(parsed.data.asOf, todayISO());

    const sumsRes = await pool.query(
      `with sums as (
         select
           l.ledger_code,
           sum(l.debit) as debit,
           sum(l.credit) as credit
         from accounting_voucher_lines l
         join accounting_vouchers v on v.id = l.voucher_id
         where v.voucher_date <= $1::date
         group by l.ledger_code
       )
       select
         lg.code,
         lg.name,
         lg.nature,
         coalesce(s.debit, 0)::text as debit,
         coalesce(s.credit, 0)::text as credit
       from accounting_ledgers lg
       left join sums s on s.ledger_code = lg.code
       order by lg.nature asc, lg.name asc`,
      [asOf],
    );

    const assets: Array<{ ledgerCode: string; ledgerName: string; amount: number; balanceType: "Dr" | "Cr" }> = [];
    const liabilities: Array<{ ledgerCode: string; ledgerName: string; amount: number; balanceType: "Dr" | "Cr" }> = [];

    let assetsNet = 0;
    let liabilitiesNet = 0;
    let incomeNet = 0;
    let expenseNet = 0;

    for (const r of sumsRes.rows as Array<{ code: string; name: string; nature: string; debit: string | number; credit: string | number }>) {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;

      if (r.nature === "asset") {
        const net = debit - credit;
        assetsNet += net;
        if (net !== 0) {
          assets.push({
            ledgerCode: r.code,
            ledgerName: r.name,
            amount: Math.abs(net),
            balanceType: net >= 0 ? "Dr" : "Cr",
          });
        }
      } else if (r.nature === "liability") {
        const net = credit - debit;
        liabilitiesNet += net;
        if (net !== 0) {
          liabilities.push({
            ledgerCode: r.code,
            ledgerName: r.name,
            amount: Math.abs(net),
            balanceType: net >= 0 ? "Cr" : "Dr",
          });
        }
      } else if (r.nature === "income") {
        incomeNet += credit - debit;
      } else if (r.nature === "expense") {
        expenseNet += debit - credit;
      }
    }

    const currentResult = incomeNet - expenseNet; // Profit (+) or Loss (-)

    const equityLine = {
      ledgerCode: "CURRENT_RESULT",
      ledgerName: "Current Period Result",
      amount: Math.abs(currentResult),
      balanceType: currentResult >= 0 ? ("Cr" as const) : ("Dr" as const),
    };
    if (currentResult !== 0) liabilities.push(equityLine);

    const liabilitiesPlusEquityNet = liabilitiesNet + currentResult;
    const difference = assetsNet - liabilitiesPlusEquityNet;

    return reply.send({
      asOf,
      assets: assets.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
      liabilities: liabilities.sort((a, b) => a.ledgerName.localeCompare(b.ledgerName)),
      totals: {
        assets: { amount: Math.abs(assetsNet), type: assetsNet >= 0 ? ("Dr" as const) : ("Cr" as const) },
        liabilities: {
          amount: Math.abs(liabilitiesPlusEquityNet),
          type: liabilitiesPlusEquityNet >= 0 ? ("Cr" as const) : ("Dr" as const),
        },
        difference: { amount: Math.abs(difference), type: difference === 0 ? ("Balanced" as const) : difference > 0 ? ("Assets higher" as const) : ("Liabilities higher" as const) },
      },
      note: "Balance Sheet is computed from voucher postings. Current period result is derived from income minus expense balances.",
    });
  });

  // Cash/Bank/UPI/Card book
  app.get("/reports/book", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = BookQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();

    const toDefault = todayISO();
    const fromDefault = `${toDefault.slice(0, 8)}01`;
    const from = parseISODate(parsed.data.from, fromDefault);
    const to = parseISODate(parsed.data.to, toDefault);
    if (from > to) {
      return reply.code(400).send({ message: "Invalid date range: from must be <= to" });
    }

    const ledgerCode = parsed.data.ledgerCode;

    const ledgerRes = await pool.query(
      `select code, name, nature
       from accounting_ledgers
       where code = $1
       limit 1`,
      [ledgerCode],
    );
    const ledger = ledgerRes.rows[0] as { code: string; name: string; nature: string } | undefined;
    if (!ledger) return reply.code(404).send({ message: "Ledger not found" });

    const openingRes = await pool.query(
      `select coalesce(sum(l.debit - l.credit), 0)::text as amount
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       where l.ledger_code = $1
         and v.voucher_date < $2::date`,
      [ledgerCode, from],
    );
    const openingAmount = Number(openingRes.rows?.[0]?.amount ?? 0) || 0;

    const rowsRes = await pool.query(
      `select
         v.id,
         v.voucher_date::text as txn_date,
         v.voucher_type,
         v.voucher_no,
         coalesce(s.full_name, v.party_name, '') as party_name,
         coalesce(v.narration, '') as narration,
         l.debit::text as debit,
         l.credit::text as credit,
         v.created_at
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       left join students s on s.id = v.party_student_id
       where l.ledger_code = $1
         and v.voucher_date >= $2::date
         and v.voucher_date <= $3::date
       order by v.voucher_date asc, v.voucher_type asc, v.voucher_no asc, v.created_at asc`,
      [ledgerCode, from, to],
    );

    let running = openingAmount;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = (rowsRes.rows as Array<{ id: string; txn_date: string; voucher_type: string; voucher_no: string; party_name: string; narration: string; debit: string | number; credit: string | number }>).map(
      (r) => {
        const debit = Number(r.debit) || 0;
        const credit = Number(r.credit) || 0;
        running += debit - credit;
        totalDebit += debit;
        totalCredit += credit;

        return {
          date: r.txn_date,
          voucherType: r.voucher_type,
          voucherNo: r.voucher_no,
          partyName: r.party_name,
          narration: r.narration,
          debit,
          credit,
          balance: Math.abs(running),
          balanceType: running >= 0 ? ("Dr" as const) : ("Cr" as const),
          refId: r.id,
        };
      },
    );

    const closing = running;

    return reply.send({
      ledger: { code: ledger.code, name: ledger.name, nature: ledger.nature },
      from,
      to,
      opening: { amount: Math.abs(openingAmount), type: openingAmount >= 0 ? ("Dr" as const) : ("Cr" as const) },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        closing: Math.abs(closing),
        closingType: closing >= 0 ? ("Dr" as const) : ("Cr" as const),
      },
      entries,
      note: "Book is based on double-entry postings for the selected cash/bank ledger.",
    });
  });

  // Trial Balance
  app.get("/reports/trial-balance", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = TrialBalanceQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();
    const toDefault = todayISO();
    const fromDefault = `${toDefault.slice(0, 8)}01`;
    const from = parseISODate(parsed.data.from, fromDefault);
    const to = parseISODate(parsed.data.to, toDefault);
    if (from > to) {
      return reply.code(400).send({ message: "Invalid date range: from must be <= to" });
    }

    const rowsRes = await pool.query(
      `with sums as (
         select
           l.ledger_code,
           sum(l.debit) as debit,
           sum(l.credit) as credit
         from accounting_voucher_lines l
         join accounting_vouchers v on v.id = l.voucher_id
         where v.voucher_date >= $1::date
           and v.voucher_date <= $2::date
         group by l.ledger_code
       )
       select
         lg.code,
         lg.name,
         lg.nature,
         coalesce(s.debit, 0)::text as debit,
         coalesce(s.credit, 0)::text as credit
       from accounting_ledgers lg
       left join sums s on s.ledger_code = lg.code
       order by lg.nature asc, lg.name asc`,
      [from, to],
    );

    let totalDebit = 0;
    let totalCredit = 0;
    let totalNetDr = 0;
    let totalNetCr = 0;

    const entries = (rowsRes.rows as Array<{ code: string; name: string; nature: string; debit: string | number; credit: string | number }>).map(
      (r) => {
        const debit = Number(r.debit) || 0;
        const credit = Number(r.credit) || 0;
        totalDebit += debit;
        totalCredit += credit;

        const net = debit - credit;
        const netDr = net > 0 ? net : 0;
        const netCr = net < 0 ? Math.abs(net) : 0;
        totalNetDr += netDr;
        totalNetCr += netCr;

        return {
          ledgerCode: r.code,
          ledgerName: r.name,
          nature: r.nature,
          debit,
          credit,
          netDr,
          netCr,
        };
      },
    );

    return reply.send({
      from,
      to,
      totals: { debit: totalDebit, credit: totalCredit, netDr: totalNetDr, netCr: totalNetCr },
      entries,
      note: "Trial Balance shows totals from voucher postings for the selected period.",
    });
  });

  app.get("/reports/party-ledger", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = PartyLedgerQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();

    const toDefault = todayISO();
    const fromDefault = `${toDefault.slice(0, 8)}01`;

    const from = parseISODate(parsed.data.from, fromDefault);
    const to = parseISODate(parsed.data.to, toDefault);

    if (from > to) {
      return reply.code(400).send({ message: "Invalid date range: from must be <= to" });
    }

    const studentId = parsed.data.studentId;

    const studentRes = await pool.query(
      `select id, full_name, phone
       from students
       where id = $1
       limit 1`,
      [studentId],
    );
    const student = studentRes.rows[0] as { id: string; full_name: string; phone: string } | undefined;
    if (!student) return reply.code(404).send({ message: "Student not found" });

    const openingRes = await pool.query(
      `select coalesce(sum(l.debit - l.credit), 0)::text as amount
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       where v.party_student_id = $1::uuid
         and l.ledger_code = 'DEBTORS_CTRL'
         and v.voucher_date < $2::date`,
      [studentId, from],
    );

    const openingAmount = Number(openingRes.rows?.[0]?.amount ?? 0) || 0;

    const rowsRes = await pool.query(
      `select
         v.id,
         v.voucher_date::text as txn_date,
         v.voucher_type,
         v.voucher_no,
         coalesce(v.narration, '') as narration,
         l.debit::text as debit,
         l.credit::text as credit,
         v.created_at
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       where v.party_student_id = $1::uuid
         and l.ledger_code = 'DEBTORS_CTRL'
         and v.voucher_date >= $2::date
         and v.voucher_date <= $3::date
       order by v.voucher_date asc, v.voucher_type asc, v.voucher_no asc, v.created_at asc`,
      [studentId, from, to],
    );

    let running = openingAmount;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = (rowsRes.rows as LedgerRow[]).map((r) => {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;

      running += debit - credit;
      totalDebit += debit;
      totalCredit += credit;

      return {
        date: r.txn_date,
        voucherType: r.voucher_type,
        voucherNo: r.voucher_no,
        narration: r.narration,
        debit,
        credit,
        balance: Math.abs(running),
        balanceType: running >= 0 ? "Dr" : "Cr" as "Dr" | "Cr",
        refId: r.id,
      };
    });

    const closing = running;

    return reply.send({
      party: { id: student.id, name: student.full_name, phone: student.phone },
      from,
      to,
      opening: {
        amount: Math.abs(openingAmount),
        type: openingAmount >= 0 ? "Dr" : "Cr" as "Dr" | "Cr",
      },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        closing: Math.abs(closing),
        closingType: closing >= 0 ? "Dr" : "Cr" as "Dr" | "Cr",
      },
      entries,
      note: "Ledger is based on double-entry postings (Debtors Control).",
    });
  });

  // Company-wide control ledger (Outstanding control): Invoices (Dr) - Receipts (Cr)
  app.get("/reports/company-ledger", async (req, reply) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return reply.code(auth.status).send({ message: "Unauthorized" });

    const parsed = CompanyLedgerQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid query", errors: parsed.error.issues });
    }

    const pool = getPool();

    const toDefault = todayISO();
    const fromDefault = `${toDefault.slice(0, 8)}01`;
    const from = parseISODate(parsed.data.from, fromDefault);
    const to = parseISODate(parsed.data.to, toDefault);
    if (from > to) {
      return reply.code(400).send({ message: "Invalid date range: from must be <= to" });
    }

    const openingRes = await pool.query(
      `select coalesce(sum(l.debit - l.credit), 0)::text as amount
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       where l.ledger_code = 'DEBTORS_CTRL'
         and v.voucher_date < $1::date`,
      [from],
    );
    const openingAmount = Number(openingRes.rows?.[0]?.amount ?? 0) || 0;

    const rowsRes = await pool.query(
      `select
         v.id,
         v.voucher_date::text as txn_date,
         v.voucher_type,
         v.voucher_no,
         coalesce(s.full_name, v.party_name, 'Unknown') as party_name,
         coalesce(v.narration, '') as narration,
         l.debit::text as debit,
         l.credit::text as credit,
         v.created_at
       from accounting_vouchers v
       join accounting_voucher_lines l on l.voucher_id = v.id
       left join students s on s.id = v.party_student_id
       where l.ledger_code = 'DEBTORS_CTRL'
         and v.voucher_date >= $1::date
         and v.voucher_date <= $2::date
       order by v.voucher_date asc, v.voucher_type asc, v.voucher_no asc, v.created_at asc`,
      [from, to],
    );

    let running = openingAmount;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries = (rowsRes.rows as Array<{ id: string; txn_date: string; voucher_type: string; voucher_no: string; party_name: string; narration: string; debit: string | number; credit: string | number }>).map(
      (r) => {
        const debit = Number(r.debit) || 0;
        const credit = Number(r.credit) || 0;
        running += debit - credit;
        totalDebit += debit;
        totalCredit += credit;

        return {
          date: r.txn_date,
          voucherType: r.voucher_type,
          voucherNo: r.voucher_no,
          partyName: r.party_name,
          narration: r.narration,
          debit,
          credit,
          balance: Math.abs(running),
          balanceType: running >= 0 ? ("Dr" as const) : ("Cr" as const),
          refId: r.id,
        };
      },
    );

    const closing = running;

    return reply.send({
      from,
      to,
      opening: {
        amount: Math.abs(openingAmount),
        type: openingAmount >= 0 ? ("Dr" as const) : ("Cr" as const),
      },
      totals: {
        debit: totalDebit,
        credit: totalCredit,
        closing: Math.abs(closing),
        closingType: closing >= 0 ? ("Dr" as const) : ("Cr" as const),
      },
      entries,
      note: "Company ledger (control) is based on double-entry postings (Debtors Control).",
    });
  });
}
