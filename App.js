import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Terminal, Code, Cpu, ShieldCheck, Play, Volume2, VolumeX, Download } from 'lucide-react';

const App = () => {
  const [task, setTask] = useState('');
  const [logs, setLogs] = useState([]);
  const [finalCode, setFinalCode] = useState('');
  const [status, setStatus] = useState('IDLE');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const logsEndRef = useRef(null);

  // Auto-scroll logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [logs]);

  // --- VOICE ENGINE ---
  const speak = (text) => {
    if (!soundEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.0; // Standard professional pitch
    utterance.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    // Try to find a standard English voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft David'));
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
  };

  // --- DOWNLOAD FUNCTION ---
  const downloadCode = () => {
    // If there is no code, alert the user, otherwise download
    if (!finalCode) {
        alert("No code artifact generated yet.");
        return;
    }
    const element = document.createElement("a");
    const file = new Blob([finalCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "nexus_solution.py";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- MAIN LOGIC ---
  const deployAgents = async () => {
    if (!task) return;
    setStatus('RUNNING');
    setLogs(["Initializing Nexus Protocols...", "Establishing Secure Handshake...", "Agents Deployed."]);
    setFinalCode('');
    speak("Initializing Nexus Protocols. Agents deployed.");

    try {
      const response = await axios.post('http://127.0.0.1:8000/generate', { task: task });
      const data = response.data;
      setLogs(data.logs);
      
      if (data.status === 'SUCCESS') {
        setStatus('SUCCESS');
        setFinalCode(data.final_code);
        speak("Architecture complete. Solution validated.");
      } else {
        setStatus('FAILED');
        speak("Generation failed. Security protocols engaged.");
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ CONNECTION ERROR: ${error.message}`]);
      setStatus('FAILED');
      speak("Connection lost. Please check backend services.");
    }
  };

  // --- PROFESSIONAL STYLES ---
  const darkBg = '#0a0a0a';
  const primaryColor = '#00ff41'; // Matrix Green
  const errorColor = '#ff0033';

  return (
    <div style={{ backgroundColor: darkBg, minHeight: '100vh', color: primaryColor, fontFamily: "'Courier New', monospace", padding: '2rem' }}>
      
      {/* HEADER */}
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Cpu size={32} />
        {/* RENAMED TO PROFESSIONAL TITLE */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, letterSpacing: '2px' }}>
          NEXUS ARCHITECT <span style={{color: '#888', fontSize: '1rem'}}>v1.0</span>
        </h1>
        
        {/* Sound Toggle */}
        <button onClick={() => setSoundEnabled(!soundEnabled)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '1rem' }}>
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} color="#555" />}
        </button>

        <span style={{ marginLeft: 'auto', backgroundColor: status === 'RUNNING' ? '#222' : '#111', color: status === 'RUNNING' ? '#fff' : '#666', border: '1px solid #333', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}>
          SYSTEM STATUS: {status}
        </span>
      </div>

      {/* INPUT BAR */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Enter Engineering Prompt..."
          style={{ flex: 1, backgroundColor: '#050505', border: '1px solid #333', color: '#fff', padding: '1rem', fontFamily: 'monospace', fontSize: '1rem', outline: 'none' }}
          onKeyPress={(e) => e.key === 'Enter' && deployAgents()}
        />
        <button 
          onClick={deployAgents}
          disabled={status === 'RUNNING'}
          style={{ backgroundColor: status === 'RUNNING' ? '#333' : primaryColor, color: '#000', border: 'none', padding: '0 2rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Play size={18} /> EXECUTE
        </button>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* LEFT: LOGS */}
        <div style={{ backgroundColor: '#050505', border: '1px solid #333', borderRadius: '4px', padding: '1rem', height: '600px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem', color: '#888' }}>
            <Terminal size={16} /> <small>SYSTEM LOGS</small>
          </div>
          {logs.map((log, index) => (
            <div key={index} style={{ marginBottom: '0.5rem', opacity: 0.9, fontSize: '0.9rem' }}>
              {log.includes('❌') ? <span style={{color: errorColor}}>{log}</span> : 
               log.includes('🚀') ? <span style={{color: '#00ffff'}}>{log}</span> :
               log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* RIGHT: CODE ARTIFACT */}
        <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '1rem', height: '600px', overflowY: 'auto' }}>
          
          {/* ARTIFACT HEADER + DOWNLOAD BUTTON (ALWAYS VISIBLE NOW) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem', color: '#fff' }}>
            <Code size={16} /> <small>GENERATED SOLUTION</small>
            
            {/* BUTTON IS FORCED TO BE VISIBLE - NO CONDITION */}
            <button 
              onClick={downloadCode}
              title="Download Solution"
              style={{ marginLeft: 'auto', backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold' }}
            >
              <Download size={14} /> SAVE FILE
            </button>
          </div>

          {/* CODE DISPLAY */}
          {finalCode ? (
            <pre style={{ margin: 0, color: '#d4d4d4', fontSize: '0.85rem' }}><code>{finalCode}</code></pre>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#555' }}>
              <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
              <p style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>AWAITING INPUT...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default App;