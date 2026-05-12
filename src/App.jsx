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
  CloudDownload,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  ChevronRight,
  ArrowLeft
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
  Bar,
  Cell
} from 'recharts';
import rawData from './data.json';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);

  useEffect(() => {
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    const merged = rawData.transactions.map(t => {
      // Extract Merchant/UPI Entity
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
    const topByCount = [...list].sort((a, b) => b.count - a.count).slice(0, 10);
    const topByAmount = [...list].sort((a, b) => b.amount - a.amount).slice(0, 10);

    return { topByCount, topByAmount, all: map };
  }, [transactions]);

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
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

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  if (selectedMerchant) {
    const m = merchantStats.all[selectedMerchant];
    const chartData = m.txns.map(t => ({ name: t.date, amount: t.amount }));

    return (
      <div className="container">
        <header>
          <button onClick={() => setSelectedMerchant(null)} className="btn-secondary" style={{padding: '8px 12px'}}>
            <ArrowLeft size={18} /> Back
          </button>
          <div style={{flex: 1, marginLeft: '16px'}}>
            <h1>{selectedMerchant}</h1>
            <div className="subtitle">Merchant Insights</div>
          </div>
        </header>

        <div className="grid">
          <div className="glass glass-card">
            <div className="stat-label">Total Transactions</div>
            <div className="stat-value">{m.count}</div>
          </div>
          <div className="glass glass-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value text-danger">{formatCurrency(m.amount)}</div>
          </div>
          <div className="glass glass-card">
            <div className="stat-label">Avg. per Transaction</div>
            <div className="stat-value">{formatCurrency(m.amount / m.count)}</div>
          </div>
        </div>

        <div className="glass glass-card mb-4">
          <h2 style={{marginBottom: '16px'}}>Payment History Trend</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass glass-card">
          <h2>Recent Payments to {selectedMerchant}</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th style={{textAlign: 'right'}}>Amount</th></tr>
            </thead>
            <tbody>
              {m.txns.slice().reverse().map(t => (
                <tr key={t.id}>
                  <td style={{color: 'var(--text-secondary)'}}>{t.date}</td>
                  <td style={{fontSize: '0.8rem', opacity: 0.7}}>{t.description}</td>
                  <td style={{textAlign: 'right', fontWeight: '600'}}>{formatCurrency(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div>
          <h1>Financial Overview</h1>
          <div className="subtitle">Welcome back, <span style={{color: 'white', fontWeight: 'bold'}}>{rawData.metadata.name}</span></div>
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
          <button className="btn-secondary" onClick={() => setShowSyncModal(true)}><CloudDownload size={18} /> Sync with AI</button>
        </div>
      </header>

      {showSyncModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2>Sync Data</h2>
              <button onClick={() => setShowSyncModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <div className="sync-data-box">
              <pre>{JSON.stringify(JSON.parse(localStorage.getItem('txn_overrides') || '{}'), null, 2)}</pre>
              <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(localStorage.getItem('txn_overrides')); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>
                {copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="glass glass-card">
          <div className="stat-label">Current Balance</div>
          <div className="stat-value">{formatCurrency(stats.currentBalance)}</div>
        </div>
        <div className="glass glass-card">
          <div className="stat-label">All-Time Credits</div>
          <div className="stat-value text-success">+{formatCurrency(stats.totalIn)}</div>
        </div>
        <div className="glass glass-card">
          <div className="stat-label">All-Time Debits</div>
          <div className="stat-value text-danger">-{formatCurrency(stats.totalOut)}</div>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px'}}>
        <div className="glass glass-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} color="var(--success)" />
            <h2>Most Frequent Payments</h2>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {merchantStats.topByCount.map((m, i) => (
              <div key={m.name} className="merchant-row" onClick={() => setSelectedMerchant(m.name)}>
                <div className="merchant-rank">{i + 1}</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: '600'}}>{m.name}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{m.count} payments</div>
                </div>
                <ChevronRight size={16} color="var(--text-secondary)" />
              </div>
            ))}
          </div>
        </div>

        <div className="glass glass-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} color="var(--accent-color)" />
            <h2>Highest Total Spend</h2>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {merchantStats.topByAmount.map((m, i) => (
              <div key={m.name} className="merchant-row" onClick={() => setSelectedMerchant(m.name)}>
                <div className="merchant-rank" style={{background: 'rgba(255,255,255,0.05)'}}>{i + 1}</div>
                <div style={{flex: 1}}>
                  <div style={{fontWeight: '600'}}>{m.name}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{formatCurrency(m.amount)} total</div>
                </div>
                <ChevronRight size={16} color="var(--text-secondary)" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass glass-card">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} color="var(--accent-color)" />
            <h2 style={{fontSize: '1.2rem'}}>Maintenance Records</h2>
          </div>
          <div className="search-box">
            <Search size={16} color="var(--text-secondary)" />
            <input type="text" placeholder="Search payments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table>
            <thead>
              <tr><th>Date</th><th>Detail / Notes</th><th>Type</th><th style={{textAlign: 'right'}}>Amount</th><th style={{textAlign: 'right'}}>Action</th></tr>
            </thead>
            <tbody>
              {filteredTransactions.slice().reverse().slice(0, visibleCount).map((txn) => (
                <tr key={txn.id}>
                  <td style={{color: 'var(--text-secondary)', verticalAlign: 'top', paddingTop: '20px'}}>{txn.date}</td>
                  <td style={{minWidth: '400px'}}>
                    {editingId === txn.id ? (
                      <div className="edit-container">
                        <input type="text" placeholder="Nickname" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="edit-input" autoFocus />
                        <textarea placeholder="Notes" value={editNote} onChange={(e) => setEditNote(e.target.value)} className="edit-textarea" />
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button onClick={() => handleSaveEdit(txn.id)} className="btn-save">Save</button>
                          <button onClick={() => setEditingId(null)} className="btn-cancel">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <div style={{fontWeight: '600', color: txn.nickname ? 'var(--accent-color)' : 'inherit'}}>{txn.nickname || txn.entity}</div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7}}>{txn.description}</div>
                        {txn.notes && <div className="note-display"><FileText size={12} style={{marginRight: '4px'}} />{txn.notes}</div>}
                      </div>
                    )}
                  </td>
                  <td style={{verticalAlign: 'top', paddingTop: '20px'}}><span className={`badge ${txn.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>{txn.type}</span></td>
                  <td style={{textAlign: 'right', fontWeight: '500', verticalAlign: 'top', paddingTop: '20px'}} className={txn.type === 'CREDIT' ? 'text-success' : ''}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                  <td style={{textAlign: 'right', verticalAlign: 'top', paddingTop: '16px'}}>
                    <button onClick={() => { setEditingId(txn.id); setEditValue(txn.nickname || ''); setEditNote(txn.notes || ''); }} className="btn-icon"><Edit2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < filteredTransactions.length && (
            <div style={{textAlign: 'center', padding: '24px'}}>
              <button onClick={() => setVisibleCount(visibleCount + 100)} className="btn-load-more">Load More Records</button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .merchant-row { display: flex; align-items: center; gap: 16px; padding: 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .merchant-row:hover { background: rgba(255,255,255,0.05); border-color: var(--border-color); }
        .merchant-rank { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--accent-color); color: white; border-radius: 8px; font-weight: 700; font-size: 0.9rem; }
        .header-stat { padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
        .btn-secondary { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: white; padding: 8px 16px; border-radius: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: var(--accent-color); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-content { width: 90%; max-width: 600px; padding: 32px; position: relative; border: 1px solid var(--accent-color); }
        .sync-data-box { background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); position: relative; }
        .sync-data-box pre { padding: 20px; color: var(--accent-color); font-size: 0.8rem; max-height: 300px; overflow-y: auto; margin: 0; }
        .copy-btn { position: absolute; top: 12px; right: 12px; background: var(--accent-color); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; }
        .search-box { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 16px; display: flex; align-items: center; gap: 12px; flex: 1; max-width: 400px; }
        .search-box input { background: none; border: none; color: white; outline: none; width: 100%; }
        .note-display { margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.05); borderRadius: 4px; fontSize: 0.9rem; border-left: 3px solid var(--accent-color); display: flex; align-items: center; }
        .btn-load-more { background: rgba(255,255,255,0.1); color: white; border: 1px solid var(--border-color); padding: 12px 24px; border-radius: 8px; cursor: pointer; width: 100%; transition: all 0.2s; }
        .btn-load-more:hover { background: rgba(255,255,255,0.15); border-color: var(--accent-color); }
        .btn-save { background: var(--success) !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        .btn-cancel { background: rgba(255,255,255,0.1) !important; color: white !important; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
      `}} />
    </div>
  );
}

export default App;
