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
  FileText
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

  // Load data and merge with localStorage
  useEffect(() => {
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    const merged = rawData.transactions.map(t => ({
      ...t,
      nickname: savedOverrides[t.id]?.nickname || '',
      notes: savedOverrides[t.id]?.notes || ''
    }));
    setTransactions(merged);
  }, []);

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    
    transactions.forEach(t => {
      if (t.type === 'CREDIT') totalIn += t.amount;
      else totalOut += t.amount;
    });

    const currentBalance = transactions[transactions.length - 1]?.balance || 0;

    const chartData = transactions.map(t => ({
      name: t.date.substring(0, 6),
      balance: t.balance
    }));

    return { totalIn, totalOut, currentBalance, chartData };
  }, [transactions]);

  const handleStartEdit = (txn) => {
    setEditingId(txn.id);
    setEditValue(txn.nickname || '');
    setEditNote(txn.notes || '');
  };

  const handleSaveEdit = (id) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        return { ...t, nickname: editValue, notes: editNote };
      }
      return t;
    });
    setTransactions(updated);
    
    // Persist to localStorage
    const savedOverrides = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
    savedOverrides[id] = { nickname: editValue, notes: editNote };
    localStorage.setItem('txn_overrides', JSON.stringify(savedOverrides));
    
    setEditingId(null);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
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
            A/c: {rawData.metadata.account_no} • {rawData.metadata.account_type}
          </div>
        </div>
        <div className="glass" style={{padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <Activity color="var(--success)" />
          <div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>System Status</div>
            <div style={{fontWeight: '600', color: 'var(--success)'}}>Live & Syncing</div>
          </div>
        </div>
      </header>

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
            Total Income
          </div>
          <div className="stat-value text-success">+{formatCurrency(stats.totalIn)}</div>
        </div>

        <div className="glass glass-card">
          <div className="stat-label">
            <ArrowUpCircle size={18} color="var(--danger)" />
            Total Expenses
          </div>
          <div className="stat-value text-danger">-{formatCurrency(stats.totalOut)}</div>
        </div>
      </div>

      <div className="glass glass-card mb-4">
        <div className="flex items-center gap-2" style={{marginBottom: '16px'}}>
          <Activity size={20} color="var(--accent-color)" />
          <h2 style={{fontSize: '1.2rem'}}>Balance Trend</h2>
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
              <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface-color)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="var(--accent-color)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass glass-card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={20} color="var(--accent-color)" />
            <h2 style={{fontSize: '1.2rem'}}>Transactions & Maintenance Records</h2>
          </div>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Payment / Note</th>
                <th>Type</th>
                <th style={{textAlign: 'right'}}>Amount</th>
                <th style={{textAlign: 'right'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice().reverse().map((txn) => (
                <tr key={txn.id}>
                  <td style={{color: 'var(--text-secondary)', verticalAlign: 'top', paddingTop: '20px'}}>
                    {txn.date}
                  </td>
                  <td style={{minWidth: '300px'}}>
                    {editingId === txn.id ? (
                      <div className="edit-container">
                        <input 
                          type="text" 
                          placeholder="Rename UPI (e.g. Rent, Grocery)"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="edit-input"
                          autoFocus
                        />
                        <textarea 
                          placeholder="Add a detailed maintenance note..."
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="edit-textarea"
                        />
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
                          <div style={{
                            marginTop: '8px', 
                            padding: '8px', 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            borderLeft: '3px solid var(--accent-color)'
                          }}>
                            <FileText size={12} style={{marginRight: '4px', display: 'inline'}} />
                            {txn.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{verticalAlign: 'top', paddingTop: '20px'}}>
                    <span className={`badge ${txn.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{textAlign: 'right', fontWeight: '500', verticalAlign: 'top', paddingTop: '20px'}} className={txn.type === 'CREDIT' ? 'text-success' : ''}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                  <td style={{textAlign: 'right', verticalAlign: 'top', paddingTop: '16px'}}>
                    {editingId === txn.id ? (
                      <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        <button onClick={() => handleSaveEdit(txn.id)} className="btn-icon btn-save">
                          <Save size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn-icon btn-cancel">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleStartEdit(txn)} className="btn-icon">
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .edit-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px 0;
        }
        .edit-input {
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--accent-color);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          outline: none;
          width: 100%;
        }
        .edit-textarea {
          background: rgba(255,255,255,0.1);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: 6px;
          outline: none;
          width: 100%;
          min-height: 60px;
          resize: vertical;
          font-size: 0.9rem;
        }
        .btn-icon {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          color: var(--accent-color);
        }
        .btn-save { color: var(--success); }
        .btn-save:hover { background: rgba(16, 185, 129, 0.1); color: var(--success); }
        .btn-cancel { color: var(--danger); }
        .btn-cancel:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); }
      `}} />
    </div>
  );
}

export default App;
