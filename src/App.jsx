import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  Home, Target, GraduationCap, Activity, Edit2, X, FileText, Search, CloudUpload, 
  ChevronRight, ArrowLeft, Loader2, TrendingUp, MessageSquare, Send, Bot, Plus, 
  Trash2, Clock, Check, MoreVertical 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import rawData from './data.json';
import './index.css';

// --- CONFIG ---
const GEMINI_API_KEY = "AIzaSy..." // User's key

function App() {
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('ai_sessions_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('active_session_id_v3'));
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const chatEndRef = useRef(null);

  useEffect(() => {
    const merged = rawData.transactions.map(t => {
      let entity = 'Other';
      if (t.description.startsWith('UPI/')) {
        const parts = t.description.split('/');
        if (parts.length > 1) {
          entity = parts[1].split(' ')[0].split('-')[0].split('UPI')[0].trim();
        }
      }
      return { ...t, entity };
    });
    // Ensure data is sorted by date ascending for balance calculation
    const sorted = [...merged].sort((a, b) => new Date(a.date) - new Date(b.date));
    setTransactions(sorted);
  }, []);

  useEffect(() => {
    localStorage.setItem('ai_sessions_v3', JSON.stringify(sessions));
    if (activeSessionId) localStorage.setItem('active_session_id_v3', activeSessionId);
  }, [sessions, activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isTyping]);

  const createNewSession = () => {
    const newId = `sess_${Date.now()}`;
    const newSess = { id: newId, title: `Analysis ${sessions.length + 1}`, timestamp: new Date().toISOString(), history: [] };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newId);
    setRenamingId(newId);
    setRenameValue(newSess.title);
  };

  const handleRename = (id) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    setSessions(sessions.map(s => s.id === id ? { ...s, title: renameValue } : s));
    setRenamingId(null);
  };

  const callGemini = async (message, history) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Correct payload for Gemini chat history
    const contents = [
      { role: "user", parts: [{ text: `System Context: You are a financial analyst. The user is ${rawData.metadata.name}. There are ${rawData.metadata.merged_count} transactions. Use ₹ symbol. Answer concisely.` }] },
      { role: "model", parts: [{ text: "Understood. I am ready to analyze your finances." }] },
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeSessionId || isTyping) return;
    const msg = chatInput;
    setChatInput('');
    setIsTyping(true);

    const currentSess = sessions.find(s => s.id === activeSessionId);
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'user', text: msg }] } : s));

    try {
      const aiText = await callGemini(msg, currentSess.history);
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'ai', text: aiText }] } : s
      ));
    } catch (err) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, history: [...s.history, { role: 'ai', text: `⚠️ Error: ${err.message}` }] } : s
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const stats = useMemo(() => {
    const currentBalance = transactions[transactions.length - 1]?.balance || 0;
    const chartData = transactions
      .filter((_, i) => i % Math.max(1, Math.floor(transactions.length / 50)) === 0)
      .map(t => ({ name: t.date, balance: t.balance }));
    return { currentBalance, chartData };
  }, [transactions]);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="layout">
      <div className="sidebar">
        <div className={`sidebar-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}><Home size={22} /></div>
        <div className={`sidebar-item ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}><MessageSquare size={22} /></div>
        <div className="sidebar-item" title="Insights"><Target size={22} opacity={0.3} /></div>
        <div className="sidebar-item" title="Records"><GraduationCap size={22} opacity={0.3} /></div>
      </div>

      <div className="main-content">
        <div className="top-header">
          <div className="live-badge"><div className="live-dot"></div> LIVE ANALYST</div>
          <h1 className="dashboard-title">{activeTab === 'chat' ? 'Analyst Manager' : 'Wealth Dashboard'}</h1>
        </div>

        {activeTab === 'chat' ? (
          <div className="view-fade-in ai-layout">
            <div className="ai-sidebar">
              <button className="btn-new-chat" onClick={createNewSession}><Plus size={18} /> New Analysis</button>
              <div className="session-list">
                {sessions.map(s => (
                  <div key={s.id} className={`session-item ${activeSessionId === s.id ? 'active' : ''}`} onClick={() => setActiveSessionId(s.id)}>
                    {renamingId === s.id ? (
                      <input autoFocus className="rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={() => handleRename(s.id)} onKeyPress={(e) => e.key === 'Enter' && handleRename(s.id)}/>
                    ) : (
                      <>
                        <div className="session-info">
                          <div className="session-title">{s.title}</div>
                          <div className="session-meta"><Clock size={10} /> {new Date(s.timestamp).toLocaleDateString()}</div>
                        </div>
                        <button className="btn-rename-trigger" onClick={(e) => { e.stopPropagation(); setRenamingId(s.id); setRenameValue(s.title); }}><Edit2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                        <h2>Hi {rawData.metadata.name}, I'm your Analyst.</h2>
                        <p>I have access to your {rawData.metadata.merged_count} transactions. Ask away!</p>
                      </div>
                    )}
                    {activeSession.history.map((msg, i) => (
                      <div key={i} className={`message-bubble ${msg.role}`}>
                        <div className="bubble-content">{msg.text}</div>
                      </div>
                    ))}
                    {isTyping && <div className="message-bubble ai"><div className="bubble-content typing">Analyzing...</div></div>}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="chat-footer">
                    <div className="input-wrapper">
                      <input type="text" placeholder="Query your finances..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}/>
                      <button onClick={handleSendMessage} disabled={!chatInput.trim() || isTyping}><Send size={18} /></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="chat-empty-state"><MessageSquare size={64} opacity={0.1} /><p>Start a session to analyze data</p></div>
              )}
            </div>
          </div>
        ) : (
          <div className="view-fade-in dashboard-content">
              <div className="hero-banner">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                  <div className="hero-title">Net Worth</div>
                  <div className="hero-value">{formatCurrency(stats.currentBalance)}</div>
                </div>
              </div>
              <div className="glass-panel" style={{height: '400px', marginTop: '20px'}}>
                <ResponsiveContainer width="100%" height="100%">
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
                    <Tooltip contentStyle={{background: '#0f111a', border: '1px solid var(--glass-border)', borderRadius: '12px'}}/>
                    <Area type="monotone" dataKey="balance" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorBal)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .ai-layout { display: flex; height: calc(100vh - 150px); gap: 20px; }
        .ai-sidebar { width: 280px; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 20px; padding: 16px; display: flex; flex-direction: column; }
        .btn-new-chat { background: var(--accent-primary); color: black; border: none; padding: 14px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; }
        .session-list { flex: 1; overflow-y: auto; }
        .session-item { padding: 14px; border-radius: 12px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
        .session-item.active { background: rgba(0,255,136,0.1); border-color: rgba(0,255,136,0.3); }
        .rename-input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 6px; color: white; }
        .ai-chat-area { flex: 1; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; }
        .chat-header-minimal { padding: 20px 30px; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; }
        .chat-body { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .message-bubble { max-width: 80%; padding: 14px 18px; border-radius: 18px; font-size: 0.95rem; line-height: 1.6; }
        .message-bubble.user { align-self: flex-end; background: var(--accent-primary); color: #000; border-bottom-right-radius: 4px; font-weight: 600; }
        .message-bubble.ai { align-self: flex-start; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-bottom-left-radius: 4px; }
        .chat-footer { padding: 20px 30px; border-top: 1px solid var(--glass-border); }
        .input-wrapper { display: flex; gap: 12px; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 16px; border: 1px solid var(--glass-border); }
        .input-wrapper input { flex: 1; background: none; border: none; padding: 10px; color: white; outline: none; }
        .input-wrapper button { background: var(--accent-primary); color: #000; border: none; width: 44px; height: 44px; border-radius: 12px; cursor: pointer; }
      `}} />
    </div>
  );
}

export default App;
