import { useState, useEffect } from "react";
import { getLoansAPI } from "../../api/loans";
import { getPaymentsAPI, getPaymentStatsAPI, recordPaymentAPI } from "../../api/payments";
import { Search, Eye, ChevronDown, ChevronUp, Wallet, AlertTriangle, BarChart3, Receipt, Printer } from "lucide-react";
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
  const isOnBlockchain = tx.polygon_tx && tx.network === 'polygon';
  const explorerUrl = tx.polygon_tx ? `https://polygonscan.com/tx/${tx.polygon_tx}` : null;
  const rows = [
    ["Member",        tx.member_name||tx.fullname||""],
    ["Member ID",     tx.member_code||tx.memberId||""],
    ["Loan ID",       tx.loan_code||tx.loanId||""],
    ["Amount Paid",   `₱${Number(tx.amount||0).toLocaleString()}`],
    ["Balance After", `₱${Number(tx.balance||tx.balanceAfter||0).toLocaleString()}`],
    ["Note",          tx.note||"—"],
    ["Date & Time",   tx.paid_at||tx.date||""],
    ["SHA-256 Hash",  tx.hash||""],
    ["Blockchain",    isOnBlockchain ? "✅ Recorded on Polygon Mainnet" : "⚠ Local only"],
    ["Polygon TX",    tx.polygon_tx || "—"],
    ["Block Number",  tx.block_number || "—"],
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
                <span className={`lp-rv ${k==="Amount Paid"?"green":""} ${k==="SHA-256 Hash"||k==="Polygon TX"?"mono hash-text":""}`}>{v}</span>
              </div>
            ))}
          </div>
          {explorerUrl && (
            <div style={{marginTop: 12, textAlign: 'center'}}>
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                 style={{color: '#7c3aed', fontWeight: 600, fontSize: 13}}>
                🔗 View on Polygonscan
              </a>
            </div>
          )}
        </div>
        <div className="lp-modal-footer">
          <button className="lp-btn-cancel" onClick={onClose}>Close</button>
          <button className="lp-btn-print" onClick={()=>window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}

// ── FIX: parse paid_at in local Philippine time (Asia/Manila) ──
// Dati: "2026-10-30T08:00:00+08:00".split("T")[0] → "2026-10-30" (wrong, UTC artifact)
// Ngayon: ginagamit ang actual local date ng transaction
function parsePaidAtDate(paid_at) {
  if (!paid_at) return "Unknown";
  // Kung may timezone offset (e.g. +08:00), i-convert sa local date
  const d = new Date(paid_at);
  if (isNaN(d.getTime())) return paid_at.split("T")[0] || "Unknown";
  // Format as YYYY-MM-DD using Asia/Manila timezone
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // "en-CA" = YYYY-MM-DD format
}

function groupByDate(transactions) {
  const groups = {};
  transactions.forEach(tx => {
    const dateStr = parsePaidAtDate(tx.paid_at);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(tx);
  });
  return Object.entries(groups).sort((a, b) => { const maxIdA = Math.max(...a[1].map(t => t.id || 0)); const maxIdB = Math.max(...b[1].map(t => t.id || 0)); return maxIdB - maxIdA; });
}

