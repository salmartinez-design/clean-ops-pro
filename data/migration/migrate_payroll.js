'use strict';

// ─── PAYROLL HISTORY MIGRATION: MaidCentral → Qleno ──────────────────────────
// Imports 2025 full-year and 2026 YTD payroll summaries for 10 active employees
// Source PDFs:
//   Employee_Payroll_Summary_(Realtime)_-_Phes_(1)_*.pdf  → 2025 full year
//   Employee_Payroll_Summary_(Realtime)_-_Phes_*.pdf      → 2026 YTD
// Run: node data/migration/migrate_payroll.js
// Stops after dry run — type YES to proceed.
// ─────────────────────────────────────────────────────────────────────────────

const { Client } = require('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg');
const readline = require('readline');

const COMPANY_ID = 1;

// ── MC ID → Qleno user_id (matched by email from users table) ─────────────────
// 42877 Alejandra Cuervo   → id=41  acuervo68@yahoo.com
// 26452 Rosa Gallegos      → id=36  rosagallegos882@yahoo.com
// 47897 Juliana Loredo     → id=42  loredo_juliana@yahoo.com  (2026 only)
// 32094 Guadalupe Mejia    → id=40  beltran1986gm@gmail.com
// 26448 Tatiana Merchan    → id=33  kh4180664@gmail.com
// 26443 Norma Puga         → id=32  normalpuga@gmail.com
// 49146 Juan Salazar       → id=43  elmagikk18@gmail.com      (2026 only)
// 30618 Alma Salinas       → id=39  salinasalma697@gmail.com
// 26449 Ana Valdez         → id=34  anaedith1602@gmail.com
// 29567 Diana Vasquez      → id=38  diana_vazquez1985@icloud.com

// Columns in order (matching PDF):
// total_job_hours, paid_job_hours, total_allowed_hours, paid_allowed_hours,
// drive_office_hours, clock_hours, commission_pay, team_hourly_travel_pay,
// hourly_pay, additional_pay, gross_wages_before_sp_ot, avg_wages_before_sp_ot,
// bonus, supplemental_pay, gross_wage_before_ot, avg_wage_before_ot,
// overtime, overtime_hours, gross_wage_with_ot, avg_wage_with_ot,
// tips, sick_pay, sick_hours, holiday_pay, vacation_pay, vacation_hours,
// gross_wage, avg_wage, reimbursements

