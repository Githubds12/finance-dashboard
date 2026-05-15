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
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('active_session_id');
  });
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
    
    // Load local sessions first for instant UI
    const localSess = JSON.parse(localStorage.getItem('ai_sessions') || '[]');
    setSessions(localSess);
    
    fetchSessions();
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_sessions', JSON.stringify(sessions));
    if (activeSessionId) localStorage.setItem('active_session_id', activeSessionId);
  }, [sessions, activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId, sessions, isTyping]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chats');
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
          if (!activeSessionId) setActiveSessionId(data.sessions[0].id);
        }
      }
    } catch (err) { console.warn('Backend sync unavailable, using local store'); }
  };

  const createNewSession = async () => {
    const newId = `sess_${Date.now()}`;
    const newSess = {
      id: newId,
      title: `Analysis ${sessions.length + 1}`,
      timestamp: new Date().toISOString(),
      history: []
    };
    
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newId);
    setRenamingId(newId);
    setRenameValue(newSess.title);

    // Background sync attempt
    try {
      fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSess.title })
      });
    } catch (e) {}
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const updated = sessions.map(s => s.id === id ? { ...s, title: renameValue } : s);
    setSessions(updated);
    setRenamingId(null);

    try {
      fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue })
      });
    } catch (e) {}
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeSessionId) return;
    const msg = chatInput;
    setChatInput('');
    setIsTyping(true);

    // Update local history immediately
    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, history: [...s.history, { role: 'user', text: msg }] };
      }
      return s;
    });
    setSessions(updatedSessions);

    try {
      // 1. Try Finance Backend
      let res = await fetch(`/api/chat/${activeSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      
      let aiText = '';
      if (res.ok) {
        const data = await res.json();
        aiText = data.text;
      } else {
        // 2. Fallback to Unified Portal Proxy
        const proxyRes = await fetch('https://service-progress-portal.onrender.com/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });
        const proxyData = await proxyRes.json();
        aiText = proxyData.choices?.[0]?.message?.content || proxyData.candidates?.[0]?.content?.parts?.[0]?.text || 'System offline.';
      }

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, history: [...s.history, { role: 'bot', text: aiText }] };
        }
        return s;
      }));

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

  const [aiSidebarCollapsed, setAiSidebarCollapsed] = useState(false);

  return (
    <div className={`layout ${activeTab === 'chat' ? 'ai-mode' : ''}`}>
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
          <div className="view-fade-in ai-workspace">
            <div className={`ai-sidebar ${aiSidebarCollapsed ? 'collapsed' : ''}`}>
               <button className="btn-new-analysis" onClick={createNewSession}>
                <Plus size={18} /> NEW ANALYSIS
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

            <div className="ai-main-chat">
              {activeSession ? (
                <>
                  <div className="chat-header-stealth">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button className="ui-btn" onClick={() => setAiSidebarCollapsed(!aiSidebarCollapsed)}>
                        <MoreVertical size={14} /> PANEL
                      </button>
                      <h2>{activeSession.title}</h2>
                      <button className="ui-btn" onClick={() => {
                        setRenamingId(activeSession.id);
                        setRenameValue(activeSession.title);
                      }}>
                        <Edit2 size={12} /> RENAME
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button className="ui-btn" style={{ color: '#ef4444' }} onClick={async () => {
                        if (confirm("Clear session history?")) {
                          const updated = sessions.map(s => s.id === activeSessionId ? { ...s, history: [] } : s);
                          setSessions(updated);
                          try { fetch(`/api/chat/${activeSession.id}/clear`, { method: 'POST' }); } catch(e){}
                        }
                      }}>CLEAR</button>
                      <button className="ui-btn" style={{ background: 'var(--accent-primary)', color: '#000', border: 'none' }} onClick={() => setActiveTab('home')}>
                         EXIT
                      </button>
                    </div>
                  </div>
                  
                  <div className="chat-messages-stealth">
                    <div className="chat-messages-inner">
                      {activeSession.history.length === 0 && (
                        <div className="chat-welcome">
                          <Bot size={48} color="var(--accent-primary)" />
                          <h2>Ready to analyze, {rawData.metadata.name}.</h2>
                          <p>Ask me to look into your {rawData.metadata.merged_count} transactions.</p>
                        </div>
                      )}
                      {activeSession.history.map((msg, i) => (
                        <div key={i} className={`ai-bubble-stealth ${msg.role === 'user' ? 'user' : 'bot'}`}>
                          {msg.text}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="ai-bubble-stealth bot">
                          Analyzing statements...
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  <div className="chat-input-area-stealth">
                    <div className="chat-input-container">
                      <input 
                        type="text" 
                        placeholder="Request financial intelligence..." 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button onClick={handleSendMessage} disabled={!chatInput.trim() || isTyping}>
                        Analyze
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="chat-empty">
                  <MessageSquare size={64} opacity={0.1} />
                  <p>Select or create a new analysis session.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="view-fade-in">
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
        .analyst-manager { display: flex; height: 75vh; gap: 24px; }
        .session-sidebar { width: 260px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; padding: 16px; }
        .btn-new-chat { background: var(--accent-primary); color: black; border: none; padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; transition: all 0.2s; }
        .btn-new-chat:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(0,255,136,0.3); }
        .session-list { flex: 1; overflow-y: auto; }
        
        .session-item { padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; position: relative; }
        .session-item:hover { background: rgba(255,255,255,0.05); }
        .session-item.active { background: rgba(0,255,136,0.1); border-color: var(--accent-primary); }
        .session-info { flex: 1; overflow: hidden; }
        .session-title { font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .session-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        
        .btn-rename-trigger { opacity: 0; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: opacity 0.2s; }
        .session-item:hover .btn-rename-trigger { opacity: 1; }
        .btn-rename-trigger:hover { color: white; }

        .rename-container { width: 100%; }
        .rename-container input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-primary); border-radius: 6px; padding: 4px 8px; color: white; font-size: 0.9rem; outline: none; }

        .chat-interface { flex: 1; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
        .chat-header { padding: 20px 30px; border-bottom: 1px solid var(--glass-border); background: rgba(255,255,255,0.01); }
        .chat-status { font-size: 0.75rem; color: var(--accent-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .chat-messages { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 24px; }
        .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0.3; }
        
        .message { max-width: 85%; padding: 16px 20px; border-radius: 20px; font-size: 0.95rem; line-height: 1.6; }
        .message.user { align-self: flex-end; background: var(--accent-primary); color: black; border-bottom-right-radius: 4px; font-weight: 500; }
        .message.ai { align-self: flex-start; background: var(--bg-sidebar); border: 1px solid var(--glass-border); border-bottom-left-radius: 4px; }
        
        .chat-input-area { padding: 24px 30px; border-top: 1px solid var(--glass-border); display: flex; gap: 12px; }
        .chat-input-area input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px 20px; color: white; outline: none; }
        .chat-input-area button { background: var(--accent-primary); color: black; border: none; padding: 0 20px; border-radius: 12px; cursor: pointer; }
      `}} />
    </div>
  );
}

export default App;