function formatDateLabel(dateStr) {
  if (dateStr === "Unknown") return "Unknown Date";
  // ── FIX: compare using Asia/Manila local date, not UTC ──
  const todayStr     = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const yesterdayD   = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  const yesterdayStr = yesterdayD.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  if (dateStr === todayStr)     return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-PH", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

function DailyGroup({ dateStr, txList, onViewTx }) {
  const [expanded, setExpanded] = useState(true);
  const dailyTotal = txList.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  return (
    <div className="lp-daily-group">
      <div className="lp-daily-header" onClick={() => setExpanded(e => !e)}>
        <div className="lp-daily-header-left">
          <span className="lp-daily-chevron">{expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
          <span className="lp-daily-date">{formatDateLabel(dateStr)}</span>
          <span className="lp-daily-date-sub">{dateStr !== "Unknown" ? dateStr : ""}</span>
        </div>
        <div className="lp-daily-header-right">
          <span className="lp-daily-count">{txList.length} transaction{txList.length !== 1 ? "s" : ""}</span>
          <span className="lp-daily-total">₱{dailyTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
        </div>
      </div>
      {expanded && (
        <table className="lp-table history-table lp-daily-table">
          <thead>
            <tr>
              <th style={{width:"16%"}}>TX ID</th>
              <th style={{width:"11%"}}>Loan ID</th>
              <th style={{width:"11%"}}>Member ID</th>
              <th style={{width:"18%"}}>Full Name</th>
              <th style={{width:"9%"}}>Amount</th>
              <th style={{width:"10%"}}>Balance After</th>
              <th style={{width:"13%"}}>Time</th>
              <th style={{width:"8%"}}>Hash</th>
              <th style={{width:"4%", textAlign:"center"}}>View</th>
            </tr>
          </thead>
          <tbody>
            {txList.map((t, idx) => (
              <tr key={t.id||t.txId} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                <td className="mono cell-id">{t.tx_id}</td>
                <td className="mono">{t.loan_code}</td>
                <td className="mono">{t.member_code}</td>
                <td className="cell-name">{t.member_name}</td>
                <td className="fw green">₱{Number(t.amount||0).toLocaleString()}</td>
                <td className="blue">₱{Number(t.balance||0).toLocaleString()}</td>
                <td className="cell-date">{t.paid_at ? new Date(t.paid_at).toLocaleTimeString("en-PH", {timeZone:"Asia/Manila", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false}) : "—"}</td>
                <td><span className="hash-text">{t.polygon_tx ? '🔗 '+t.polygon_tx.slice(0,10)+'...' : t.hash?.substring(0,16)+'...'}</span></td>
                <td style={{textAlign:"center"}}><button className="lp-view-btn" onClick={() => onViewTx(t)}><Eye size={12}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
  const [historyView, setHistoryView] = useState("daily");
  const [loanHistory, setLoanHistory] = useState(null);
  const [loanHistoryData, setLoanHistoryData] = useState([]);

  // ── FIX 2: String().trim() para walang type/whitespace mismatch sa filter ──
  const handleViewLoanHistory = (e, loan) => {
    e.stopPropagation();
    const filtered = transactions.filter(
      p => String(p.loan_code).trim() === String(loan.loan_id).trim()
    );
    setLoanHistoryData(filtered);
    setLoanHistory(loan);
  };

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lActive, lOverdue, t, s] = await Promise.allSettled([
        getLoansAPI({ status: "Active" }),
        getLoansAPI({ status: "Overdue" }),
        getPaymentsAPI(),
        getPaymentStatsAPI(),
      ]);
      const activeLoans  = lActive.status  === "fulfilled" ? lActive.value  : [];
      const overdueLoans = lOverdue.status === "fulfilled" ? lOverdue.value : [];
      setLoans([...activeLoans, ...overdueLoans]);
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
      const payment = await recordPaymentAPI({ loan: loan.id, member: loan.member, amount, note });
      setRecord(null);
      showToast(`Payment of ₱${amount.toLocaleString()} recorded successfully.`);

      const newBalance  = Math.max(0, parseFloat(loan.balance||0) - amount);
      const isFullyPaid = newBalance <= 0;

      // Update loan balance directly in state
      setLoans(prev =>
        prev
          .map(l => l.id === loan.id ? { ...l, balance: newBalance, status: isFullyPaid ? "Completed" : l.status } : l)
          .filter(l => l.status !== "Completed")
      );

      // ── FIX 1: Normalize returned payment object para may loan_code,
      //    member_name, etc. agad — visible sa Daily View at All Transactions ──
      if (payment) {
        const normalized = {
          ...payment,
          member_name: payment.member_name || loan.member_name || "",
          member_code: payment.member_code || loan.member_code || "",
          loan_code:   payment.loan_code   || loan.loan_id     || "",
          paid_at:     payment.paid_at     || new Date().toISOString(),
        };

        // Add new payment to top of transactions list instantly
        setTx(prev => [normalized, ...prev]);

        // ── FIX 3: Kung bukas ang loan history modal ng same loan,
        //    i-update din ang loanHistoryData at loanHistory balance ──
        if (loanHistory && loanHistory.id === loan.id) {
          setLoanHistoryData(prev => [normalized, ...prev]);
          setLoanHistory(prev => ({ ...prev, balance: newBalance }));
        }
      }

      // Update KPI stats
      setPStats(prev => ({
        ...prev,
        total_collected:   (parseFloat(prev.total_collected||0) + amount).toFixed(2),
        transaction_count: (parseInt(prev.transaction_count||0) + 1),
      }));

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

  const totalPages = Math.max(1, Math.ceil(
    (activeTab==="loans" ? filteredLoans : filteredTx).length / ROWS_PER_PAGE
  ));
  const safePage = Math.min(page, totalPages);
  const paginatedLoans = filteredLoans.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);
  const paginatedTx    = filteredTx.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  const switchTab = tab => { setTab(tab); setPage(1); setSearch(""); setFilter("All"); };

  const dailyGroups = groupByDate(filteredTx);

  const Pagination = ({ list }) => (
    <div className="lp-footer">
      <div className="lp-count">
        Showing {list.length===0?0:(safePage-1)*ROWS_PER_PAGE+1}–{Math.min(safePage*ROWS_PER_PAGE,list.length)} of {list.length} record{list.length!==1?"s":""}
      </div>
      <div className="lp-pagination">
        <button className="lp-page-btn" disabled={safePage===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
        {Array.from({length:totalPages},(_,i)=>i+1)
          .filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=1)
          .reduce((acc,p,i,arr)=>{if(i>0&&p-arr[i-1]>1)acc.push("...");acc.push(p);return acc;},[])
          .map((p,i)=>p==="..."
            ? <span key={`e${i}`} className="lp-ellipsis">…</span>
            : <button key={p} className={`lp-page-btn lp-page-num ${safePage===p?"active":""}`} onClick={()=>setPage(p)}>{p}</button>
          )}
        <button className="lp-page-btn" disabled={safePage===totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
      </div>
    </div>
  );

  // ── Loan History Modal ──────────────────────────────────────────────────────
  const LoanHistoryModal = () => {
    if (!loanHistory) return null;
    return (
      <div className="lp-overlay" onClick={() => setLoanHistory(null)}>
        <div className="lp-modal" onClick={e => e.stopPropagation()}>
          <div className="lp-modal-header">
            <div>
              <div className="lp-modal-title">Payment History</div>
              <div className="lp-modal-sub">{loanHistory.loan_id} · {loanHistory.member_name}</div>
            </div>
            <button className="lp-modal-close" onClick={() => setLoanHistory(null)}>✕</button>
          </div>
          <div className="lp-modal-body">
            <div className="lp-balance-row">
              <div className="lp-bal-item"><span className="lp-bal-label">Loan Amount</span><span className="lp-bal-val">₱{Number(loanHistory.amount||0).toLocaleString()}</span></div>
              <div className="lp-bal-item highlight"><span className="lp-bal-label">Remaining Balance</span><span className="lp-bal-val danger">₱{Number(loanHistory.balance||0).toLocaleString()}</span></div>
              <div className="lp-bal-item"><span className="lp-bal-label">Monthly Due</span><span className="lp-bal-val green">₱{Number(loanHistory.monthly_due||0).toLocaleString()}</span></div>
            </div>
            {loanHistoryData.length === 0 ? (
              <div style={{textAlign:"center",padding:"24px",color:"#aaa"}}>No payments recorded yet.</div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse",marginTop:12}}>
                <thead>
                  <tr style={{background:"#f9fef9"}}>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>Date</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>TX ID</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e8f5e9"}}>Amount</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"right",borderBottom:"1px solid #e8f5e9"}}>Balance After</th>
                    <th style={{fontSize:10,color:"#aaa",fontWeight:700,padding:"8px 6px",textAlign:"left",borderBottom:"1px solid #e8f5e9"}}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loanHistoryData.map((p,i) => (
                    <tr key={i} style={{borderBottom:"1px solid #f5f5f5"}}>
                      <td style={{fontSize:11,color:"#555",padding:"8px 6px"}}>{p.paid_at?.slice(0,10)}</td>
                      <td style={{fontSize:10,color:"#888",padding:"8px 6px",fontFamily:"monospace"}}>{p.tx_id}</td>
                      <td style={{fontSize:12,fontWeight:700,color:"#2e7d32",padding:"8px 6px",textAlign:"right"}}>₱{Number(p.amount||0).toLocaleString()}</td>
                      <td style={{fontSize:12,color:"#1565c0",padding:"8px 6px",textAlign:"right"}}>₱{Number(p.balance||0).toLocaleString()}</td>
                      <td style={{fontSize:11,color:"#888",padding:"8px 6px"}}>{p.note||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{marginTop:12,fontSize:12,color:"#888",textAlign:"right"}}>
              {loanHistoryData.length} payment{loanHistoryData.length!==1?"s":""} · Total: <strong style={{color:"#2e7d32"}}>₱{loanHistoryData.reduce((s,p)=>s+Number(p.amount||0),0).toLocaleString()}</strong>
            </div>
          </div>
          <div className="lp-modal-footer">
            <button className="lp-btn-cancel" onClick={() => setLoanHistory(null)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="lp-wrapper">
      {toast && <div className={`lp-toast lp-toast-${toast.type}`}>{toast.msg}</div>}
      <RecordModal loan={recordLoan} onClose={()=>setRecord(null)} onSave={handleSave}/>
      <LoanHistoryModal/>
      <ReceiptModal tx={viewTx} onClose={()=>setViewTx(null)}/>

      <div className="lp-page-header">
        <div>
          <div className="lp-page-title">Loan Payment</div>
          <div className="lp-page-sub">Record and track F2F loan payments collected at the office.</div>
        </div>
      </div>

      <div className="lp-summary-grid">
        <div className="lp-summary-card"><div className="lp-sum-icon" style={{background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center"}}><Wallet size={20} color="#2e7d32"/></div><div><div className="lp-sum-val">₱{totalCollected.toLocaleString()}</div><div className="lp-sum-label">Total Collected</div></div></div>
        <div className="lp-summary-card clickable" onClick={()=>{switchTab("loans");setFilter("Overdue");}}><div className="lp-sum-icon" style={{background:"#fce4ec",display:"flex",alignItems:"center",justifyContent:"center"}}><AlertTriangle size={20} color="#c62828"/></div><div><div className="lp-sum-val danger">{overdueCount}</div><div className="lp-sum-label">Overdue Loans</div></div></div>
        <div className="lp-summary-card"><div className="lp-sum-icon" style={{background:"#e3f2fd",display:"flex",alignItems:"center",justifyContent:"center"}}><BarChart3 size={20} color="#1565c0"/></div><div><div className="lp-sum-val blue">₱{totalOutstanding.toLocaleString()}</div><div className="lp-sum-label">Total Outstanding</div></div></div>
        <div className="lp-summary-card clickable" onClick={()=>switchTab("history")}><div className="lp-sum-icon" style={{background:"#f3e5f5",display:"flex",alignItems:"center",justifyContent:"center"}}><Receipt size={20} color="#6a1b9a"/></div><div><div className="lp-sum-val purple">{transactions.length}</div><div className="lp-sum-label">Transactions Recorded</div></div></div>
      </div>

      <div className="lp-card">
        <div className="lp-toolbar">
          <div className="lp-tabs">
            <button className={`lp-tab ${activeTab==="loans"?"active":""}`} onClick={()=>switchTab("loans")}>
              Active Loans <span className="lp-tab-count">{loans.length}</span>
            </button>
            <button className={`lp-tab ${activeTab==="history"?"active":""}`} onClick={()=>switchTab("history")}>
              Payment History <span className="lp-tab-count">{transactions.length}</span>
            </button>
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
            {activeTab==="history" && (
              <div className="lp-filter-tabs">
                <button className={`lp-filter-tab ${historyView==="daily"?"active ftab-all":""}`} onClick={()=>setHistoryView("daily")}>📅 Daily View</button>
                <button className={`lp-filter-tab ${historyView==="all"?"active ftab-all":""}`} onClick={()=>setHistoryView("all")}>📋 All Transactions</button>
              </div>
            )}
          </div>
        </div>

        {activeTab==="loans" && (
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead><tr>
                <th style={{width:"12%"}}>Loan ID</th>
                <th style={{width:"10%"}}>Member ID</th>
                <th style={{width:"14%"}}>Full Name</th>
                <th style={{width:"12%"}}>Loan Type</th>
                <th style={{width:"9%"}}>Amount</th>
                <th style={{width:"9%"}}>Balance</th>
                <th style={{width:"9%"}}>Monthly Due</th>
                <th style={{width:"7%"}}>Status</th>
                <th style={{width:"8%",textAlign:"center"}}>Action</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="lp-empty">Loading...</td></tr>
                : paginatedLoans.length===0 ? <tr><td colSpan={9} className="lp-empty">No loans found.</td></tr>
                : paginatedLoans.map((l,idx)=>(
                  <tr key={l.id}
                    className={`${idx%2===0?"row-even":"row-odd"} lp-clickable-row`}
                    onClick={()=>{ if(parseFloat(l.balance||0)>0) setRecord(l); }}
                    style={{cursor: parseFloat(l.balance||0)>0 ? "pointer" : "default"}}
                    title={parseFloat(l.balance||0)>0 ? "Click to record payment" : "Fully paid"}
                  >
                    <td className="mono cell-id">{l.loan_id}</td>
                    <td className="mono">{l.member_code}</td>
                    <td className="cell-name">{l.member_name}</td>
                    <td><span className="lp-type-pill">{l.loan_type}</span></td>
                    <td className="fw">₱{Number(l.amount||0).toLocaleString()}</td>
                    <td className={`fw ${l.status==="Overdue"?"danger":"blue"}`}>₱{Number(l.balance||0).toLocaleString()}</td>
                    <td className="fw green">₱{Number(l.monthly_due||0).toLocaleString()}</td>
                    <td><span className={`lp-loan-badge lp-${(l.status||"").toLowerCase()}`}>{l.status}</span></td>
                    <td style={{textAlign:"center"}} onClick={e=>e.stopPropagation()}>
                      <button className="lp-view-btn" onClick={e=>handleViewLoanHistory(e,l)} title="View payment history">
                        <Eye size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab==="history" && historyView==="daily" && (
          <div className="lp-daily-view">
            {loading ? <div className="lp-empty">Loading...</div>
            : dailyGroups.length===0 ? <div className="lp-empty">No transactions found.</div>
            : dailyGroups.map(([dateStr, txList]) => (
              <DailyGroup key={dateStr} dateStr={dateStr} txList={txList} onViewTx={setViewTx}/>
            ))}
          </div>
        )}

        {activeTab==="history" && historyView==="all" && (
          <div className="lp-table-wrap">
            <table className="lp-table history-table">
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
                : paginatedTx.length===0 ? <tr><td colSpan={9} className="lp-empty">No transactions found.</td></tr>
                : paginatedTx.map((t,idx)=>(
                  <tr key={t.id||t.txId} className={idx%2===0?"row-even":"row-odd"}>
                    <td className="mono cell-id">{t.tx_id}</td>
                    <td className="mono">{t.loan_code}</td>
                    <td className="mono">{t.member_code}</td>
                    <td className="cell-name">{t.member_name}</td>
                    <td className="fw green">₱{Number(t.amount||0).toLocaleString()}</td>
                    <td className="blue">₱{Number(t.balance||0).toLocaleString()}</td>
                    <td className="cell-date">{t.paid_at}</td>
                    <td><span className="hash-text">{t.polygon_tx ? '🔗 '+t.polygon_tx.slice(0,10)+'...' : t.hash}</span></td>
                    <td style={{textAlign:"center"}}><button className="lp-view-btn" onClick={()=>setViewTx(t)}><Eye size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab==="loans" && <Pagination list={filteredLoans}/>}
        {activeTab==="history" && historyView==="all" && <Pagination list={filteredTx}/>}

        {activeTab==="history" && historyView==="daily" && (
          <div className="lp-footer">
            <div className="lp-count">
              {dailyGroups.length} day{dailyGroups.length!==1?"s":""} · {filteredTx.length} total transaction{filteredTx.length!==1?"s":""}
            </div>
            <div className="lp-daily-grand-total">
              Grand Total: <strong>₱{filteredTx.reduce((s,t)=>s+parseFloat(t.amount||0),0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}