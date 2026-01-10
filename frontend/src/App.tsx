import React, { useState, useEffect, useRef } from 'react';
import { useSession } from './hooks/useSession';
import { useFiles } from './hooks/useFiles';
import { HandshakeUI } from './components/HandshakeUI';
import { DashboardUI } from './components/DashboardUI';
import { SessionDashboard } from './components/SessionDashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { StopCircle, Trash2, Settings, X, HardDrive, CheckCircle2, Info, AlertTriangle, Power, BarChart3, ShieldCheck, Monitor, Smartphone, Activity, ClipboardList, Copy, RefreshCw, Layers } from 'lucide-react';
import { api } from './services/api';
import { useTheme } from './hooks/useTheme';

interface AnalyticsEntry {
    timestamp: number;
    device: string;
    filename: string;
    size: number;
    direction: 'sent' | 'received';
    status: string;
}

interface AnalyticsStats {
    total_sent: number;
    total_received: number;
    count: number;
}

interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

function App() {
    const { sessions, mySession, isMobile, init, verify, reset, disconnectSession, blockSession } = useSession();
    const { theme, setTheme } = useTheme();
    const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [activeHostTab, setActiveHostTab] = useState<'devices' | 'analytics' | 'clipboard'>('devices');
    const [savePath, setSavePath] = useState('');
    const [autoSyncPath, setAutoSyncPath] = useState('');
    const [overwriteDuplicates, setOverwriteDuplicates] = useState(true);
    const [safetyFilter, setSafetyFilter] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [clipboard, setClipboard] = useState({ content: '', last_updated: 0, device_source: '' });
    const [analytics, setAnalytics] = useState<{ history: AnalyticsEntry[], stats: AnalyticsStats }>({
        history: [],
        stats: { total_sent: 0, total_received: 0, count: 0 }
    });

    const lastSessionCount = useRef(sessions.length);

    // --- Toast System ---
    const showToast = (message: string, type: Toast['type'] = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // --- Settings & Analytics & Clipboard Logic ---
    useEffect(() => {
        if (!isMobile) {
            api.get<{ save_path: string, safety_filter: boolean, overwrite_duplicates: boolean, autosync_path: string }>('/files/config')
                .then(data => {
                    setSavePath(data.save_path);
                    setSafetyFilter(data.safety_filter);
                    setOverwriteDuplicates(data.overwrite_duplicates);
                    setAutoSyncPath(data.autosync_path);
                })
                .catch(console.error);

            fetchAnalytics();
            fetchClipboard();

            // Polling for clipboard and analytics
            const interval = setInterval(() => {
                fetchClipboard();
                if (showSettings && activeHostTab === 'analytics') fetchAnalytics();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isMobile, showSettings, activeHostTab]);

    const handleClearStorage = async () => {
        if (!confirm('This will delete ALL received files and outgoing transfers permanently. Proceed?')) return;
        try {
            await api.post('/files/cleanup');
            showToast('Storage cleared successfully', 'success');
        } catch (e) { showToast('Cleanup failed', 'error'); }
    }

    const fetchClipboard = async () => {
        try {
            const data = await api.get<any>('/host/clipboard', {});
            setClipboard(data);
        } catch (e) { console.error(e); }
    };

    const updateClipboard = async (content: string) => {
        try {
            await api.post('/host/clipboard', { content }, { 'x-device-name': 'Host' });
            fetchClipboard();
            showToast('Clipboard updated', 'success');
        } catch (e) { showToast('Sync failed', 'error'); }
    };

    const fetchAnalytics = async () => {
        try {
            const data = await api.get<{ history: AnalyticsEntry[], stats: AnalyticsStats }>('/files/analytics/history', {});
            setAnalytics(data);
        } catch (e) {
            console.error('Analytics fetch failed', e);
        }
    };

    const updateConfig = async () => {
        try {
            await api.post('/files/config', {
                save_path: savePath,
                safety_filter: safetyFilter,
                overwrite_duplicates: overwriteDuplicates,
                autosync_path: autoSyncPath
            });
            showToast('Configuration updated', 'success');
            setShowSettings(false);
        } catch (e) {
            showToast('Failed to update config', 'error');
        }
    };

    // --- Session Notifications ---
    useEffect(() => {
        if (sessions.length > lastSessionCount.current) {
            const lastSession = sessions[sessions.length - 1];
            showToast(`New connection request from ${lastSession.device_name}`, 'info');
        } else if (sessions.length < lastSessionCount.current) {
            showToast(`Device disconnected`, 'warning');
        }
        lastSessionCount.current = sessions.length;
    }, [sessions.length]);

    // Mobile Logic calls useFiles internally
    const isAuthenticated = isMobile ? mySession?.status === 'AUTHENTICATED' : true;
    const { files, uploading, progress, status: transferStatus, upload } = useFiles(
        isAuthenticated && isMobile,
        isMobile ? mySession?.session_id : undefined,
        false, // not isHost (it's the mobile client)
        mySession?.device_name || undefined // Important: fix folder nesting issue
    );

    // Watch for mobile transfer completion
    useEffect(() => {
        if (transferStatus?.type === 'success') {
            showToast(transferStatus.message, 'success');
        } else if (transferStatus?.type === 'error') {
            showToast(transferStatus.message, 'error');
        }
    }, [transferStatus]);

    if (isMobile) {
        if (!mySession || mySession.status !== 'AUTHENTICATED') {
            return (
                <HandshakeUI
                    session={mySession || { status: 'IDLE', pin: null }}
                    isMobile={true}
                    onInit={init}
                    onVerify={verify}
                />
            );
        }
        return (
            <DashboardUI
                files={files}
                uploading={uploading}
                progress={progress}
                status={transferStatus}
                onUpload={upload}
                onReset={reset}
            />
        );
    }

    // --- HOST (DESKTOP) VIEW ---

    if (viewingSessionId) {
        const activeSession = sessions.find(s => s.session_id === viewingSessionId);
        if (!activeSession) {
            setViewingSessionId(null);
            return null;
        }

        return (
            <SessionDashboard
                sessionId={viewingSessionId}
                deviceName={activeSession.device_name}
                onBack={() => setViewingSessionId(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-8 gap-8 relative transition-colors duration-300 overflow-x-hidden">
            <header className="w-full max-w-7xl flex justify-between items-center border-b border-border pb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black tracking-tighter">TURBO<span className="opacity-40">SYNC</span> HOST</h1>
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border">
                        <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">turbosync.local</span>
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-surface rounded-full transition-colors opacity-60 hover:opacity-100">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => { if (confirm('Reset all sessions and temp files?')) reset() }} className="btn-secondary text-xs py-2 px-4 h-10 border-accent-error/20 text-accent-error/60 hover:text-accent-error flex items-center gap-2">
                        <Power size={14} />
                        RESET
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            <main className="w-full max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
                    {/* LEFT: Connect New Device (Always visible) */}
                    <div className="space-y-6 flex flex-col items-center justify-center">
                        <div className="max-w-md w-full">
                            <HandshakeUI
                                session={{ status: 'IDLE', pin: null }}
                                isMobile={false}
                                onInit={() => { }}
                                onVerify={async () => false}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Active Sessions List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h2 className="text-xl font-black uppercase tracking-widest opacity-40 flex items-center gap-3">
                                <Monitor size={22} />
                                Active Devices
                            </h2>
                            <span className="px-3 py-1 bg-surface border border-border rounded-full text-[10px] font-black">{sessions.length} ONLINE</span>
                        </div>

                        {sessions.length === 0 && (
                            <div className="p-20 text-center opacity-20 border border-dashed border-border rounded-3xl flex flex-col items-center gap-4">
                                <Activity size={48} strokeWidth={1} />
                                <div>
                                    <p className="font-bold uppercase tracking-widest text-sm">No connected devices</p>
                                    <p className="text-[10px] mt-1 font-medium italic">Pair your device using the QR code</p>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-6">
                            {sessions.map(s => (
                                <div key={s.session_id} className="card flex items-center justify-between p-8 animate-fade-in group hover:border-foreground/40 transition-all border-l-4"
                                    style={{ borderLeftColor: s.status === 'AUTHENTICATED' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-xl tracking-tight">{s.device_name || 'Unknown Device'}</span>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider 
                                        ${s.status === 'AUTHENTICATED' ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                                                {s.status === 'AUTHENTICATED' ? 'Linked' : 'Pairing'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-mono opacity-30 uppercase tracking-widest flex items-center gap-2">
                                            <Smartphone size={10} /> {s.session_id?.substring(0, 8)}
                                        </div>

                                        {s.status === 'PENDING_VERIFICATION' && (
                                            <div className="mt-4 bg-background border border-border text-foreground font-black text-4xl p-4 rounded-xl tracking-[0.2em] inline-block shadow-inner scale-75 origin-left">
                                                {s.pin}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {s.status === 'AUTHENTICATED' && (
                                            <button
                                                onClick={() => setViewingSessionId(s.session_id || null)}
                                                className="btn-primary text-[10px] px-8 py-3 tracking-widest shadow-xl group-hover:scale-105 transition-transform"
                                            >
                                                MANAGE
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { if (confirm('Disconnect device?')) disconnectSession(s.session_id!) }}
                                            className="p-3 text-foreground/40 hover:text-accent-error hover:bg-surface rounded-xl transition-all"
                                            title="Disconnect"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </main>

            {/* --- Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
                    <div className="card max-w-4xl w-full shadow-2xl border-2 border-border p-0 animate-slide-up flex flex-col max-h-[90vh]">
                        {/* Header Tabs */}
                        <div className="flex items-center justify-between border-b border-border p-6 bg-surface/30">
                            <div className="flex gap-6">
                                <button onClick={() => setActiveHostTab('devices')} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeHostTab === 'devices' ? 'text-foreground' : 'opacity-40 hover:opacity-100'}`}>General</button>
                                <button onClick={() => { setActiveHostTab('clipboard'); fetchClipboard() }} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeHostTab === 'clipboard' ? 'text-foreground' : 'opacity-40 hover:opacity-100'}`}>Clipboard</button>
                                <button onClick={() => { setActiveHostTab('analytics'); fetchAnalytics() }} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeHostTab === 'analytics' ? 'text-foreground' : 'opacity-40 hover:opacity-100'}`}>Analytics</button>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-surface rounded-full opacity-60">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            {activeHostTab === 'devices' && (
                                <div className="space-y-8">
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Appearance</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['light', 'dark', 'system'] as const).map((t) => (
                                                    <button key={t} onClick={() => setTheme(t)} className={`py-3 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${theme === t ? 'bg-foreground text-background border-foreground' : 'bg-surface border-border opacity-40'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Download Path</label>
                                                <input type="text" value={savePath} onChange={(e) => setSavePath(e.target.value)} className="w-full bg-surface border border-border p-4 rounded-xl font-mono text-xs outline-none" />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Sync Path</label>
                                                <input type="text" value={autoSyncPath} onChange={(e) => setAutoSyncPath(e.target.value)} className="w-full bg-surface border border-border p-4 rounded-xl font-mono text-xs outline-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-4 border-t border-border pt-6">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Safety Filter</span>
                                                <button onClick={() => setSafetyFilter(!safetyFilter)} className={`w-10 h-5 rounded-full relative transition-all ${safetyFilter ? 'bg-accent-success' : 'bg-surface'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${safetyFilter ? 'left-6' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Auto Overwrite</span>
                                                <button onClick={() => setOverwriteDuplicates(!overwriteDuplicates)} className={`w-10 h-5 rounded-full relative transition-all ${overwriteDuplicates ? 'bg-foreground' : 'bg-surface'}`}>
                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-background transition-all ${overwriteDuplicates ? 'left-6' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-border pt-6 space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-accent-error">Danger Zone</label>
                                            <button onClick={handleClearStorage} className="w-full py-4 bg-accent-error/10 text-accent-error border border-accent-error/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-error hover:text-white transition-all">Clear All Files & Cache</button>
                                        </div>
                                    </div>
                                    <div className="pt-6">
                                        <button onClick={updateConfig} className="w-full btn-primary py-4 text-[10px] tracking-widest">SAVE SYSTEM CONFIG</button>
                                    </div>
                                </div>
                            )}

                            {activeHostTab === 'clipboard' && (
                                <div className="space-y-6">
                                    <textarea
                                        className="w-full h-80 bg-surface border border-border rounded-2xl p-6 font-mono text-sm outline-none shadow-inner"
                                        placeholder="Global clipboard content..."
                                        value={clipboard.content}
                                        onChange={(e) => setClipboard({ ...clipboard, content: e.target.value })}
                                    ></textarea>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-mono opacity-30 uppercase">Source: {clipboard.device_source}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { navigator.clipboard.writeText(clipboard.content); showToast('Copied!', 'info') }} className="px-6 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest">Copy Local</button>
                                            <button onClick={() => updateClipboard(clipboard.content)} className="px-6 py-3 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Push to Cloud</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeHostTab === 'analytics' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="card p-4 space-y-1">
                                            <div className="text-[10px] font-black opacity-30 uppercase">Received</div>
                                            <div className="text-2xl font-black">{(analytics.stats.total_received / (1024 * 1024)).toFixed(1)}MB</div>
                                        </div>
                                        <div className="card p-4 space-y-1">
                                            <div className="text-[10px] font-black opacity-30 uppercase">Transfers</div>
                                            <div className="text-2xl font-black">{analytics.stats.count}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {[...analytics.history].reverse().slice(0, 10).map((h, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-surface/50 border border-border rounded-xl text-[10px]">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black uppercase tracking-tight truncate max-w-[200px]">{h.filename}</span>
                                                    <span className="opacity-40">{h.device} • {new Date(h.timestamp * 1000).toLocaleTimeString()}</span>
                                                </div>
                                                <span className={`font-black ${h.direction === 'received' ? 'text-accent-success' : 'opacity-40'}`}>{h.direction.toUpperCase()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Toast System --- */}
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 max-w-sm w-full">
                {toasts.map(toast => (
                    <div key={toast.id} className={`p-4 rounded-xl border-2 shadow-xl animate-slide-in flex items-center gap-4 bg-background
                        ${toast.type === 'success' ? 'border-accent-success/30 text-accent-success' :
                            toast.type === 'error' ? 'border-accent-error/30 text-accent-error' :
                                toast.type === 'warning' ? 'border-accent-warning/30 text-accent-warning' :
                                    'border-border text-foreground'}`}>
                        {toast.type === 'success' && <CheckCircle2 size={18} />}
                        {toast.type === 'error' && <AlertTriangle size={18} />}
                        {toast.type === 'info' && <Info size={18} />}
                        {toast.type === 'warning' && <Power size={18} className="rotate-90" />}
                        <span className="grow font-bold text-xs uppercase tracking-wider">{toast.message}</span>
                        <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-40 hover:opacity-100">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;

