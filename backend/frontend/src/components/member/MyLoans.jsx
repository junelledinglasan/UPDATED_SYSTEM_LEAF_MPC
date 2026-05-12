import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import "./MyLoans.css";

const LOANS = [
  {
    loanId: "LN-2026-004", loanType: "Salary Loan", principal: 12000,
    balance: 3000, monthlyDue: 1200, term: 12, released: "2025-04-01",
    dueDate: "2026-04-01", status: "Current", interest: 5,
    payments: [
      { date:"2026-03-17", amount:1200, balance:3000,  hash:"ha4jbac28k01eedr-j7" },
      { date:"2026-02-15", amount:1200, balance:4200,  hash:"hx9kzab34m02ffes-p3" },
      { date:"2026-01-14", amount:1200, balance:5400,  hash:"hb2mnat56q03ggft-r8" },
      { date:"2025-12-10", amount:1200, balance:6600,  hash:"hc7plcb72s04hhgu-t1" },
      { date:"2025-11-12", amount:1200, balance:7800,  hash:"hd3rndc89u05iihv-w5" },
      { date:"2025-10-08", amount:1200, balance:9000,  hash:"he8smec95v06jjkw-y9" },
      { date:"2025-09-11", amount:1200, balance:10200, hash:"hf1tnfd96w07kklx-z2" },
      { date:"2025-08-09", amount:1200, balance:11400, hash:"hg3uoge07x08llmy-a4" },
      { date:"2025-07-07", amount:1200, balance:12000, hash:"hh5vphf18y09mmzb-b6" },
    ],
  },
];

export default function MyLoans() {
  const ctx    = useOutletContext() || {};
  const [selectedLoan, setSelected] = useState(LOANS[0]);
  const [tab, setTab] = useState("details");

  const paidPct  = Math.round(((selectedLoan.principal - selectedLoan.balance) / selectedLoan.principal) * 100);
  const totalPaid = selectedLoan.principal - selectedLoan.balance;
  const totalInterest = (selectedLoan.principal * (selectedLoan.interest / 100 / 12) * selectedLoan.term).toFixed(2);

  return (
    <div className="ml-wrapper">
      <div className="ml-page-header">
        <div className="ml-page-title">My Loans</div>
        <div className="ml-page-sub">View your active loans, payment history, and blockchain records.</div>
      </div>

      {/* Loan selector */}
      <div className="ml-loan-cards">
        {LOANS.map(loan => (
          <div
            key={loan.loanId}
            className={`ml-loan-card ${selectedLoan.loanId === loan.loanId ? "selected" : ""}`}
            onClick={() => setSelected(loan)}
          >
            <div className="ml-lc-header">
              <span className="ml-lc-type">{loan.loanType}</span>
              <span className={`ml-lc-status ${loan.status.toLowerCase()}`}>{loan.status}</span>
            </div>
            <div className="ml-lc-id">{loan.loanId}</div>
            <div className="ml-lc-balance">₱{loan.balance.toLocaleString()}</div>
            <div className="ml-lc-label">remaining balance</div>
            <div className="ml-lc-bar">
              <div className="ml-lc-fill" style={{ width: paidPct + "%" }} />
            </div>
            <div className="ml-lc-pct">{paidPct}% paid</div>
          </div>
        ))}
      </div>

      {/* Detail tabs */}
      <div className="ml-detail-card">
        <div className="ml-tabs">
          {["details","payments","schedule"].map(t => (
            <button key={t} className={`ml-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "details" ? "Loan Details" : t === "payments" ? "Payment History" : "Amortization"}
            </button>
          ))}
        </div>

        {/* Details tab */}
        {tab === "details" && (
          <div className="ml-details-grid">
            {[
              ["Loan ID",       selectedLoan.loanId],
              ["Loan Type",     selectedLoan.loanType],
              ["Principal",     `₱${selectedLoan.principal.toLocaleString()}`],
              ["Remaining",     `₱${selectedLoan.balance.toLocaleString()}`],
              ["Total Paid",    `₱${totalPaid.toLocaleString()}`],
              ["Monthly Due",   `₱${selectedLoan.monthlyDue.toLocaleString()}`],
              ["Term",          `${selectedLoan.term} months`],
              ["Interest Rate", `${selectedLoan.interest}% per annum`],
              ["Release Date",  selectedLoan.released],
              ["Next Due",      selectedLoan.dueDate],
              ["Status",        selectedLoan.status],
              ["Total Interest",`₱${totalInterest}`],
            ].map(([k,v]) => (
              <div key={k} className="ml-detail-item">
                <span className="ml-dk">{k}</span>
                <span className={`ml-dv ${k==="Remaining"?"red":k==="Total Paid"?"green":k==="Status"?"status-badge":""}`}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Payments tab */}
        {tab === "payments" && (
          <div className="ml-payments-table-wrap">
            <table className="ml-payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount Paid</th>
                  <th>Balance After</th>
                  <th>SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                {selectedLoan.payments.map((p, i) => (
                  <tr key={i}>
                    <td className="cell-date">{p.date}</td>
                    <td className="green fw">₱{p.amount.toLocaleString()}</td>
                    <td className="blue">₱{p.balance.toLocaleString()}</td>
                    <td><span className="hash-text">{p.hash}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Schedule tab */}
        {tab === "schedule" && (
          <div className="ml-payments-table-wrap">
            <table className="ml-payments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: selectedLoan.term }, (_, i) => {
                  const d = new Date(selectedLoan.released);
                  d.setMonth(d.getMonth() + i + 1);
                  const paid = i < selectedLoan.payments.length;
                  return (
                    <tr key={i}>
                      <td className="cell-center">{i + 1}</td>
                      <td className="cell-date">{d.toISOString().slice(0,10)}</td>
                      <td className="fw">₱{selectedLoan.monthlyDue.toLocaleString()}</td>
                      <td>
                        <span className={`ml-sched-badge ${paid ? "paid" : "upcoming"}`}>
                          {paid ? "✓ Paid" : "Upcoming"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}