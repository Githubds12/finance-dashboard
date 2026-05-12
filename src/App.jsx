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
  Check
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
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

  useEffect(() => {
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    const merged = rawData.transactions.map(t => ({
      ...t,
      nickname: savedOverrides[t.id]?.nickname || t.nickname || '',
      notes: savedOverrides[t.id]?.notes || t.notes || ''
    }));
    setTransactions(merged);
  }, []);

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
      (t.nickname && t.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const getSyncData = () => {
    const overrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    return JSON.stringify(overrides, null, 2);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getSyncData());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="container">
      <header>
        <div>
          <h1>Financial Overview</h1>
          <div className="subtitle">
            Welcome back, <span style={{color: 'white', fontWeight: 'bold'}}>{rawData.metadata.name}</span>
          </div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px'}}>
            A/c: {rawData.metadata.account_no} • {rawData.metadata.account_type} • {rawData.metadata.merged_count} Records
          </div>
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
          <button className="btn-secondary" onClick={() => setShowSyncModal(true)}>
            <CloudDownload size={18} />
            Sync with AI
          </button>
          <div className="glass header-stat">
            <Calendar color="var(--accent-color)" size={18} />
            <div>
              <div className="stat-tiny-label">Range</div>
              <div className="stat-tiny-val">{transactions[0]?.date.split(' ').slice(1).join(' ')} - {transactions[transactions.length-1]?.date.split(' ').slice(1).join(' ')}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <div className="flex justify-between items-center mb-4">
              <h2 style={{fontSize: '1.2rem'}}>Sync your Notes & Renames</h2>
              <button onClick={() => setShowSyncModal(false)} className="btn-icon"><X size={20}/></button>
            </div>
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
              Copy this data and share it with Antigravity (AI) to permanently save your changes to the GitHub repository.
            </p>
            <div className="sync-data-box">
              <pre>{getSyncData()}</pre>
              <button className="copy-btn" onClick={copyToClipboard}>
                {copied ? <Check size={16} color="var(--success)"/> : <Copy size={16}/>}
                {copied ? 'Copied!' : 'Copy Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid">
        <div className="glass glass-card">
          <div className="stat-label">
            <Wallet size={18} color="var(--accent-color)" />
            Current Balance
          </div>
          <div className="stat-value">{formatCurrency(stats.currentBalance)}</div>
        </div>
        <div className="glass glass-card">
          <div className="stat-label">
            <ArrowDownCircle size={18} color="var(--success)" />
            All-Time Credits
          </div>
          <div className="stat-value text-success">+{formatCurrency(stats.totalIn)}</div>
        </div>
        <div className="glass glass-card">
          <div className="stat-label">
            <ArrowUpCircle size={18} color="var(--danger)" />
            All-Time Debits
          </div>
          <div className="stat-value text-danger">-{formatCurrency(stats.totalOut)}</div>
        </div>
      </div>

      <div className="glass glass-card mb-4">
        <div className="flex items-center gap-2" style={{marginBottom: '16px'}}>
          <Activity size={20} color="var(--accent-color)" />
          <h2 style={{fontSize: '1.2rem'}}>Balance History</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface-color)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)'
                }}
              />
              <Area type="monotone" dataKey="balance" stroke="var(--accent-color)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
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
            <input 
              type="text" 
              placeholder="Search payments..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{overflowX: 'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Detail / Notes</th>
                <th>Type</th>
                <th style={{textAlign: 'right'}}>Amount</th>
                <th style={{textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice().reverse().slice(0, visibleCount).map((txn) => (
                <tr key={txn.id}>
                  <td style={{color: 'var(--text-secondary)', verticalAlign: 'top', paddingTop: '20px'}}>
                    {txn.date}
                  </td>
                  <td style={{minWidth: '400px'}}>
                    {editingId === txn.id ? (
                      <div className="edit-container">
                        <input type="text" placeholder="Rename UPI" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="edit-input" autoFocus />
                        <textarea placeholder="Add a note..." value={editNote} onChange={(e) => setEditNote(e.target.value)} className="edit-textarea" />
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button onClick={() => handleSaveEdit(txn.id)} className="btn-save">Save</button>
                          <button onClick={() => setEditingId(null)} className="btn-cancel">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <div style={{fontWeight: '600', color: txn.nickname ? 'var(--accent-color)' : 'inherit'}}>
                          {txn.nickname || 'Unlabeled Payment'}
                        </div>
                        <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7}}>
                          {txn.description}
                        </div>
                        {txn.notes && (
                          <div className="note-display">
                            <FileText size={12} style={{marginRight: '4px'}} />
                            {txn.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{verticalAlign: 'top', paddingTop: '20px'}}>
                    <span className={`badge ${txn.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>{txn.type}</span>
                  </td>
                  <td style={{textAlign: 'right', fontWeight: '500', verticalAlign: 'top', paddingTop: '20px'}} className={txn.type === 'CREDIT' ? 'text-success' : ''}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                  <td style={{textAlign: 'right', verticalAlign: 'top', paddingTop: '16px'}}>
                    <button onClick={() => { setEditingId(txn.id); setEditValue(txn.nickname || ''); setEditNote(txn.notes || ''); }} className="btn-icon">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < filteredTransactions.length && (
            <div style={{textAlign: 'center', padding: '24px'}}>
              <button onClick={() => setVisibleCount(visibleCount + 100)} className="btn-load-more">
                Load More Records ({filteredTransactions.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .header-stat { padding: 8px 16px; display: flex; align-items: center; gap: 12px; }
        .stat-tiny-label { font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; }
        .stat-tiny-val { font-size: 0.8rem; font-weight: 600; }
        .btn-secondary {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
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