const RECORDS = [
  // ── 2025 FULL YEAR ───────────────────────────────────────────────────────────
  {
    mc_employee_id: '42877', employee_id: 41, name: 'Alejandra Cuervo',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [341.64,6.64,452.22,72.39,25.29,366.93,8452.52,132.80,1127.80,90.23,
        9803.35,26.72,0.00,0.00,9803.35,26.72,4367.78,326.93,14171.13,38.62,
        34.98,144.00,8.00,288.00,0.00,0.00,14638.11,39.89,65.91],
  },
  {
    mc_employee_id: '26452', employee_id: 36, name: 'Rosa Gallegos',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [727.25,650.05,730.38,4.00,22.39,749.64,1504.80,11791.90,167.12,222.00,
        13685.82,18.26,0.00,1306.98,14992.80,20.00,7096.40,709.64,22089.20,29.47,
        0.00,0.00,0.00,0.00,0.00,0.00,22089.20,29.47,0.00],
  },
  {
    mc_employee_id: '32094', employee_id: 40, name: 'Guadalupe Mejia',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [438.17,16.73,594.37,76.62,36.86,475.03,10842.67,318.18,1360.00,-204.90,
        12315.95,25.93,164.00,0.00,12479.95,26.27,5714.12,435.03,18194.07,38.30,
        458.61,0.00,0.00,432.00,144.00,8.00,19228.68,40.48,104.70],
  },
  {
    mc_employee_id: '26448', employee_id: 33, name: 'Tatiana Merchan',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [99.19,93.72,88.33,0.00,3.69,102.88,98.33,1786.69,0.00,0.00,
        1885.02,18.32,0.00,172.58,2057.60,20.00,628.80,62.88,2686.40,26.11,
        36.00,0.00,0.00,0.00,0.00,0.00,2722.40,26.46,0.00],
  },
  {
    mc_employee_id: '26443', employee_id: 32, name: 'Norma Puga',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [1506.06,125.50,1632.65,106.47,10.06,1516.12,32141.30,2455.63,1481.40,230.00,
        36308.33,23.95,450.00,0.00,36758.33,24.25,17897.96,1476.12,54656.29,36.05,
        441.37,288.00,8.00,432.00,558.00,23.00,56375.66,37.18,0.00],
  },
  {
    mc_employee_id: '30618', employee_id: 39, name: 'Alma Salinas',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [826.91,826.91,931.36,0.00,139.24,966.15,0.00,0.00,29.80,25.74,
        55.54,0.06,0.00,19267.46,19323.00,20.00,9261.50,926.15,28584.50,29.59,
        0.00,0.00,0.00,0.00,0.00,0.00,28584.50,29.59,0.00],
  },
  {
    mc_employee_id: '26449', employee_id: 34, name: 'Ana Valdez',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [1133.90,110.33,1201.43,101.20,22.31,1156.21,24328.54,2083.11,1139.80,201.75,
        27753.20,24.00,160.00,0.00,27913.20,24.14,13472.65,1116.21,41385.85,35.79,
        275.84,288.00,16.00,432.00,504.00,24.00,42885.69,37.09,0.00],
  },
  {
    mc_employee_id: '29567', employee_id: 38, name: 'Diana Vasquez',
    period_label: '2025-full', period_start: '2025-01-01', period_end: '2025-12-31',
    d: [1364.05,325.60,1397.17,139.15,101.90,1465.95,21769.60,6225.58,1743.40,58.60,
        29797.18,20.33,100.00,0.00,29897.18,20.39,14537.56,1425.95,44434.74,30.31,
        1304.75,720.00,32.00,432.00,144.00,8.00,47035.49,32.09,-60.80],
  },

  // ── 2026 YTD (Jan 1 – Mar 23, 2026) ─────────────────────────────────────────
  {
    mc_employee_id: '42877', employee_id: 41, name: 'Alejandra Cuervo',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [210.50,1.38,319.98,38.00,1.53,212.03,6342.39,27.60,370.00,144.53,
        6884.52,32.47,160.00,0.00,7044.52,33.22,2857.42,172.03,9901.94,46.70,
        10.00,360.00,12.00,160.00,0.00,0.00,10431.94,49.20,20.77],
  },
  {
    mc_employee_id: '26452', employee_id: 36, name: 'Rosa Gallegos',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [129.94,121.94,129.01,4.00,0.00,129.94,80.00,2438.80,80.00,0.00,
        2598.80,20.00,0.00,0.00,2598.80,20.00,899.40,89.94,3498.20,26.92,
        0.00,0.00,0.00,0.00,0.00,0.00,3498.20,26.92,0.00],
  },
  {
    mc_employee_id: '47897', employee_id: 42, name: 'Juliana Loredo',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [174.44,62.83,127.11,25.00,1.45,175.89,2259.59,1314.69,535.00,49.30,
        4158.58,23.64,0.00,0.00,4158.58,23.64,1606.22,135.89,5764.80,32.78,
        35.00,0.00,0.00,0.00,0.00,0.00,5799.80,32.97,0.00],
  },
  {
    mc_employee_id: '32094', employee_id: 40, name: 'Guadalupe Mejia',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [134.68,4.22,234.26,36.52,0.89,135.57,4088.28,84.40,400.40,0.02,
        4573.10,33.73,49.00,0.00,4622.10,34.09,1628.99,95.57,6251.09,46.11,
        218.00,310.00,16.00,160.00,0.00,0.00,6939.09,51.18,0.00],
  },
  {
    mc_employee_id: '26448', employee_id: 33, name: 'Tatiana Merchan',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [11.78,11.78,13.50,0.00,0.00,11.78,0.00,235.60,0.00,0.00,
        235.60,20.00,0.00,0.00,235.60,20.00,0.00,0.00,235.60,20.00,
        0.00,0.00,0.00,0.00,0.00,0.00,235.60,20.00,0.00],
  },
  {
    mc_employee_id: '26443', employee_id: 32, name: 'Norma Puga',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [329.13,8.90,415.19,53.51,2.84,331.97,7525.82,178.00,214.20,1.34,
        7919.36,23.86,229.57,0.00,8148.93,24.55,3583.93,291.97,11732.86,35.34,
        10.00,160.00,0.00,160.00,690.00,24.00,12752.86,38.42,13.92],
  },
  {
    mc_employee_id: '49146', employee_id: 43, name: 'Juan Salazar',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [28.68,23.98,24.05,3.00,0.04,28.72,0.00,422.60,60.00,0.00,
        482.60,16.80,0.00,91.80,574.40,20.00,0.00,0.00,574.40,20.00,
        35.00,0.00,0.00,0.00,0.00,0.00,609.40,21.22,0.00],
  },
  {
    mc_employee_id: '30618', employee_id: 39, name: 'Alma Salinas',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [345.61,214.74,367.64,103.70,1.59,347.20,897.89,576.40,2070.60,30.00,
        3574.89,10.30,100.00,3369.11,7044.00,20.29,3116.54,307.20,10160.54,29.26,
        20.00,0.00,0.00,0.00,0.00,0.00,10180.54,29.32,0.00],
  },
  {
    mc_employee_id: '26449', employee_id: 34, name: 'Ana Valdez',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [248.99,13.42,341.59,85.49,4.05,253.04,5304.82,268.40,585.40,-12.94,
        6145.68,24.29,170.00,0.00,6315.68,24.96,2658.74,213.04,8974.42,35.47,
        0.00,800.00,34.00,160.00,160.00,16.00,10094.42,39.89,0.00],
  },
  {
    mc_employee_id: '29567', employee_id: 38, name: 'Diana Vasquez',
    period_label: '2026-ytd', period_start: '2026-01-01', period_end: '2026-03-23',
    d: [344.80,85.70,368.55,43.50,3.11,347.91,5156.83,1714.00,716.40,-40.00,
        7547.23,21.69,0.00,0.00,7547.23,21.69,3339.28,307.91,10886.51,31.29,
        553.00,0.00,0.00,160.00,0.00,0.00,11599.51,33.34,0.00],
  },
];

