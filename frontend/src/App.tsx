import React, { useState, useEffect, useRef } from 'react';
import { useSession } from './hooks/useSession';
import { useFiles } from './hooks/useFiles';
import { HandshakeUI } from './components/HandshakeUI';
import { DashboardUI } from './components/DashboardUI';
import { SessionDashboard } from './components/SessionDashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { StopCircle, Trash2, Settings, X, HardDrive, CheckCircle2, Info, AlertTriangle, Power } from 'lucide-react';
import { api } from './services/api';

interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

function App() {
    const { sessions, mySession, isMobile, init, verify, reset, disconnectSession, blockSession } = useSession();
    const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [savePath, setSavePath] = useState('');
    const [toasts, setToasts] = useState<Toast[]>([]);

    const lastSessionCount = useRef(sessions.length);

    // --- Toast System ---
    const showToast = (message: string, type: Toast['type'] = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // --- Settings Logic ---
    useEffect(() => {
        if (!isMobile) {
            api.get<{ save_path: string }>('/files/config')
                .then(data => setSavePath(data.save_path))
                .catch(console.error);
        }
    }, [isMobile]);

    const updateSavePath = async () => {
        try {
            await api.post('/files/config', { save_path: savePath });
            showToast('Save path updated successfully', 'success');
            setShowSettings(false);
        } catch (e) {
            showToast('Failed to update save path', 'error');
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
        isMobile ? mySession?.session_id : undefined
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
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border">
                        <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Server Active</span>
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

            <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Connect New Device */}
                <div className="space-y-6">
                    <div className="card bg-surface/50 border-dashed border-2 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        <HandshakeUI
                            session={{ status: 'IDLE', pin: null }}
                            isMobile={false}
                            onInit={() => { }}
                            onVerify={async () => false}
                        />
                    </div>
                </div>

                {/* RIGHT: Active Sessions List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold uppercase tracking-widest opacity-60">Connected Devices</h2>
                        <span className="px-2 py-1 bg-surface border border-border rounded text-[10px] font-black">{sessions.length} ACTIVE</span>
                    </div>

                    {sessions.length === 0 && (
                        <div className="p-20 text-center opacity-30 border border-dashed border-border rounded-3xl flex flex-col items-center gap-4">
                            <HardDrive size={48} strokeWidth={1} />
                            <div>
                                <p className="font-bold uppercase tracking-widest text-sm">Waiting for connections</p>
                                <p className="text-[10px] mt-1 font-medium">Scan the QR code to pair a device</p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4">
                        {sessions.map(s => (
                            <div key={s.session_id} className="card flex items-center justify-between p-6 animate-fade-in group hover:border-foreground/20 transition-all border-l-4"
                                style={{ borderLeftColor: s.status === 'AUTHENTICATED' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-bold text-lg">{s.device_name || 'Unknown Device'}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider 
                                            ${s.status === 'AUTHENTICATED' ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-warning/10 text-accent-warning'}`}>
                                            {s.status === 'AUTHENTICATED' ? 'Linked' : 'Pairing'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{s.session_id?.substring(0, 8)}...</div>

                                    {s.status === 'PENDING_VERIFICATION' && (
                                        <div className="mt-4 bg-background border border-border text-foreground font-black text-4xl p-4 rounded-xl tracking-[0.2em] inline-block shadow-inner">
                                            {s.pin}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {s.status === 'AUTHENTICATED' && (
                                        <>
                                            <button
                                                onClick={() => setViewingSessionId(s.session_id || null)}
                                                className="btn-primary text-[10px] px-6 py-2 tracking-widest shadow-lg"
                                            >
                                                MANAGE
                                            </button>
                                            <div className="w-px h-6 bg-border mx-2"></div>
                                        </>
                                    )}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { if (confirm('Disconnect device?')) disconnectSession(s.session_id!) }}
                                            className="p-2 text-foreground/40 hover:text-accent-warning hover:bg-surface rounded-lg transition-colors"
                                            title="Disconnect"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm('BLOCK device permanently?')) blockSession(s.session_id!) }}
                                            className="p-2 text-foreground/40 hover:text-accent-error hover:bg-surface rounded-lg transition-colors"
                                            title="Block"
                                        >
                                            <StopCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* --- Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="card max-w-[500px] w-full shadow-2xl border-2 border-border p-8 space-y-8 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings size={20} className="text-foreground/60" />
                                <h2 className="text-xl font-black tracking-tight uppercase">HOST SETTINGS</h2>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-surface rounded-full opacity-60">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Download Directory</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={savePath}
                                        onChange={(e) => setSavePath(e.target.value)}
                                        className="w-full bg-surface border border-border p-4 rounded-xl font-mono text-sm focus:border-foreground/30 outline-none transition-all"
                                        placeholder="C:/Users/Downloads/TurboSync"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">HOST LOCAL</div>
                                </div>
                                <p className="text-[10px] opacity-40 leading-relaxed font-medium">This is where files received from devices will be saved. Path must be absolute and accessible by the server.</p>
                            </div>

                            <div className="p-4 bg-accent-warning/5 border border-accent-warning/20 rounded-xl flex gap-3">
                                <Info size={16} className="text-accent-warning shrink-0" />
                                <p className="text-[10px] text-accent-warning font-bold leading-tight uppercase tracking-wider">Note: Changing the path will not move existing files.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-border">
                            <button onClick={updateSavePath} className="btn-primary flex-1 py-4 text-xs tracking-widest">
                                SAVE CONFIGURATION
                            </button>
                            <button onClick={() => setShowSettings(false)} className="btn-secondary px-8 py-4 text-xs tracking-widest">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Toast System --- */}
            <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 max-w-sm w-full">
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

