import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Wallet, 
  Activity,
  CreditCard,
  Edit2,
  Save,
  X,
  FileText,
  Search,
  Calendar,
  CloudUpload,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  Repeat,
  History,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import rawData from './data.json';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [view, setView] = useState('overview');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error', null
  const [selectedMerchant, setSelectedMerchant] = useState(null);

  useEffect(() => {
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    const merged = rawData.transactions.map(t => {
      let entity = 'Other';
      if (t.description.startsWith('UPI/')) {
        const parts = t.description.split('/');
        if (parts.length > 1) {
          entity = parts[1].split(' ')[0].split('-')[0].split('UPI')[0].trim();
          if (!entity) entity = 'UPI Payment';
        }
      } else if (t.description.includes('Int.Pd')) {
        entity = 'Bank Interest';
      }
      return {
        ...t,
        entity,
        nickname: savedOverrides[t.id]?.nickname || t.nickname || '',
        notes: savedOverrides[t.id]?.notes || t.notes || ''
      };
    });
    setTransactions(merged);
  }, []);

  const merchantStats = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type === 'DEBIT') {
        if (!map[t.entity]) map[t.entity] = { name: t.entity, count: 0, amount: 0, txns: [] };
        map[t.entity].count += 1;
        map[t.entity].amount += t.amount;
        map[t.entity].txns.push(t);
      }
    });
    const list = Object.values(map);
    return {
      frequent: [...list].sort((a, b) => b.count - a.count),
      spending: [...list].sort((a, b) => b.amount - a.amount),
      all: map
    };
  }, [transactions]);

  const stats = useMemo(() => {
    let totalIn = 0; totalOut = 0;
    transactions.forEach(t => {
      if (t.type === 'CREDIT') totalIn += t.amount;
      else if (t.type === 'DEBIT') totalOut += t.amount;
    });
    const currentBalance = transactions[transactions.length - 1]?.balance || 0;
    const sampledChartData = transactions
      .filter((_, i) => i % Math.max(1, Math.floor(transactions.length / 100)) === 0)
      .map(t => ({ name: t.date, balance: t.balance }));
    return { totalIn, totalOut, currentBalance, chartData: sampledChartData };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.nickname && t.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [transactions, searchTerm]);

  const handleSaveEdit = (id) => {
    const updated = transactions.map(t => {
      if (t.id === id) return { ...t, nickname: editValue, notes: editNote };
      return t;
    });
    setTransactions(updated);
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    savedOverrides[id] = { nickname: editValue, notes: editNote };
    localStorage.setItem('txn_overrides', JSON.stringify(savedOverrides));
    setEditingId(null);
  };

  const handleCloudSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const overrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides)
      });
      
      if (response.ok) {
        setSyncStatus('success');
        // Clear local storage after successful cloud sync
        localStorage.removeItem('txn_overrides');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      setSyncStatus('error');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const NavButton = ({ id, label, icon: Icon }) => (
    <button className={`nav-btn ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setSelectedMerchant(null); }}>
      <Icon size={18} /><span>{label}</span>
    </button>
  );

  return (
    <div className="container">
      <header>
        <div>
          <h1>Finance Dashboard</h1>
          <div className="subtitle">Welcome, {rawData.metadata.name}</div>
        </div>
        <div className="nav-group">
          <NavButton id="overview" label="Overview" icon={LayoutDashboard} />
          <NavButton id="frequent" label="Frequent" icon={Repeat} />
          <NavButton id="spend" label="Spend" icon={TrendingUp} />
          <NavButton id="records" label="History" icon={History} />
        </div>
        <button 
          className={`btn-sync ${syncStatus === 'success' ? 'success' : ''} ${syncStatus === 'error' ? 'error' : ''}`} 
          onClick={handleCloudSync} 
          disabled={syncing}
        >
          {syncing ? <Loader2 size={20} className="animate-spin" /> : 
           syncStatus === 'success' ? <Check size={20} /> : 
           syncStatus === 'error' ? <X size={20} /> : <CloudUpload size={20} />}
          <span>{syncing ? 'Saving...' : syncStatus === 'success' ? 'Saved!' : 'Save to Cloud'}</span>
        </button>
      </header>

      {selectedMerchant ? (
        <div className="view-fade-in">
          <div className="merchant-header">
            <button onClick={() => setSelectedMerchant(null)} className="btn-back"><ArrowLeft size={18}/> Back</button>
            <h2>Analysis: {selectedMerchant}</h2>
          </div>
          <div className="grid">
            <div className="glass glass-card"><div className="stat-label">Frequency</div><div className="stat-value">{merchantStats.all[selectedMerchant].count}x</div></div>
            <div className="glass glass-card"><div className="stat-label">Total Spent</div><div className="stat-value text-danger">{formatCurrency(merchantStats.all[selectedMerchant].amount)}</div></div>
            <div className="glass glass-card"><div className="stat-label">Average</div><div className="stat-value">{formatCurrency(merchantStats.all[selectedMerchant].amount / merchantStats.all[selectedMerchant].count)}</div></div>
          </div>
          <div className="glass glass-card mb-4">
            <h3>Spend Distribution</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantStats.all[selectedMerchant].txns.map(t => ({ name: t.date, amount: t.amount }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" hide /><YAxis hide /><Tooltip contentStyle={{background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px'}}/>
                  <Bar dataKey="amount" fill="var(--accent-color)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="view-fade-in">
          {view === 'overview' && (
            <>
              <div className="grid">
                <div className="glass glass-card"><div className="stat-label">Current Balance</div><div className="stat-value">{formatCurrency(stats.currentBalance)}</div></div>
                <div className="glass glass-card"><div className="stat-label">Total Income</div><div className="stat-value text-success">+{formatCurrency(stats.totalIn)}</div></div>
                <div className="glass glass-card"><div className="stat-label">Total Expenses</div><div className="stat-value text-danger">-{formatCurrency(stats.totalOut)}</div></div>
              </div>
              <div className="glass glass-card mb-4">
                <h2 className="mb-4">Net Worth History</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData}>
                      <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} /><XAxis hide /><YAxis hide /><Tooltip contentStyle={{background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px'}}/>
                      <Area type="monotone" dataKey="balance" stroke="var(--accent-color)" strokeWidth={3} fill="url(#c)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {view === 'frequent' && (
            <div className="merchant-list">
              {merchantStats.frequent.slice(0, 30).map((m, i) => (
                <div key={m.name} className="glass merchant-card-big" onClick={() => setSelectedMerchant(m.name)}>
                  <div className="merchant-rank-badge">{i+1}</div>
                  <div className="merchant-info">
                    <h3>{m.name}</h3>
                    <div className="merchant-meta"><span>{m.count} Payments</span><span className="dot"></span><span>{formatCurrency(m.amount)} Total</span></div>
                  </div>
                  <ChevronRight size={20} className="arrow" />
                </div>
              ))}
            </div>
          )}

          {view === 'spend' && (
            <div className="merchant-list">
              {merchantStats.spending.slice(0, 30).map((m, i) => (
                <div key={m.name} className="glass merchant-card-big" onClick={() => setSelectedMerchant(m.name)}>
                  <div className="merchant-rank-badge" style={{background: 'rgba(255,255,255,0.05)'}}>{i+1}</div>
                  <div className="merchant-info">
                    <h3>{m.name}</h3>
                    <div className="merchant-meta"><span>{m.count} Payments</span><span className="dot"></span><span>{formatCurrency(m.amount)} Total</span></div>
                  </div>
                  <ChevronRight size={20} className="arrow" />
                </div>
              ))}
            </div>
          )}

          {view === 'records' && (
            <div className="glass glass-card">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2>Maintenance Records</h2>
                <div className="search-box">
                  <Search size={16} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div style={{overflowX: 'auto'}}>
                <table>
                  <thead><tr><th>Date</th><th>Description</th><th>Type</th><th style={{textAlign: 'right'}}>Amount</th><th></th></tr></thead>
                  <tbody>
                    {filteredTransactions.slice().reverse().slice(0, visibleCount).map((txn) => (
                      <tr key={txn.id}>
                        <td style={{color: 'var(--text-secondary)'}}>{txn.date}</td>
                        <td style={{minWidth: '350px'}}>
                          <div style={{fontWeight: '600', color: txn.nickname ? 'var(--accent-color)' : 'inherit'}}>{txn.nickname || txn.entity}</div>
                          <div style={{fontSize: '0.8rem', opacity: 0.7}}>{txn.description}</div>
                          {txn.notes && <div className="note-box"><FileText size={12}/>{txn.notes}</div>}
                        </td>
                        <td><span className={`badge ${txn.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>{txn.type}</span></td>
                        <td style={{textAlign: 'right', fontWeight: '500'}} className={txn.type === 'CREDIT' ? 'text-success' : ''}>
                          {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                        </td>
                        <td><button onClick={() => {setEditingId(txn.id); setEditValue(txn.nickname||''); setEditNote(txn.notes||'');}} className="btn-icon"><Edit2 size={16}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{textAlign: 'center', padding: '24px'}}><button onClick={() => setVisibleCount(visibleCount + 100)} className="btn-load-more">Load More</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {editingId && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h2>Edit Record</h2>
            <input type="text" className="edit-input mt-4" value={editValue} onChange={(e)=>setEditValue(e.target.value)} placeholder="Rename" autoFocus />
            <textarea className="edit-textarea mt-2" value={editNote} onChange={(e)=>setEditNote(e.target.value)} placeholder="Notes" />
            <div className="flex gap-2 mt-4">
              <button className="btn-save" onClick={()=>handleSaveEdit(editingId)}>Save Locally</button>
              <button className="btn-cancel" onClick={()=>setEditingId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .btn-sync { background: var(--accent-color); color: white; border: none; padding: 8px 16px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; transition: all 0.2s; }
        .btn-sync:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-sync.success { background: var(--success); }
        .btn-sync.error { background: var(--danger); }
        .nav-group { display: flex; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 12px; border: 1px solid var(--border-color); }
        .nav-btn { background: none; border: none; color: var(--text-secondary); padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; font-weight: 500; }
        .nav-btn.active { background: var(--accent-color); color: white; }
        .merchant-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .merchant-card-big { padding: 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; position: relative; }
        .merchant-card-big:hover { background: rgba(255,255,255,0.05); border-color: var(--accent-color); transform: translateY(-2px); }
        .merchant-rank-badge { width: 40px; height: 40px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: 700; color: var(--accent-color); border: 1px solid var(--border-color); }
        .merchant-info h3 { margin: 0; font-size: 1rem; }
        .merchant-meta { font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .dot { width: 4px; height: 4px; background: var(--border-color); border-radius: 50%; }
        .note-box { margin-top: 8px; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 4px; border-left: 2px solid var(--accent-color); font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
        .view-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .merchant-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .btn-back { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; } .mb-4 { margin-bottom: 16px; }
      `}} />
    </div>
  );
}

export default App;