function fmt(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ── 1. Create table if not exists ─────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS employee_payroll_history (
      id                        SERIAL PRIMARY KEY,
      company_id                INTEGER NOT NULL,
      employee_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mc_employee_id            TEXT,
      period_label              TEXT NOT NULL,
      period_start              DATE NOT NULL,
      period_end                DATE NOT NULL,
      total_job_hours           NUMERIC(10,2) DEFAULT 0,
      paid_job_hours            NUMERIC(10,2) DEFAULT 0,
      total_allowed_hours       NUMERIC(10,2) DEFAULT 0,
      paid_allowed_hours        NUMERIC(10,2) DEFAULT 0,
      drive_office_hours        NUMERIC(10,2) DEFAULT 0,
      clock_hours               NUMERIC(10,2) DEFAULT 0,
      commission_pay            NUMERIC(12,2) DEFAULT 0,
      team_hourly_travel_pay    NUMERIC(12,2) DEFAULT 0,
      hourly_pay                NUMERIC(12,2) DEFAULT 0,
      additional_pay            NUMERIC(12,2) DEFAULT 0,
      gross_wages_before_sp_ot  NUMERIC(12,2) DEFAULT 0,
      avg_wages_before_sp_ot    NUMERIC(10,4) DEFAULT 0,
      bonus                     NUMERIC(12,2) DEFAULT 0,
      supplemental_pay          NUMERIC(12,2) DEFAULT 0,
      gross_wage_before_ot      NUMERIC(12,2) DEFAULT 0,
      avg_wage_before_ot        NUMERIC(10,4) DEFAULT 0,
      overtime                  NUMERIC(12,2) DEFAULT 0,
      overtime_hours            NUMERIC(10,2) DEFAULT 0,
      gross_wage_with_ot        NUMERIC(12,2) DEFAULT 0,
      avg_wage_with_ot          NUMERIC(10,4) DEFAULT 0,
      tips                      NUMERIC(12,2) DEFAULT 0,
      sick_pay                  NUMERIC(12,2) DEFAULT 0,
      sick_hours                NUMERIC(10,2) DEFAULT 0,
      holiday_pay               NUMERIC(12,2) DEFAULT 0,
      vacation_pay              NUMERIC(12,2) DEFAULT 0,
      vacation_hours            NUMERIC(10,2) DEFAULT 0,
      gross_wage                NUMERIC(12,2) DEFAULT 0,
      avg_wage                  NUMERIC(10,4) DEFAULT 0,
      reimbursements            NUMERIC(12,2) DEFAULT 0,
      migration_source          TEXT DEFAULT 'mc_import',
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(employee_id, period_label)
    );
  `);
  console.log('[migrate_payroll] Table employee_payroll_history ensured.');

  // ── 2. DRY RUN ────────────────────────────────────────────────────────────
  const records2025 = RECORDS.filter(r => r.period_label === '2025-full');
  const records2026 = RECORDS.filter(r => r.period_label === '2026-ytd');

  const employees2025 = [...new Set(records2025.map(r => r.name))];
  const employees2026 = [...new Set(records2026.map(r => r.name))];
  const allEmployees  = [...new Set(RECORDS.map(r => r.name))];

  console.log('\nPAYROLL HISTORY DRY RUN');
  console.log('=======================');
  console.log(`Employees matched and ready to import: ${allEmployees.length} of 10`);
  console.log(`2025 full-year records to insert:      ${records2025.length}`);
  console.log(`2026 YTD records to insert:            ${records2026.length}`);
  console.log(`Total records:                         ${RECORDS.length}`);
  console.log('');
  console.log('Per employee preview:');
  console.log(
    'Name'.padEnd(22) + 'MC ID'.padEnd(8) +
    '2025 Gross'.padEnd(16) + '2026 YTD Gross'
  );
  console.log('-'.repeat(62));

  for (const emp of allEmployees) {
    const r25 = records2025.find(r => r.name === emp);
    const r26 = records2026.find(r => r.name === emp);
    const gross25 = r25 ? fmt(r25.d[26]) : '(no data)';
    const gross26 = r26 ? fmt(r26.d[26]) : '(no data)';
    const mcId = (r25 || r26).mc_employee_id;
    console.log(emp.padEnd(22) + mcId.padEnd(8) + gross25.padEnd(16) + gross26);
  }

  console.log('');
  console.log('Expected 2025 gross_wage verification:');
  const verifyExpected = {
    'Norma Puga':     56375.66,
    'Alma Salinas':   28584.50,
    'Ana Valdez':     42885.69,
    'Diana Vasquez':  47035.49,
    'Alejandra Cuervo': 14638.11, // Note: user prompt cited $10,431.94 (that is the 2026 YTD figure)
  };
  let verifyPass = true;
  for (const [name, expected] of Object.entries(verifyExpected)) {
    const rec = records2025.find(r => r.name === name);
    const actual = rec ? rec.d[26] : null;
    const ok = actual !== null && Math.abs(actual - expected) < 0.01;
    if (!ok) verifyPass = false;
    console.log(`  ${name}: ${rec ? fmt(actual) : 'MISSING'} ${ok ? '✓' : `✗ (expected ${fmt(expected)})`}`);
  }
  console.log('');
  if (verifyPass) {
    console.log('✓ All verification totals match.');
  } else {
    console.log('⚠  Some totals differ — review before proceeding.');
  }

  console.log('');
  console.log('Skipped (terminated / no match):');
  console.log('  28511 Generic Cleaner, 33999 Delia Martinez, and 15 others');
  console.log('');

  // ── 3. Confirm ────────────────────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => rl.question('Confirm? Reply YES to execute: ', resolve));
  rl.close();

  if (answer.trim().toUpperCase() !== 'YES') {
    console.log('Aborted — no changes made.');
    await client.end();
    return;
  }

  // ── 4. INSERT ─────────────────────────────────────────────────────────────
  let inserted = 0;
  for (const r of RECORDS) {
    const [
      total_job_hours, paid_job_hours, total_allowed_hours, paid_allowed_hours,
      drive_office_hours, clock_hours, commission_pay, team_hourly_travel_pay,
      hourly_pay, additional_pay, gross_wages_before_sp_ot, avg_wages_before_sp_ot,
      bonus, supplemental_pay, gross_wage_before_ot, avg_wage_before_ot,
      overtime, overtime_hours, gross_wage_with_ot, avg_wage_with_ot,
      tips, sick_pay, sick_hours, holiday_pay, vacation_pay, vacation_hours,
      gross_wage, avg_wage, reimbursements,
    ] = r.d;

    await client.query(`
      INSERT INTO employee_payroll_history (
        company_id, employee_id, mc_employee_id,
        period_label, period_start, period_end,
        total_job_hours, paid_job_hours, total_allowed_hours, paid_allowed_hours,
        drive_office_hours, clock_hours, commission_pay, team_hourly_travel_pay,
        hourly_pay, additional_pay, gross_wages_before_sp_ot, avg_wages_before_sp_ot,
        bonus, supplemental_pay, gross_wage_before_ot, avg_wage_before_ot,
        overtime, overtime_hours, gross_wage_with_ot, avg_wage_with_ot,
        tips, sick_pay, sick_hours, holiday_pay, vacation_pay, vacation_hours,
        gross_wage, avg_wage, reimbursements, migration_source
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
        $33,$34,$35,'mc_import'
      )
      ON CONFLICT (employee_id, period_label) DO NOTHING
    `, [
      COMPANY_ID, r.employee_id, r.mc_employee_id,
      r.period_label, r.period_start, r.period_end,
      total_job_hours, paid_job_hours, total_allowed_hours, paid_allowed_hours,
      drive_office_hours, clock_hours, commission_pay, team_hourly_travel_pay,
      hourly_pay, additional_pay, gross_wages_before_sp_ot, avg_wages_before_sp_ot,
      bonus, supplemental_pay, gross_wage_before_ot, avg_wage_before_ot,
      overtime, overtime_hours, gross_wage_with_ot, avg_wage_with_ot,
      tips, sick_pay, sick_hours, holiday_pay, vacation_pay, vacation_hours,
      gross_wage, avg_wage, reimbursements,
    ]);
    inserted++;
    console.log(`  ✓ Inserted: ${r.name} (${r.period_label})`);
  }

  // ── 5. POST-IMPORT VERIFICATION ───────────────────────────────────────────
  console.log('');
  console.log('POST-IMPORT VERIFICATION');
  console.log('========================');

  const { rows: countRows } = await client.query(
    `SELECT COUNT(*) AS total FROM employee_payroll_history WHERE company_id = $1`, [COMPANY_ID]
  );
  console.log(`1. Total rows inserted: ${countRows[0].total}`);

  const { rows: empRows } = await client.query(`
    SELECT u.first_name || ' ' || u.last_name AS name,
           COUNT(*) AS periods
    FROM employee_payroll_history ph
    JOIN users u ON u.id = ph.employee_id
    WHERE ph.company_id = $1
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY name
  `, [COMPANY_ID]);
  console.log('2. Records per employee:');
  for (const row of empRows) {
    console.log(`   ${row.name}: ${row.periods} record(s)`);
  }

  const { rows: topRows } = await client.query(`
    SELECT u.first_name || ' ' || u.last_name AS name, ph.gross_wage
    FROM employee_payroll_history ph
    JOIN users u ON u.id = ph.employee_id
    WHERE ph.company_id = $1 AND ph.period_label = '2025-full'
    ORDER BY ph.gross_wage DESC
    LIMIT 3
  `, [COMPANY_ID]);
  console.log('3. Top 3 by 2025 gross_wage:');
  for (const row of topRows) {
    console.log(`   ${row.name}: ${fmt(parseFloat(row.gross_wage))}`);
  }
  console.log('   Expected: Norma Puga $56,375.66, Diana Vasquez $47,035.49, Ana Valdez $42,885.69');

  const { rows: termCheck } = await client.query(`
    SELECT COUNT(*) AS cnt FROM employee_payroll_history
    WHERE mc_employee_id IN ('28511','33999','33167','41081','46276','35755',
      '36462','26442','26444','40489','37540','36772','42255','30172','39371',
      '33782','36932')
  `);
  console.log(`4. Terminated employees imported: ${termCheck[0].cnt} (expected: 0)`);

  console.log('');
  console.log(`Migration complete — ${inserted} rows inserted.`);
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
