import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Target, 
  GraduationCap, 
  Activity,
  Edit2,
  X,
  FileText,
  Search,
  CloudUpload,
  ChevronRight,
  ArrowLeft,
  Loader2,
  TrendingUp,
  MessageSquare,
  Send,
  Bot,
  Plus,
  Trash2,
  Clock,
  Check,
  MoreVertical
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
  const [activeTab, setActiveTab] = useState('home'); // home, insights, records, chat
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  // Advanced Chat State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('active_session_id'));
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Rename State
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const chatEndRef = useRef(null);

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
    
    // Initial fetch from server
    fetchSessions();
  }, []);

  useEffect(() => {
    if (activeSessionId) localStorage.setItem('active_session_id', activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isTyping]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !activeSessionId) {
          setActiveSessionId(data.sessions[0].id);
        }
      }
    } catch (err) { console.error('Sync failed'); }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const newSess = await res.json();
      setSessions([newSess, ...sessions]);
      setActiveSessionId(newSess.id);
      setRenamingId(newSess.id);
      setRenameValue(newSess.title);
    } catch (err) { console.error('Create failed'); }
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue })
      });
      if (res.ok) {
        setSessions(sessions.map(s => s.id === id ? { ...s, title: renameValue } : s));
      }
      setRenamingId(null);
    } catch (err) { console.error('Rename failed'); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeSessionId) return;
    const msg = chatInput;
    setChatInput('');
    setIsTyping(true);

    // Optimistic Update
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'user', text: msg }] } : s));

    try {
      const res = await fetch(`/api/chat/${activeSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'ai', text: data.text }] } : s
      ));
    } catch (err) {
      console.error('Chat error');
    } finally {
      setIsTyping(false);
    }
  };

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

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId);
  }, [sessions, activeSessionId]);

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
        <div className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          <MessageSquare size={24} />
        </div>
      </div>

      <div className="main-content">
        <div className="top-header">
          <div className="live-badge">
            <div className="live-dot"></div>
            LIVE ANALYST
          </div>
          <h1 className="dashboard-title">
            {activeTab === 'chat' ? 'Analyst Manager' : 'Dashboard'}
          </h1>
        </div>

        {activeTab === 'chat' ? (
          <div className="view-fade-in ai-layout">
            {/* Session Sidebar */}
            <div className="ai-sidebar">
              <button className="btn-new-chat" onClick={createNewSession}>
                <Plus size={18} /> New Analysis
              </button>
              <div className="session-list">
                {sessions.map(s => (
                  <div 
                    key={s.id} 
                    className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    {renamingId === s.id ? (
                      <div className="rename-container">
                        <input 
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(s.id)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRename(s.id)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="session-info">
                          <div className="session-title">{s.title}</div>
                          <div className="session-meta">
                            <Clock size={10} /> {new Date(s.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <button className="btn-rename-trigger" onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(s.id);
                          setRenameValue(s.title);
                        }}>
                          <Edit2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="ai-chat-area">
              {activeSession ? (
                <>
                  <div className="chat-header-minimal">
                    <h2>{activeSession.title}</h2>
                    <div className="engine-tag">GEMINI 1.5 FLASH</div>
                  </div>
                  <div className="chat-body">
                    {activeSession.history.length === 0 && (
                      <div className="chat-welcome">
                        <Bot size={48} color="var(--accent-primary)" />
                        <h2>Ready to analyze, {rawData.metadata.name}.</h2>
                        <p>Ask me anything about your {rawData.metadata.merged_count} transactions.</p>
                      </div>
                    )}
                    {activeSession.history.map((msg, i) => (
                      <div key={i} className={`message-bubble ${msg.role}`}>
                        <div className="bubble-content">{msg.text}</div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="message-bubble ai">
                        <div className="bubble-content typing">Analyzing statements...</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="chat-footer">
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        placeholder="Type your question..." 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button onClick={handleSendMessage} disabled={!chatInput.trim() || isTyping}>
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="chat-empty-state">
                  <MessageSquare size={64} opacity={0.1} />
                  <p>Select a session to begin analysis</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="view-fade-in dashboard-content">
             {activeTab === 'home' && (
              <>
                <div className="hero-banner">
                  <div className="hero-overlay"></div>
                  <div className="hero-content">
                    <div className="hero-title">Maximize Wealth</div>
                    <div className="hero-subtitle">Smarter Tracking • Better Decisions • Global Access</div>
                  </div>
                </div>
                
                <div className="metrics-grid">
                  <div className="metric-card-xl" style={{background: 'linear-gradient(135deg, #6366f1, #a855f7)'}}>
                    <div className="metric-info">
                      <h3>Net Worth Estimate</h3>
                      <div className="metric-value">{formatCurrency(stats.currentBalance)}</div>
                    </div>
                    <div className="metric-icon-box"><TrendingUp size={32} color="white" /></div>
                  </div>
                  <div className="metric-card-xl" style={{background: 'linear-gradient(135deg, #10b981, #3b82f6)'}}>
                    <div className="metric-info">
                      <h3>Total Transactions</h3>
                      <div className="metric-value">{rawData.metadata.merged_count}</div>
                    </div>
                    <div className="metric-icon-box"><Activity size={32} color="white" /></div>
                  </div>
                </div>

                <div className="glass-panel" style={{height: '400px'}}>
                  <div className="flex justify-between items-center mb-6">
                    <h3>Wealth Trajectory</h3>
                    <div className="badge badge-credit">REAL-TIME SYNC</div>
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={stats.chartData}>
                      <defs>
                        <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{background: '#0f111a', border: '1px solid var(--glass-border)', borderRadius: '12px'}}
                        itemStyle={{color: 'var(--accent-primary)'}}
                      />
                      <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorBal)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .ai-layout { display: flex; height: calc(100vh - 150px); gap: 20px; }
        
        /* Session Sidebar */
        .ai-sidebar { width: 280px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; padding: 16px; display: flex; flex-direction: column; }
        .btn-new-chat { background: var(--accent-primary); color: black; border: none; padding: 14px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; font-size: 0.8rem; }
        .btn-new-chat:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(0,255,136,0.3); }
        .session-list { flex: 1; overflow-y: auto; padding-right: 4px; }
        .session-item { padding: 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
        .session-item:hover { background: rgba(255,255,255,0.05); }
        .session-item.active { background: rgba(0,255,136,0.1); border-color: rgba(0,255,136,0.3); }
        .session-info { flex: 1; overflow: hidden; }
        .session-title { font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .session-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .btn-rename-trigger { opacity: 0; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: 0.2s; }
        .session-item:hover .btn-rename-trigger { opacity: 1; }
        .btn-rename-trigger:hover { color: var(--accent-primary); }
        .rename-container input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 6px 10px; color: white; font-size: 0.9rem; outline: none; }

        /* Chat Area */
        .ai-chat-area { flex: 1; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
        .chat-header-minimal { padding: 20px 30px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.01); }
        .chat-header-minimal h2 { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; }
        .engine-tag { font-size: 0.65rem; font-weight: 900; color: var(--accent-primary); background: rgba(0,255,136,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(0,255,136,0.2); }
        
        .chat-body { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .chat-welcome { text-align: center; margin-top: 100px; opacity: 0.8; }
        .chat-welcome h2 { margin: 20px 0 10px; }
        .chat-welcome p { color: var(--text-muted); }

        .message-bubble { max-width: 80%; padding: 14px 18px; border-radius: 18px; font-size: 0.95rem; line-height: 1.6; }
        .message-bubble.user { align-self: flex-end; background: var(--accent-primary); color: #000; border-bottom-right-radius: 4px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,255,136,0.2); }
        .message-bubble.ai { align-self: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-bottom-left-radius: 4px; }
        .message-bubble.ai .bubble-content { color: rgba(255,255,255,0.9); }
        
        .typing { font-style: italic; opacity: 0.6; }

        .chat-footer { padding: 20px 30px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); }
        .input-wrapper { display: flex; gap: 12px; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 16px; border: 1px solid var(--glass-border); transition: 0.2s; }
        .input-wrapper:focus-within { border-color: var(--accent-primary); box-shadow: 0 0 15px rgba(0,255,136,0.1); }
        .input-wrapper input { flex: 1; background: none; border: none; padding: 10px 15px; color: white; outline: none; font-size: 0.95rem; }
        .input-wrapper button { background: var(--accent-primary); color: #000; border: none; width: 44px; height: 44px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .input-wrapper button:hover:not(:disabled) { transform: scale(1.05); }
        .input-wrapper button:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .chat-empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.3; }
      `}} />
    </div>
  );
}

export default App;
