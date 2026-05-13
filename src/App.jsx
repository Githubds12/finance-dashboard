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
  Clock
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
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  
  // Advanced Chat State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNewSessModal, setShowNewSessModal] = useState(false);
  const [newSessTitle, setNewSessTitle] = useState('');
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
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId, sessions, isTyping]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chats');
      const data = await res.json();
      setSessions(data.sessions);
      if (data.sessions.length > 0 && !activeSessionId) {
        setActiveSessionId(data.sessions[0].id);
      }
    } catch (err) { console.error('Failed to fetch sessions'); }
  };

  const handleCreateSession = async () => {
    if (!newSessTitle.trim()) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSessTitle })
      });
      const newSess = await res.json();
      setSessions([newSess, ...sessions]);
      setActiveSessionId(newSess.id);
      setShowNewSessModal(false);
      setNewSessTitle('');
    } catch (err) { console.error('Failed to create session'); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeSessionId) return;
    const msg = chatInput;
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`/api/chat/${activeSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      await fetchSessions(); // Refresh history
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
          <div className="view-fade-in analyst-manager">
            {/* Session Sidebar */}
            <div className="session-sidebar">
              <button className="btn-new-chat" onClick={() => setShowNewSessModal(true)}>
                <Plus size={18} /> New Analysis
              </button>
              <div className="session-list">
                {sessions.map(s => (
                  <div 
                    key={s.id} 
                    className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                    onClick={() => setActiveSessionId(s.id)}
                  >
                    <div className="session-title">{s.title}</div>
                    <div className="session-meta">
                      <Clock size={10} /> {new Date(s.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Interface */}
            <div className="chat-interface">
              {activeSession ? (
                <>
                  <div className="chat-header">
                    <h2>{activeSession.title}</h2>
                    <div className="chat-status">Memory Active • Gemini 1.5</div>
                  </div>
                  <div className="chat-messages">
                    {activeSession.history.length === 0 && (
                      <div className="chat-welcome">
                        <Bot size={48} color="var(--accent-primary)" />
                        <h2>Ready to analyze, {rawData.metadata.name}.</h2>
                        <p>Ask me to look into your {rawData.metadata.merged_count} transactions.</p>
                      </div>
                    )}
                    {activeSession.history.map((msg, i) => (
                      <div key={i} className={`message ${msg.role}`}>
                        <div className="message-content">{msg.text}</div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="message ai">
                        <div className="message-content typing">Analyzing statements...</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="chat-input-area">
                    <input 
                      type="text" 
                      placeholder="Ask the analyst..." 
                      value={chatInput} 
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button onClick={handleSendMessage} disabled={!chatInput.trim() || isTyping}>
                      <Send size={20} />
                    </button>
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
              </>
            )}
          </div>
        )}
      </div>

      {/* New Session Modal (FANCY) */}
      {showNewSessModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content-fancy">
            <div className="modal-header">
              <Bot size={24} color="var(--accent-primary)" />
              <h2>New Analysis Session</h2>
            </div>
            <p className="modal-desc">Give your analysis a title to keep your history organized.</p>
            <input 
              type="text" 
              className="edit-input" 
              placeholder="e.g. Monthly Budget Review" 
              value={newSessTitle}
              onChange={(e) => setNewSessTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
              autoFocus
            />
            <div className="flex gap-4 mt-6">
              <button className="btn-primary" onClick={handleCreateSession}>CREATE SESSION</button>
              <button className="btn-secondary" onClick={() => setShowNewSessModal(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Edit Modal */}
      {editingId && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{width: '400px'}}>
            <h2 className="mb-4">Edit Entry</h2>
            <input type="text" value={editValue} onChange={(e)=>setEditValue(e.target.value)} placeholder="Rename" className="edit-input" />
            <textarea value={editNote} onChange={(e)=>setEditNote(e.target.value)} placeholder="Maintenance Notes" className="edit-textarea" />
            <div className="flex gap-2">
              <button onClick={() => {
                const updated = transactions.map(t => t.id === editingId ? {...t, nickname: editValue, notes: editNote} : t);
                setTransactions(updated);
                const saved = JSON.parse(localStorage.getItem('txn_overrides') || '{}');
                saved[editingId] = { nickname: editValue, notes: editNote };
                localStorage.setItem('txn_overrides', JSON.stringify(saved));
                setEditingId(null);
              }} className="btn-primary">SAVE</button>
              <button onClick={() => setEditingId(null)} className="btn-secondary">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .analyst-manager { display: flex; height: 75vh; gap: 24px; }
        .session-sidebar { width: 260px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; padding: 16px; }
        .btn-new-chat { background: var(--accent-primary); color: black; border: none; padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; transition: all 0.2s; }
        .btn-new-chat:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(0,255,136,0.3); }
        .session-list { flex: 1; overflow-y: auto; }
        .session-item { padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 8px; }
        .session-item:hover { background: rgba(255,255,255,0.05); }
        .session-item.active { background: rgba(0,255,136,0.1); border-color: var(--accent-primary); }
        .session-title { font-weight: 700; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .session-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        
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

        /* Fancy Modal Styles */
        .modal-content-fancy { width: 450px; padding: 40px; }
        .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .modal-header h2 { margin: 0; font-size: 1.5rem; }
        .modal-desc { color: var(--text-muted); margin-bottom: 24px; font-size: 0.9rem; }
        .mt-6 { margin-top: 24px; }
        .btn-primary { flex: 1; background: var(--accent-primary); color: black; border: none; padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,255,136,0.3); }
        .btn-secondary { flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--glass-border); padding: 12px; border-radius: 12px; font-weight: 800; cursor: pointer; }
      `}} />
    </div>
  );
}

export default App;
