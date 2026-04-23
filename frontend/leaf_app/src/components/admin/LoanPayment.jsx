import { useState, useEffect } from "react";
import { getLoansAPI } from "../../api/loans";
import { getPaymentsAPI, getPaymentStatsAPI, recordPaymentAPI } from "../../api/payments";
import { Search, Eye } from "lucide-react";
import "./LoanPayment.css";

const ROWS_PER_PAGE = 8;

function RecordModal({ loan, onClose, onSave }) {
  const [amount, setAmount] = useState(loan ? String(loan.monthly_due||loan.monthlyDue||"") : "");
  const [note,   setNote]   = useState("");
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);
  if (!loan) return null;
  const balance  = parseFloat(loan.balance||0);
  const parsed   = parseFloat(amount)||0;
  const newBal   = balance - parsed;
  const isValid  = parsed>0 && parsed<=balance;
  const submit = async () => {
    if (!parsed||parsed<=0)   { setError("Please enter a valid amount."); return; }
    if (parsed>balance)       { setError(`Exceeds remaining balance of ₱${balance.toLocaleString()}.`); return; }
    setLoading(true);
    try {
      await onSave({ loan, amount: parsed, note });
    } catch { setError("Failed to record payment. Please try again."); }
    finally { setLoading(false); }
  };
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-modal" onClick={e=>e.stopPropagation()}>
        <div className="lp-modal-header">
          <div><div className="lp-modal-title">Record Payment</div><div className="lp-modal-sub">F2F — Office Collection</div></div>
          <button className="lp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lp-modal-body">
          <div className="lp-borrower-strip">
            <div className="lp-avatar">{(loan.member_name||loan.fullname||"M")[0]}</div>
            <div className="lp-borrower-info">
              <div className="lp-borrower-name">{loan.member_name||loan.fullname}</div>
              <div className="lp-borrower-meta">{loan.member_code||loan.memberId} · {loan.loan_id||loan.loanId} · {loan.loan_type||loan.loanType}</div>
            </div>
          </div>
          <div className="lp-balance-row">
            <div className="lp-bal-item"><span className="lp-bal-label">Principal</span><span className="lp-bal-val">₱{Number(loan.amount||loan.principal||0).toLocaleString()}</span></div>
            <div className="lp-bal-item highlight"><span className="lp-bal-label">Remaining Balance</span><span className="lp-bal-val danger">₱{balance.toLocaleString()}</span></div>
            <div className="lp-bal-item"><span className="lp-bal-label">Monthly Due</span><span className="lp-bal-val green">₱{Number(loan.monthly_due||loan.monthlyDue||0).toLocaleString()}</span></div>
          </div>
          <div className="lp-field">
            <label className="lp-field-label">Payment Amount (₱) <span className="lp-required">*</span></label>
            <div className="lp-amount-wrap">
              <span className="lp-peso">₱</span>
              <input className="lp-amount-input" type="number" min="1" max={balance} value={amount} onChange={e=>{setAmount(e.target.value);setError("");}} autoFocus/>
            </div>
            <div className="lp-quick-btns">
              <button className="lp-quick" onClick={()=>{setAmount(String(loan.monthly_due||loan.monthlyDue||0));setError("");}}>Monthly Due ₱{Number(loan.monthly_due||loan.monthlyDue||0).toLocaleString()}</button>
              <button className="lp-quick" onClick={()=>{setAmount(String(balance));setError("");}}>Full Balance ₱{balance.toLocaleString()}</button>
            </div>
          </div>
          <div className="lp-field">
            <label className="lp-field-label">Note (optional)</label>
            <input className="lp-input" type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Partial payment, advance payment..." maxLength={80}/>
          </div>
          {error && <div className="lp-error">⚠ {error}</div>}
          {isValid && (
            <div className="lp-preview">
              <div className="lp-prev-row"><span>Current balance</span><span>₱{balance.toLocaleString()}</span></div>
              <div className="lp-prev-row deduct"><span>Payment</span><span>− ₱{parsed.toLocaleString()}</span></div>
              <div className="lp-prev-divider"/>
              <div className="lp-prev-row result">
                <span>New balance</span>
                <span className={newBal===0?"paid-val":""}>₱{newBal.toLocaleString()}{newBal===0&&<span className="lp-paid-tag"> FULLY PAID 🎉</span>}</span>
              </div>
            </div>
          )}
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="lp-btn-save" onClick={submit} disabled={!isValid||loading}>{loading?"Saving...":"Save Payment Record"}</button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ tx, onClose }) {
  if (!tx) return null;
  const rows = [
    ["Member",       tx.member_name||tx.fullname||""],
    ["Member ID",    tx.member_code||tx.memberId||""],
    ["Loan ID",      tx.loan_code||tx.loanId||""],
    ["Amount Paid",  `₱${Number(tx.amount||0).toLocaleString()}`],
    ["Balance After",`₱${Number(tx.balance||tx.balanceAfter||0).toLocaleString()}`],
    ["Note",         tx.note||"—"],
    ["Date & Time",  tx.paid_at||tx.date||""],
    ["SHA-256 Hash", tx.hash||""],
  ];
  return (
    <div className="lp-overlay" onClick={onClose}>
      <div className="lp-modal lp-modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="lp-modal-header">
          <div><div className="lp-modal-title">Transaction Receipt</div><div className="lp-modal-sub mono">{tx.tx_id||tx.txId}</div></div>
          <button className="lp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lp-modal-body">
          <div className="lp-receipt">
            {rows.map(([k,v])=>(
              <div key={k} className="lp-receipt-row">
                <span className="lp-rk">{k}</span>
                <span className={`lp-rv ${k==="Amount Paid"?"green":""} ${k==="SHA-256 Hash"?"mono hash-text":""}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-cancel" onClick={onClose}>Close</button>
          <button className="lp-btn-print" onClick={()=>window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}

export default function LoanPayment() {
  const [loans,       setLoans]   = useState([]);
  const [transactions,setTx]      = useState([]);
  const [pStats,      setPStats]  = useState({ total_collected:0, transaction_count:0 });
  const [loading,     setLoading] = useState(true);
  const [activeTab,   setTab]     = useState("loans");
  const [search,      setSearch]  = useState("");
  const [filterStatus,setFilter]  = useState("All");
  const [page,        setPage]    = useState(1);
  const [recordLoan,  setRecord]  = useState(null);
  const [viewTx,      setViewTx]  = useState(null);
  const [toast,       setToast]   = useState(null);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [l,t,s] = await Promise.allSettled([
        getLoansAPI({ status: "Active" }),
        getPaymentsAPI(),
        getPaymentStatsAPI(),
      ]);
      if (l.status==="fulfilled") setLoans(l.value);
      if (t.status==="fulfilled") setTx(t.value);
      if (s.status==="fulfilled") setPStats(s.value);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalCollected   = parseFloat(pStats.total_collected||0);
  const overdueCount     = loans.filter(l=>l.status==="Overdue").length;
  const totalOutstanding = loans.reduce((s,l)=>s+parseFloat(l.balance||0),0);

  const handleSave = async ({ loan, amount, note }) => {
    try {
      await recordPaymentAPI({
        loan:   loan.id,
        member: loan.member,
        amount,
        note,
      });
      setRecord(null);
      showToast(`Payment of ₱${amount.toLocaleString()} recorded successfully.`);
      fetchData();
    } catch { showToast("Failed to record payment.", "danger"); }
  };

  const filteredLoans = loans.filter(l => {
    const matchS = filterStatus==="All" || l.status===filterStatus;
    const q = search.toLowerCase();
    return matchS && (
      (l.loan_id||"").toLowerCase().includes(q) ||
      (l.member_name||"").toLowerCase().includes(q) ||
      (l.member_code||"").toLowerCase().includes(q) ||
      (l.loan_type||"").toLowerCase().includes(q)
    );
  });

  const filteredTx = transactions.filter(t => {
    const q = search.toLowerCase();
    return (t.tx_id||"").toLowerCase().includes(q) ||
           (t.member_name||"").toLowerCase().includes(q) ||
           (t.loan_code||"").toLowerCase().includes(q);
  });

  const list       = activeTab==="loans" ? filteredLoans : filteredTx;
  const totalPages = Math.max(1, Math.ceil(list.length/ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = list.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);
  const switchTab  = tab => { setTab(tab); setPage(1); setSearch(""); setFilter("All"); };

  const Pagination = () => (
    <div className="lp-footer">
      <div className="lp-count">Showing {list.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,list.length)} of {list.length} record{list.length!==1?"s":""}</div>
      <div className="lp-pagination">
        <button className="lp-page-btn" disabled={safePage===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
        {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1).reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[]).map((p,i)=>p==="..."?<span key={`e${i}`} className="lp-ellipsis">…</span>:<button key={p} className={`lp-page-btn lp-page-num ${safePage===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>)}
        <button className="lp-page-btn" disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
      </div>
    </div>
  );

  return (
    <div className="lp-wrapper">
      {toast && <div className={`lp-toast lp-toast-${toast.type}`}>{toast.msg}</div>}
      <RecordModal loan={recordLoan} onClose={()=>setRecord(null)} onSave={handleSave}/>
      <ReceiptModal tx={viewTx} onClose={()=>setViewTx(null)}/>

      <div className="lp-page-header">
        <div><div className="lp-page-title">Loan Payment</div><div className="lp-page-sub">Record and track F2F loan payments collected at the office.</div></div>
      </div>

      <div className="lp-summary-grid">
        <div className="lp-summary-card"><div className="lp-sum-val">₱{totalCollected.toLocaleString()}</div><div className="lp-sum-label">Total Collected</div></div>
        <div className="lp-summary-card clickable" onClick={()=>{switchTab("loans");setFilter("Overdue");}}><div className="lp-sum-val danger">{overdueCount}</div><div className="lp-sum-label">Overdue Loans</div></div>
        <div className="lp-summary-card"><div className="lp-sum-val blue">₱{totalOutstanding.toLocaleString()}</div><div className="lp-sum-label">Total Outstanding</div></div>
        <div className="lp-summary-card clickable" onClick={()=>switchTab("history")}><div className="lp-sum-val purple">{transactions.length}</div><div className="lp-sum-label">Transactions Recorded</div></div>
      </div>

      <div className="lp-card">
        <div className="lp-toolbar">
          <div className="lp-tabs">
            <button className={`lp-tab ${activeTab==="loans"?"active":""}`} onClick={()=>switchTab("loans")}>Active Loans <span className="lp-tab-count">{loans.length}</span></button>
            <button className={`lp-tab ${activeTab==="history"?"active":""}`} onClick={()=>switchTab("history")}>Payment History <span className="lp-tab-count">{transactions.length}</span></button>
          </div>
          <div className="lp-toolbar-right">
            <div className="lp-search-wrap">
              <span className="lp-search-icon"><Search size={13} color="#aaa"/></span>
              <input className="lp-search-input" placeholder="Search..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
              {search && <button className="lp-clear-btn" onClick={()=>{setSearch("");setPage(1);}}>✕</button>}
            </div>
            {activeTab==="loans" && (
              <div className="lp-filter-tabs">
                {["All","Active","Overdue"].map(s=>(
                  <button key={s} className={`lp-filter-tab ${filterStatus===s?"active":""} ftab-${s.toLowerCase()}`} onClick={()=>{setFilter(s);setPage(1);}}>{s}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab==="loans" && (
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead><tr>
                <th style={{width:"13%"}}>Loan ID</th>
                <th style={{width:"11%"}}>Member ID</th>
                <th style={{width:"17%"}}>Full Name</th>
                <th style={{width:"14%"}}>Loan Type</th>
                <th style={{width:"10%"}}>Balance</th>
                <th style={{width:"10%"}}>Monthly Due</th>
                <th style={{width:"8%"}}>Status</th>
                <th style={{width:"7%",textAlign:"center"}}>Action</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="lp-empty">Loading...</td></tr>
                : paginated.length===0 ? <tr><td colSpan={8} className="lp-empty">No loans found.</td></tr>
                : paginated.map((l,idx)=>(
                  <tr key={l.id} className={idx%2===0?"row-even":"row-odd"}>
                    <td className="mono cell-id">{l.loan_id}</td>
                    <td className="mono">{l.member_code}</td>
                    <td className="cell-name">{l.member_name}</td>
                    <td><span className="lp-type-pill">{l.loan_type}</span></td>
                    <td className={`fw ${l.status==="Overdue"?"danger":"blue"}`}>₱{Number(l.balance||0).toLocaleString()}</td>
                    <td className="fw green">₱{Number(l.monthly_due||0).toLocaleString()}</td>
                    <td><span className={`lp-loan-badge lp-${(l.status||"").toLowerCase()}`}>{l.status}</span></td>
                    <td style={{textAlign:"center"}}>
                      <button className="lp-pay-btn" onClick={()=>setRecord(l)} disabled={parseFloat(l.balance||0)===0}>+ Pay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab==="history" && (
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
                {loading ? <tr><td colSpan={9} className="lp-empty">Loading...</td></tr>
                : paginated.length===0 ? <tr><td colSpan={9} className="lp-empty">No transactions found.</td></tr>
                : paginated.map((t,idx)=>(
                  <tr key={t.id||t.txId} className={idx%2===0?"row-even":"row-odd"}>
                    <td className="mono cell-id">{t.tx_id}</td>
                    <td className="mono">{t.loan_code}</td>
                    <td className="mono">{t.member_code}</td>
                    <td className="cell-name">{t.member_name}</td>
                    <td className="fw green">₱{Number(t.amount||0).toLocaleString()}</td>
                    <td className="blue">₱{Number(t.balance||0).toLocaleString()}</td>
                    <td className="cell-date">{t.paid_at}</td>
                    <td><span className="hash-text">{t.hash}</span></td>
                    <td style={{textAlign:"center"}}><button className="lp-view-btn" onClick={()=>setViewTx(t)}><Eye size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination/>
      </div>
    </div>
  );
}