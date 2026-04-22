import { useState } from "react";
import "./LoanPayment.css";

const ACTIVE_LOANS = [
  { loanId: "LN-2026-001", memberId: "LEAF-100-01", fullname: "Junelle Dinglasan",      loanType: "Regular Loan",   principal: 15000, balance: 12500, monthlyDue: 1500, dueDate: "2026-04-05", status: "Current" },
  { loanId: "LN-2026-002", memberId: "LEAF-100-02", fullname: "MarkVincent Castillano", loanType: "Emergency Loan", principal: 8000,  balance: 8000,  monthlyDue: 900,  dueDate: "2026-03-28", status: "Overdue" },
  { loanId: "LN-2026-003", memberId: "LEAF-100-03", fullname: "Hillery Verastigue",     loanType: "Business Loan",  principal: 50000, balance: 42000, monthlyDue: 4500, dueDate: "2026-04-10", status: "Current" },
  { loanId: "LN-2026-004", memberId: "LEAF-100-05", fullname: "Maria Santos",           loanType: "Salary Loan",    principal: 12000, balance: 3000,  monthlyDue: 1200, dueDate: "2026-04-01", status: "Current" },
  { loanId: "LN-2026-005", memberId: "LEAF-100-07", fullname: "Ana Gonzales",           loanType: "Housing Loan",   principal: 80000, balance: 75000, monthlyDue: 6000, dueDate: "2026-03-25", status: "Overdue" },
  { loanId: "LN-2026-006", memberId: "LEAF-100-09", fullname: "Rosa Mendoza",           loanType: "Regular Loan",   principal: 10000, balance: 10000, monthlyDue: 1000, dueDate: "2026-04-15", status: "Current" },
  { loanId: "LN-2026-007", memberId: "LEAF-100-10", fullname: "Carlos Bautista",        loanType: "Emergency Loan", principal: 5000,  balance: 1500,  monthlyDue: 600,  dueDate: "2026-04-05", status: "Current" },
  { loanId: "LN-2026-008", memberId: "LEAF-100-13", fullname: "Nena Pascual",           loanType: "Salary Loan",    principal: 7500,  balance: 7500,  monthlyDue: 850,  dueDate: "2026-03-20", status: "Overdue" },
];

const INITIAL_TX = [
  { txId: "TX-20260318-001", loanId: "LN-2026-001", memberId: "LEAF-100-01", fullname: "Junelle Dinglasan",      amount: 1500, note: "",               date: "2026-03-18 09:14", hash: "ha4jbac28k01eedr-j7", balanceAfter: 12500 },
  { txId: "TX-20260317-002", loanId: "LN-2026-004", memberId: "LEAF-100-05", fullname: "Maria Santos",           amount: 1200, note: "",               date: "2026-03-17 14:30", hash: "hx9kzab34m02ffes-p3", balanceAfter: 3000  },
  { txId: "TX-20260315-003", loanId: "LN-2026-007", memberId: "LEAF-100-10", fullname: "Carlos Bautista",        amount: 600,  note: "Partial payment", date: "2026-03-15 10:05", hash: "hb2mnat56q03ggft-r8", balanceAfter: 1500  },
  { txId: "TX-20260314-004", loanId: "LN-2026-003", memberId: "LEAF-100-03", fullname: "Hillery Verastigue",     amount: 4500, note: "",               date: "2026-03-14 11:20", hash: "hc7plcb72s04hhgu-t1", balanceAfter: 42000 },
  { txId: "TX-20260312-005", loanId: "LN-2026-001", memberId: "LEAF-100-01", fullname: "Junelle Dinglasan",      amount: 1500, note: "",               date: "2026-03-12 09:00", hash: "hd3rndc89u05iihv-w5", balanceAfter: 14000 },
  { txId: "TX-20260310-006", loanId: "LN-2026-006", memberId: "LEAF-100-09", fullname: "Rosa Mendoza",           amount: 1000, note: "",               date: "2026-03-10 13:45", hash: "he8smec95v06jjkw-y9", balanceAfter: 10000 },
];

const ROWS_PER_PAGE = 8;

