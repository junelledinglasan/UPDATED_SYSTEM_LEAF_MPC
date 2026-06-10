import { useState, useEffect } from "react";
import { getLoansAPI } from "../../api/loans";
import { getPaymentsAPI } from "../../api/payments";
import { useOutletContext } from "react-router-dom";
import "./MyLoans.css";

export default function MyLoans() {
  const ctx    = useOutletContext() || {};
  const [loans,        setLoans]    = useState([]);
  const [payments,     setPayments] = useState([]);
  const [selectedLoan, setSelected] = useState(null);
  const [tab,          setTab]      = useState("details");
  const [loading,      setLoading]  = useState(true);

  useEffect(() => {
    Promise.allSettled([getLoansAPI(), getPaymentsAPI()])
      .then(([l, p]) => {
        if (l.status==="fulfilled") {
          const activeLoans = l.value.filter(loan => loan.status === "Active" || loan.status === "Overdue");
          setLoans(activeLoans);
          if (activeLoans.length > 0) setSelected(activeLoans[0]);
        }
        if (p.status==="fulfilled") setPayments(p.value);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign:"center",padding:"60px",color:"#aaa"}}>Loading loans...</div>;
  if (!loans.length) return (
    <div style={{textAlign:"center",padding:"60px",color:"#aaa"}}>
      <div style={{fontSize:40,marginBottom:12}}>📭</div>
      <div style={{fontWeight:600}}>No active loans.</div>
      <div style={{fontSize:12,marginTop:4}}>You have no active loan records at the moment.</div>
    </div>
  );

  const principal  = parseFloat(selectedLoan?.amount || 0);
  const balance    = parseFloat(selectedLoan?.balance || 0);
  const totalPaid  = principal - balance;
  const monthlyDue = parseFloat(selectedLoan?.monthly_due || 0);
  const paidPct    = principal > 0 ? Math.round((totalPaid / principal) * 100) : 0;
  const totalInterest = (parseFloat(selectedLoan?.interest_amount || 0)).toFixed(2);

  return (
    <div className="ml-wrapper">
      <div className="ml-page-header">
        <div className="ml-page-title">My Loans</div>
        <div className="ml-page-sub">View your active loans, payment history, and blockchain records.</div>
      </div>

      {/* Loan selector */}
      <div className="ml-loan-cards">
        {loans.map(loan => {
          const loanPrincipal = parseFloat(loan.amount || 0);
          const loanBalance   = parseFloat(loan.balance || 0);
          const loanPaidPct   = loanPrincipal > 0 ? Math.round(((loanPrincipal - loanBalance) / loanPrincipal) * 100) : 0;
          return (
            <div
              key={loan.loan_id}
              className={`ml-loan-card ${selectedLoan?.loan_id === loan.loan_id ? "selected" : ""}`}
              onClick={() => { setSelected(loan); setTab("details"); }}
            >
              <div className="ml-lc-header">
                <span className="ml-lc-type">{loan.loan_type}</span>
                <span className={`ml-lc-status ${(loan.status||"").toLowerCase()}`}>{loan.status}</span>
              </div>
              <div className="ml-lc-id">{loan.loan_id}</div>
              <div className="ml-lc-balance">₱{Number(loan.balance).toLocaleString()}</div>
              <div className="ml-lc-label">remaining balance</div>
              <div className="ml-lc-bar">
                <div className="ml-lc-fill" style={{ width: loanPaidPct + "%" }} />
              </div>
              <div className="ml-lc-pct">{loanPaidPct}% paid</div>
            </div>
          );
        })}
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
              ["Loan ID",       selectedLoan?.loan_id],
              ["Loan Type",     selectedLoan?.loan_type],
              ["Principal",     `₱${principal.toLocaleString()}`],
              ["Remaining",     `₱${balance.toLocaleString()}`],
              ["Total Paid",    `₱${totalPaid.toLocaleString()}`],
              ["Monthly Due",   `₱${monthlyDue.toLocaleString()}`],
              ["Term",          `${selectedLoan?.term_months} months`],
              ["Interest Rate", `${(parseFloat(selectedLoan?.amount||0)<=50000?"1.25":parseFloat(selectedLoan?.amount||0)<=150000?"1.125":"1.0")}% per month`],
              ["Release Date",  selectedLoan?.approved_at?.slice(0,10)||"—"],
              ["Next Due",      selectedLoan?.next_due_date||"—"],
              ["Status",        selectedLoan?.status],
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
                {payments.filter(p => p.loan === selectedLoan?.id).length === 0 ? (
                  <tr><td colSpan={4} style={{textAlign:"center",color:"#aaa",padding:20}}>No payments yet.</td></tr>
                ) : payments.filter(p => p.loan === selectedLoan?.id).map((p, i) => (
                  <tr key={i}>
                    <td className="cell-date">{p.paid_at}</td>
                    <td className="green fw">₱{Number(p.amount).toLocaleString()}</td>
                    <td className="blue">₱{Number(p.balance).toLocaleString()}</td>
                    <td><span className="hash-text">{p.hash}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Schedule / Amortization tab */}
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
                {(() => {
                  // ── FIXED: compute months paid based on TOTAL AMOUNT paid ÷ monthly due
                  // NOT based on number of payment transactions
                  // Example: monthly_due = ₱3,458.33
                  //   paid ₱500  → totalPaid=500  → monthsPaid = floor(500/3458.33)  = 0 → 0 months paid
                  //   paid ₱3,458.33 → monthsPaid = floor(3458.33/3458.33) = 1 → 1 month paid
                  //   paid ₱7,000  → monthsPaid = floor(7000/3458.33) = 2 → 2 months paid
                  const loanPayments  = payments.filter(p => p.loan === selectedLoan?.id);
                  const totalPaidAmt  = loanPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                  const monthlyDueAmt = parseFloat(selectedLoan?.monthly_due || 0);
                  const monthsPaid    = monthlyDueAmt > 0 ? Math.floor(totalPaidAmt / monthlyDueAmt) : 0;

                  return Array.from({ length: selectedLoan?.term_months || 0 }, (_, i) => {
                    const d = new Date(selectedLoan?.approved_at || selectedLoan?.applied_at || Date.now());
                    d.setMonth(d.getMonth() + i + 1);
                    const isPaid = i < monthsPaid;
                    return (
                      <tr key={i}>
                        <td className="cell-center">{i + 1}</td>
                        <td className="cell-date">{d.toISOString().slice(0,10)}</td>
                        <td className="fw">₱{monthlyDue.toLocaleString()}</td>
                        <td>
                          <span className={`ml-sched-badge ${isPaid ? "paid" : "upcoming"}`}>
                            {isPaid ? "✓ Paid" : "Upcoming"}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}