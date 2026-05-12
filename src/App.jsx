import React, { useMemo, useState, useEffect } from 'react';
import { 
  Home, 
  Target, 
  GraduationCap, 
  Activity,
  CreditCard,
  Edit2,
  Save,
  X,
  FileText,
  Search,
  CloudUpload,
  ChevronRight,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Repeat,
  History,
  LayoutDashboard
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
  const [activeTab, setActiveTab] = useState('home'); // home, insights, records
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
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

  const stats = useMemo(() => {
    let totalIn = 0; let totalOut = 0;
    transactions.forEach(t => {
      if (t.type === 'CREDIT') totalIn += t.amount;
      else if (t.type === 'DEBIT') totalOut += t.amount;
    });
    const currentBalance = transactions[transactions.length - 1]?.balance || 0;
    const chartData = transactions
      .filter((_, i) => i % Math.max(1, Math.floor(transactions.length / 100)) === 0)
      .map(t => ({ name: t.date, balance: t.balance }));
    return { totalIn, totalOut, currentBalance, chartData };
  }, [transactions]);

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
      frequent: [...list].sort((a, b) => b.count - a.count).slice(0, 5),
      spending: [...list].sort((a, b) => b.amount - a.amount).slice(0, 5)
    };
  }, [transactions]);

  const handleCloudSync = async () => {
    setSyncing(true);
    const overrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides)
      });
      if (response.ok) {
        setSyncStatus('success');
        localStorage.removeItem('txn_overrides');
      } else setSyncStatus('error');
    } catch { setSyncStatus('error'); }
    finally { setSyncing(false); setTimeout(() => setSyncStatus(null), 3000); }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="layout">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <Home size={24} />
        </div>
        <div className={`sidebar-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
          <Target size={24} />
        </div>
        <div className={`sidebar-item ${activeTab === 'records' ? 'active' : ''}`} onClick={() => setActiveTab('records')}>
          <GraduationCap size={24} />
        </div>
      </div>

      <div className="main-content">
        <div className="top-header">
          <div className="live-badge">
            <div className="live-dot"></div>
            LIVE
          </div>
          <h1 className="dashboard-title">Dashboard</h1>
        </div>

        {/* Hero Banner */}
        <div className="hero-banner">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="hero-title">Maximize Wealth</div>
            <div className="hero-subtitle">Smarter Tracking • Better Decisions • Global Access</div>
          </div>
        </div>

        {/* Dynamic Quote Card */}
        <div className="quote-card">
          <div className="quote-text">"Financial freedom is available to those who learn about it and work for it."</div>
          <div className="quote-author">— ROBERT KIYOSAKI</div>
        </div>

        {activeTab === 'home' && (
          <div className="view-fade-in">
            {/* Main Metrics */}
            <div className="metrics-grid">
              <div className="metric-card-xl" style={{background: 'linear-gradient(135deg, #6366f1, #a855f7)'}}>
                <div className="metric-info">
                  <h3>Net Worth Estimate</h3>
                  <div className="metric-value">{formatCurrency(stats.currentBalance)}</div>
                </div>
                <div className="metric-icon-box">
                  <TrendingUp size={32} color="white" />
                </div>
              </div>
              <div className="metric-card-xl" style={{background: 'linear-gradient(135deg, #10b981, #3b82f6)'}}>
                <div className="metric-info">
                  <h3>Total Transactions</h3>
                  <div className="metric-value">{rawData.metadata.merged_count}</div>
                </div>
                <div className="metric-icon-box">
                  <Activity size={32} color="white" />
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <div className="flex justify-between items-center mb-6">
                <h2>Spending Trends</h2>
                <button 
                  className={`btn-sync ${syncStatus === 'success' ? 'success' : ''}`} 
                  onClick={handleCloudSync}
                  style={{background: 'var(--accent-primary)', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center'}}
                >
                  {syncing ? <Loader2 className="animate-spin" size={18}/> : <CloudUpload size={18}/>}
                  {syncing ? 'SYNCING...' : syncStatus === 'success' ? 'SYNCED!' : 'SYNC TO CLOUD'}
                </button>
              </div>
              <div style={{height: '300px', width: '100%'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{background: 'var(--bg-sidebar)', border: '1px solid var(--glass-border)', borderRadius: '12px'}}/>
                    <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorBalance)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel">
              <h2 className="mb-6">Recent Records</h2>
              <table>
                <thead>
                  <tr><th>Date</th><th>Description</th><th style={{textAlign: 'right'}}>Amount</th></tr>
                </thead>
                <tbody>
                  {transactions.slice().reverse().slice(0, 10).map(t => (
                    <tr key={t.id}>
                      <td style={{color: 'var(--text-muted)'}}>{t.date}</td>
                      <td>
                        <div style={{fontWeight: '700'}}>{t.nickname || t.entity}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.description}</div>
                      </td>
                      <td style={{textAlign: 'right', fontWeight: '800'}} className={t.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}>
                        {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="view-fade-in">
            <h2 className="mb-6">Merchant Insights</h2>
            <div className="metrics-grid">
              <div className="glass-panel" style={{margin: 0}}>
                <h3>Top Payees (Frequency)</h3>
                <div style={{marginTop: '20px'}}>
                  {merchantStats.frequent.map((m, i) => (
                    <div key={m.name} className="flex justify-between items-center p-4 mb-2" style={{background: 'rgba(255,255,255,0.02)', borderRadius: '12px'}}>
                      <div className="flex items-center gap-4">
                        <div style={{width: '32px', height: '32px', background: 'var(--accent-primary)', color: 'black', borderRadius: '8px', display: 'flex', alignItems: 'center', justify-content: 'center', fontWeight: '800'}}>{i+1}</div>
                        <div>
                          <div style={{fontWeight: '700'}}>{m.name}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{m.count} payments</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-panel" style={{margin: 0}}>
                <h3>Highest Spend</h3>
                <div style={{marginTop: '20px'}}>
                  {merchantStats.spending.map((m, i) => (
                    <div key={m.name} className="flex justify-between items-center p-4 mb-2" style={{background: 'rgba(255,255,255,0.02)', borderRadius: '12px'}}>
                      <div className="flex items-center gap-4">
                        <div style={{width: '32px', height: '32px', background: 'var(--accent-secondary)', color: 'black', borderRadius: '8px', display: 'flex', alignItems: 'center', justify-content: 'center', fontWeight: '800'}}>{i+1}</div>
                        <div>
                          <div style={{fontWeight: '700'}}>{m.name}</div>
                          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{formatCurrency(m.amount)} total</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="view-fade-in">
            <div className="glass-panel">
              <div className="flex justify-between items-center mb-6">
                <h2>All Maintenance Logs</h2>
                <div className="search-box" style={{background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', width: '300px'}}>
                  <Search size={18} color="var(--text-muted)" />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{background: 'none', border: 'none', color: 'white', outline: 'none'}} />
                </div>
              </div>
              <table>
                <thead>
                  <tr><th>Date</th><th>Record Info</th><th>Type</th><th style={{textAlign: 'right'}}>Amount</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {transactions.slice().reverse().filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 50).map(t => (
                    <tr key={t.id}>
                      <td style={{color: 'var(--text-muted)'}}>{t.date}</td>
                      <td>
                        <div style={{fontWeight: '700'}}>{t.nickname || t.entity}</div>
                        {t.notes && <div style={{fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '4px'}}>• {t.notes}</div>}
                      </td>
                      <td><span className={`badge ${t.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>{t.type}</span></td>
                      <td style={{textAlign: 'right', fontWeight: '800'}}>{formatCurrency(t.amount)}</td>
                      <td>
                        <button className="btn-icon" onClick={() => { setEditingId(t.id); setEditValue(t.nickname || ''); setEditNote(t.notes || ''); }}>
                          <Edit2 size={16} color="var(--text-muted)"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {editingId && (
          <div className="modal-overlay" style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justify-content: 'center', z-index: 1000}}>
            <div className="glass-panel" style={{width: '400px'}}>
              <h2 className="mb-4">Edit Entry</h2>
              <input type="text" value={editValue} onChange={(e)=>setEditValue(e.target.value)} placeholder="Rename" style={{width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', marginBottom: '12px'}} />
              <textarea value={editNote} onChange={(e)=>setEditNote(e.target.value)} placeholder="Maintenance Notes" style={{width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'white', minHeight: '100px', marginBottom: '16px'}} />
              <div className="flex gap-2">
                <button onClick={() => {
                  const updated = transactions.map(t => t.id === editingId ? {...t, nickname: editValue, notes: editNote} : t);
                  setTransactions(updated);
                  const saved = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
                  saved[editingId] = { nickname: editValue, notes: editNote };
                  localStorage.setItem('txn_overrides', JSON.stringify(saved));
                  setEditingId(null);
                }} style={{flex: 1, background: 'var(--accent-primary)', color: 'black', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer'}}>SAVE</button>
                <button onClick={() => setEditingId(null)} style={{flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer'}}>CANCEL</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .flex { display: flex; } .justify-between { justify-content: space-between; } .items-center { align-items: center; } .gap-2 { gap: 8px; } .gap-4 { gap: 16px; } .mb-2 { margin-bottom: 8px; } .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; } .p-4 { padding: 16px; }
        .btn-icon { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; transition: background 0.3s; }
        .btn-icon:hover { background: rgba(255,255,255,0.1); }
      `}} />
    </div>
  );
}

export default App;
