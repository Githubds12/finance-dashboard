import React, { useMemo } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Wallet, 
  Activity,
  CreditCard
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
import data from './data.json';
import './index.css';

function App() {
  const { metadata, transactions } = data;

  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    
    transactions.forEach(t => {
      if (t.type === 'CREDIT') totalIn += t.amount;
      else totalOut += t.amount;
    });

    const currentBalance = transactions[transactions.length - 1]?.balance || 0;

    // Prepare chart data
    const chartData = transactions.map(t => ({
      name: t.date.substring(0, 6),
      balance: t.balance,
      in: t.type === 'CREDIT' ? t.amount : 0,
      out: t.type === 'DEBIT' ? t.amount : 0
    }));

    return { totalIn, totalOut, currentBalance, chartData };
  }, [transactions]);

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
            Welcome back, <span style={{color: 'white', fontWeight: 'bold'}}>{metadata.name}</span>
          </div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px'}}>
            A/c: {metadata.account_no} • {metadata.account_type}
          </div>
        </div>
        <div className="glass" style={{padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <Activity color="var(--success)" />
          <div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>System Status</div>
            <div style={{fontWeight: '600', color: 'var(--success)'}}>Live & Synced</div>
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
            <AreaChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-color)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent-color)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--text-secondary)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--surface-color)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)'
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
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
            <h2 style={{fontSize: '1.2rem'}}>Recent Transactions</h2>
          </div>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th style={{textAlign: 'right'}}>Amount</th>
                <th style={{textAlign: 'right'}}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice().reverse().map((txn) => (
                <tr key={txn.id}>
                  <td style={{color: 'var(--text-secondary)', whiteSpace: 'nowrap'}}>
                    {txn.date}
                  </td>
                  <td style={{maxWidth: '300px'}}>
                    <div style={{
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis'
                    }} title={txn.description}>
                      {txn.description}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${txn.type === 'CREDIT' ? 'badge-credit' : 'badge-debit'}`}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{textAlign: 'right', fontWeight: '500'}} className={txn.type === 'CREDIT' ? 'text-success' : ''}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </td>
                  <td style={{textAlign: 'right', color: 'var(--text-secondary)'}}>
                    {formatCurrency(txn.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