function RecordModal({ loan, onClose, onSave }) {
  const [amount, setAmount] = useState(loan ? String(loan.monthlyDue) : "");
  const [note, setNote]     = useState("");
  const [error, setError]   = useState("");
  if (!loan) return null;
  const parsed     = parseFloat(amount) || 0;
  const newBalance = loan.balance - parsed;
  const isValid    = parsed > 0 && parsed <= loan.balance;
  const submit = () => {
    if (!parsed || parsed <= 0)    { setError("Please enter a valid amount."); return; }
    if (parsed > loan.balance)     { setError(`Exceeds remaining balance of ₱${loan.balance.toLocaleString()}.`); return; }
    onSave({ loan, amount: parsed, note });
  };
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-modal" onClick={e => e.stopPropagation()}>
        <div className="lp-modal-header">
          <div>
            <div className="lp-modal-title">Record Payment</div>
            <div className="lp-modal-sub">F2F — Office Collection</div>
          </div>
          <button className="lp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lp-modal-body">
          <div className="lp-borrower-strip">
            <div className="lp-avatar">{loan.fullname.charAt(0)}</div>
            <div className="lp-borrower-info">
              <div className="lp-borrower-name">{loan.fullname}</div>
              <div className="lp-borrower-meta">{loan.memberId} · {loan.loanId} · {loan.loanType}</div>
            </div>
            <span className={`lp-loan-badge lp-${loan.status.toLowerCase()}`}>{loan.status}</span>
          </div>
          <div className="lp-balance-row">
            <div className="lp-bal-item"><span className="lp-bal-label">Principal</span><span className="lp-bal-val">₱{loan.principal.toLocaleString()}</span></div>
            <div className="lp-bal-item highlight"><span className="lp-bal-label">Remaining Balance</span><span className="lp-bal-val danger">₱{loan.balance.toLocaleString()}</span></div>
            <div className="lp-bal-item"><span className="lp-bal-label">Monthly Due</span><span className="lp-bal-val green">₱{loan.monthlyDue.toLocaleString()}</span></div>
            <div className="lp-bal-item"><span className="lp-bal-label">Due Date</span><span className={`lp-bal-val ${loan.status === "Overdue" ? "danger" : ""}`}>{loan.dueDate}</span></div>
          </div>
          <div className="lp-field">
            <label className="lp-field-label">Payment Amount (₱) <span className="lp-required">*</span></label>
            <div className="lp-amount-wrap">
              <span className="lp-peso">₱</span>
              <input className="lp-amount-input" type="number" min="1" max={loan.balance} value={amount}
                onChange={e => { setAmount(e.target.value); setError(""); }} placeholder={`e.g. ${loan.monthlyDue}`} autoFocus />
            </div>
            <div className="lp-quick-btns">
              <button className="lp-quick" onClick={() => { setAmount(String(loan.monthlyDue)); setError(""); }}>Monthly Due  ₱{loan.monthlyDue.toLocaleString()}</button>
              <button className="lp-quick" onClick={() => { setAmount(String(loan.balance)); setError(""); }}>Full Balance  ₱{loan.balance.toLocaleString()}</button>
            </div>
          </div>
          <div className="lp-field">
            <label className="lp-field-label">Note (optional)</label>
            <input className="lp-input" type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Partial payment, advance payment..." maxLength={80} />
          </div>
          {error && <div className="lp-error">⚠ {error}</div>}
          {isValid && (
            <div className="lp-preview">
              <div className="lp-prev-row"><span>Current balance</span><span>₱{loan.balance.toLocaleString()}</span></div>
              <div className="lp-prev-row deduct"><span>Payment</span><span>− ₱{parsed.toLocaleString()}</span></div>
              <div className="lp-prev-divider" />
              <div className="lp-prev-row result">
                <span>New balance</span>
                <span className={newBalance === 0 ? "paid-val" : ""}>
                  ₱{newBalance.toLocaleString()}{newBalance === 0 && <span className="lp-paid-tag"> FULLY PAID 🎉</span>}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="lp-btn-save" onClick={submit} disabled={!isValid}>Save Payment Record</button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ tx, onClose }) {
  if (!tx) return null;
  const rows = [
    ["Member",        tx.fullname],
    ["Member ID",     tx.memberId],
    ["Loan ID",       tx.loanId],
    ["Amount Paid",   `₱${tx.amount.toLocaleString()}`],
    ["Balance After", `₱${tx.balanceAfter.toLocaleString()}`],
    ["Note",          tx.note || "—"],
    ["Date & Time",   tx.date],
    ["SHA-256 Hash",  tx.hash],
  ];
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-modal lp-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="lp-modal-header">
          <div><div className="lp-modal-title">Transaction Receipt</div><div className="lp-modal-sub mono">{tx.txId}</div></div>
          <button className="lp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lp-modal-body">
          <div className="lp-receipt">
            {rows.map(([k, v]) => (
              <div key={k} className="lp-receipt-row">
                <span className="lp-rk">{k}</span>
                <span className={`lp-rv ${k === "Amount Paid" ? "green" : ""} ${k === "SHA-256 Hash" ? "mono hash-text" : ""}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-cancel" onClick={onClose}>Close</button>
          <button className="lp-btn-print" onClick={() => window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}

export default function LoanPayment() {
  const [loans, setLoans]         = useState(ACTIVE_LOANS);
  const [transactions, setTx]     = useState(INITIAL_TX);
  const [activeTab, setActiveTab] = useState("loans");
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilter] = useState("All");
  const [page, setPage]           = useState(1);
  const [recordLoan, setRecord]   = useState(null);
  const [viewTx, setViewTx]       = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const totalCollected   = transactions.reduce((s, t) => s + t.amount, 0);
  const overdueCount     = loans.filter(l => l.status === "Overdue").length;
  const totalOutstanding = loans.reduce((s, l) => s + l.balance, 0);

  const handleSave = ({ loan, amount, note }) => {
    const newBalance = loan.balance - amount;
    const now = new Date();
    const pad = n => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setLoans(prev => prev.map(l => l.loanId === loan.loanId ? { ...l, balance: newBalance, status: newBalance === 0 ? "Paid" : l.status } : l));
    setTx(prev => [{
      txId: `TX-${Date.now()}`, loanId: loan.loanId, memberId: loan.memberId,
      fullname: loan.fullname, amount, note, date: dateStr,
      hash: `hx${Math.random().toString(36).slice(2,12)}-j${Math.floor(Math.random()*9)}`,
      balanceAfter: newBalance,
    }, ...prev]);
    setRecord(null);
    showToast(`Payment of ₱${amount.toLocaleString()} recorded for ${loan.fullname}.${newBalance === 0 ? " Loan fully paid!" : ""}`);
  };

  const filteredLoans = loans.filter(l => {
    const matchS = filterStatus === "All" || l.status === filterStatus;
    const q = search.toLowerCase();
    return matchS && (l.loanId.toLowerCase().includes(q) || l.fullname.toLowerCase().includes(q) || l.memberId.toLowerCase().includes(q) || l.loanType.toLowerCase().includes(q));
  });

  const filteredTx = transactions.filter(t => {
    const q = search.toLowerCase();
    return t.txId.toLowerCase().includes(q) || t.fullname.toLowerCase().includes(q) || t.memberId.toLowerCase().includes(q) || t.loanId.toLowerCase().includes(q);
  });

  const list       = activeTab === "loans" ? filteredLoans : filteredTx;
  const totalPages = Math.max(1, Math.ceil(list.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = list.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
  const switchTab  = tab => { setActiveTab(tab); setPage(1); setSearch(""); setFilter("All"); };

  const Pagination = () => (
    <div className="lp-footer">
      <div className="lp-count">
        Showing {list.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, list.length)} of {list.length} record{list.length !== 1 ? "s" : ""}
      </div>
      <div className="lp-pagination">
        <button className="lp-page-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
          .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
          .map((p, i) => p === "..."
            ? <span key={`e${i}`} className="lp-ellipsis">…</span>
            : <button key={p} className={`lp-page-btn lp-page-num ${safePage === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
          )}
        <button className="lp-page-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );

  return (
    <div className="lp-wrapper">
      {toast && <div className={`lp-toast lp-toast-${toast.type}`}>{toast.msg}</div>}
      <RecordModal loan={recordLoan} onClose={() => setRecord(null)} onSave={handleSave} />
      <ReceiptModal tx={viewTx} onClose={() => setViewTx(null)} />

      <div className="lp-page-header">
        <div>
          <div className="lp-page-title">Loan Payment</div>
          <div className="lp-page-sub">Record and track F2F loan payments collected at the office.</div>
        </div>
      </div>

      <div className="lp-summary-grid">
        <div className="lp-summary-card">
          <div className="lp-sum-icon" style={{ background: "#e8f5e9" }}>💰</div>
          <div><div className="lp-sum-val">₱{totalCollected.toLocaleString()}</div><div className="lp-sum-label">Total Collected</div></div>
        </div>
        <div className="lp-summary-card clickable" onClick={() => { switchTab("loans"); setFilter("Overdue"); }}>
          <div className="lp-sum-icon" style={{ background: "#fce4ec" }}>⚠</div>
          <div><div className="lp-sum-val danger">{overdueCount}</div><div className="lp-sum-label">Overdue Loans</div></div>
        </div>
        <div className="lp-summary-card">
          <div className="lp-sum-icon" style={{ background: "#e3f2fd" }}>📊</div>
          <div><div className="lp-sum-val blue">₱{totalOutstanding.toLocaleString()}</div><div className="lp-sum-label">Total Outstanding</div></div>
        </div>
        <div className="lp-summary-card clickable" onClick={() => switchTab("history")}>
          <div className="lp-sum-icon" style={{ background: "#f3e5f5" }}>🧾</div>
          <div><div className="lp-sum-val purple">{transactions.length}</div><div className="lp-sum-label">Transactions Recorded</div></div>
        </div>
      </div>

      <div className="lp-card">
        <div className="lp-toolbar">
          <div className="lp-tabs">
            <button className={`lp-tab ${activeTab === "loans" ? "active" : ""}`} onClick={() => switchTab("loans")}>
              Active Loans <span className="lp-tab-count">{loans.length}</span>
            </button>
            <button className={`lp-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => switchTab("history")}>
              Payment History <span className="lp-tab-count">{transactions.length}</span>
            </button>
          </div>
          <div className="lp-toolbar-right">
            <div className="lp-search-wrap">
              <span className="lp-search-icon">🔍</span>
              <input className="lp-search-input" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              {search && <button className="lp-clear-btn" onClick={() => { setSearch(""); setPage(1); }}>✕</button>}
            </div>
            {activeTab === "loans" && (
              <div className="lp-filter-tabs">
                {["All","Current","Overdue"].map(s => (
                  <button key={s} className={`lp-filter-tab ${filterStatus === s ? "active" : ""} ftab-${s.toLowerCase()}`} onClick={() => { setFilter(s); setPage(1); }}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === "loans" && (
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead><tr>
                <th style={{width:"13%"}}>Loan ID</th>
                <th style={{width:"11%"}}>Member ID</th>
                <th style={{width:"17%"}}>Full Name</th>
                <th style={{width:"14%"}}>Loan Type</th>
                <th style={{width:"10%"}}>Balance</th>
                <th style={{width:"10%"}}>Monthly Due</th>
                <th style={{width:"11%"}}>Due Date</th>
                <th style={{width:"8%"}}>Status</th>
                <th style={{width:"6%",textAlign:"center"}}>Action</th>
              </tr></thead>
              <tbody>
                {paginated.length === 0 ? <tr><td colSpan={9} className="lp-empty">No loans found.</td></tr>
                : paginated.map((l, idx) => (
                  <tr key={l.loanId} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                    <td className="mono cell-id">{l.loanId}</td>
                    <td className="mono">{l.memberId}</td>
                    <td className="cell-name">{l.fullname}</td>
                    <td><span className="lp-type-pill">{l.loanType}</span></td>
                    <td className={`fw ${l.status === "Overdue" ? "danger" : "blue"}`}>₱{l.balance.toLocaleString()}</td>
                    <td className="fw green">₱{l.monthlyDue.toLocaleString()}</td>
                    <td className={`cell-date ${l.status === "Overdue" ? "danger" : ""}`}>{l.dueDate}</td>
                    <td><span className={`lp-loan-badge lp-${l.status.toLowerCase()}`}>{l.status}</span></td>
                    <td style={{textAlign:"center"}}>
                      <button className="lp-pay-btn" onClick={() => setRecord(l)} disabled={l.balance === 0}>+ Pay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "history" && (
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead><tr>
                <th style={{width:"16%"}}>TX ID</th>
                <th style={{width:"11%"}}>Loan ID</th>
                <th style={{width:"11%"}}>Member ID</th>
                <th style={{width:"16%"}}>Full Name</th>
                <th style={{width:"9%"}}>Amount</th>
                <th style={{width:"10%"}}>Balance After</th>
                <th style={{width:"13%"}}>Date & Time</th>
                <th style={{width:"10%"}}>Hash</th>
                <th style={{width:"4%",textAlign:"center"}}>View</th>
              </tr></thead>
              <tbody>
                {paginated.length === 0 ? <tr><td colSpan={9} className="lp-empty">No transactions found.</td></tr>
                : paginated.map((t, idx) => (
                  <tr key={t.txId} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                    <td className="mono cell-id">{t.txId}</td>
                    <td className="mono">{t.loanId}</td>
                    <td className="mono">{t.memberId}</td>
                    <td className="cell-name">{t.fullname}</td>
                    <td className="fw green">₱{t.amount.toLocaleString()}</td>
                    <td className="blue">₱{t.balanceAfter.toLocaleString()}</td>
                    <td className="cell-date">{t.date}</td>
                    <td><span className="hash-text">{t.hash}</span></td>
                    <td style={{textAlign:"center"}}><button className="lp-view-btn" onClick={() => setViewTx(t)}>👁</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination />
      </div>
    </div>
  );
}