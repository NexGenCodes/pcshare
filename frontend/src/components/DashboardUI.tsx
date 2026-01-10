import { Upload, File, Loader2, CheckCircle2, XCircle, Moon, Sun, Monitor, HardDrive, Download, Smartphone, ClipboardList, Power, Lock, ShieldAlert, Trash2, Layers, CheckSquare, Square, RefreshCw, Copy, Send } from 'lucide-react';
import { FileItem, TransferStatus } from '../hooks/useFiles';
import { useTheme } from '../hooks/useTheme';
import { api } from '../services/api';
import { useState, useEffect, useRef } from 'react';

interface DashboardUIProps {
    files: FileItem[];
    uploading: boolean;
    progress: number;
    status: TransferStatus | null;
    onUpload: (file: File) => void;
    onReset: () => void;
}

export function DashboardUI({ files, uploading, progress, status, onUpload, onReset }: DashboardUIProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'transfer' | 'clipboard' | 'remote'>('transfer');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState({ content: '', last_updated: 0, device_source: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hostName, setHostName] = useState('Remote Host');

    useEffect(() => {
        // Fetch host info for dynamic naming
        api.get<any>('/host/info', {})
            .then(data => setHostName(data.host_name))
            .catch(console.error);
    }, []);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    const fetchClipboard = async () => {
        setIsRefreshing(true);
        try {
            const data = await api.get<any>('/host/clipboard', {});
            setClipboard(data);
        } catch (e) { console.error(e); }
        finally { setIsRefreshing(false); }
    };

    const pushClipboard = async () => {
        try {
            // Header is implicitly handled if we pass it, but since this is Mobile, we don't have the sessionId here directly.
            // However, DashboardUI is used inside App.tsx where we have session.
            // Wait, DashboardUI props don't include sessionId.
            await api.post('/host/clipboard', { content: clipboard.content });
            fetchClipboard();
            alert('Clipboard Pushed!');
        } catch (e) { console.error(e); }
    };

    const sendCommand = async (command: string) => {
        if (!confirm(`Are you sure you want to ${command} the host PC?`)) return;
        try {
            await api.post('/host/command', { command });
        } catch (e) { alert('Command failed. Session may be unauthorized.'); }
    };

    const toggleSelect = (name: string) => {
        setSelectedFiles(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Delete ${selectedFiles.length} files?`)) return;
        try {
            await api.post('/files/batch-delete', { filenames: selectedFiles });
            setSelectedFiles([]);
        } catch (e) { console.error(e); }
    };

    const handleBatchDownload = async () => {
        try {
            // In a real app, you'd trigger a blob download. For now, we'll hit the endpoint.
            window.open(`${window.location.origin}/api/files/batch-download?filenames=${selectedFiles.join(',')}`, '_blank');
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (activeTab === 'clipboard') fetchClipboard();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
            {/* Mobile-First Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-foreground text-background rounded-lg flex items-center justify-center">
                            <Monitor size={16} strokeWidth={3} />
                        </div>
                        <h1 className="font-extrabold tracking-tighter text-lg uppercase">Turbo<span className="opacity-40">Sync</span></h1>
                    </div>

                    <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border scale-90 md:scale-100">
                        <button onClick={() => setActiveTab('transfer')} className={`p-2 rounded-lg transition-all ${activeTab === 'transfer' ? 'bg-background shadow-sm text-foreground' : 'opacity-40 hover:opacity-100'}`}><Send size={18} /></button>
                        <button onClick={() => setActiveTab('clipboard')} className={`p-2 rounded-lg transition-all ${activeTab === 'clipboard' ? 'bg-background shadow-sm text-foreground' : 'opacity-40 hover:opacity-100'}`}><ClipboardList size={18} /></button>
                        <button onClick={() => setActiveTab('remote')} className={`p-2 rounded-lg transition-all ${activeTab === 'remote' ? 'bg-background shadow-sm text-foreground' : 'opacity-40 hover:opacity-100'}`}><Power size={18} /></button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border transition-all"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'transfer' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                        {/* Status & Upload Section */}
                        <section className="lg:col-span-4 space-y-6">
                            {/* Status Card */}
                            <div className="card space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold uppercase tracking-widest opacity-50">Session</h2>
                                    <button onClick={onReset} className="text-xs font-bold underline hover:no-underline opacity-60 hover:opacity-100 hover:text-accent-error">DISCONNECT</button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center">
                                        <Smartphone size={24} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg truncate max-w-[150px]">{hostName}</div>
                                        <div className="text-xs opacity-50 font-mono">STATUS: LINKED</div>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Card */}
                            <div className="card aspect-square flex flex-col relative overflow-hidden group">
                                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onUpload(e.target.files[0])} className="hidden" />
                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`grow border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4 transition-all cursor-pointer hover:bg-surface hover:border-foreground/20
                                    ${uploading ? 'bg-surface border-transparent pointer-events-none' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="text-center w-full px-8 animate-fade-in">
                                            <div className="mb-4 relative w-16 h-16 mx-auto flex items-center justify-center">
                                                <Loader2 size={32} className="animate-spin text-accent-success" />
                                            </div>
                                            <div className="font-mono text-3xl font-bold mb-1">{progress}%</div>
                                            <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                                                <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <p className="text-xs uppercase tracking-widest mt-4 opacity-50 font-bold">Transferring...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                <Upload size={32} strokeWidth={2} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-lg">Send Files</p>
                                                <p className="text-xs opacity-50 mt-1 font-medium">Tap to browse files</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {status && (
                                    <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 text-sm font-bold
                                        ${status.type === 'success'
                                            ? 'bg-accent-success/10 border-accent-success/20 text-accent-success'
                                            : 'bg-accent-error/10 border-accent-error/20 text-accent-error'}`}>
                                        {status.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        <span className="truncate">{status.message}</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* File List Section */}
                        <section className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                            <div className="card h-full flex flex-col p-0 overflow-hidden relative">
                                <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                                    <div className="flex items-center gap-3">
                                        <HardDrive size={20} className="text-foreground" />
                                        <h2 className="font-bold text-lg tracking-tight">Vault</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedFiles.length > 0 && (
                                            <button onClick={() => setSelectedFiles([])} className="text-[10px] font-bold uppercase underline opacity-40">Clear</button>
                                        )}
                                        <span className="px-2 py-1 bg-background border border-border rounded text-xs font-bold font-mono opacity-60">{files.length} ITEMS</span>
                                    </div>
                                </div>

                                <div className="grow overflow-y-auto p-4 space-y-3 pb-24">
                                    {files.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4 py-20">
                                            <File size={48} strokeWidth={1} />
                                            <p className="font-bold uppercase tracking-widest text-sm">Vault Empty</p>
                                        </div>
                                    ) : (
                                        files.map((file) => {
                                            const isSelected = selectedFiles.includes(file.name);
                                            return (
                                                <div key={file.name}
                                                    onClick={() => toggleSelect(file.name)}
                                                    className={`group p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer
                                                    ${isSelected ? 'bg-foreground/5 border-foreground/20' : 'border-border hover:border-foreground/10 hover:bg-surface/50'}`}>
                                                    <div className="flex items-center gap-4 overflow-hidden">
                                                        <div className="shrink-0 text-foreground/40 group-hover:text-foreground transition-colors">
                                                            {isSelected ? <CheckSquare size={20} className="text-accent-success" /> : <Square size={20} />}
                                                        </div>
                                                        <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-foreground/70 font-bold text-[10px] uppercase shrink-0">
                                                            {file.name.split('.').pop()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <div className="font-bold truncate text-sm">{file.name}</div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] opacity-40 font-mono italic">
                                                                <span>{formatSize(file.size)}</span>
                                                                <span>•</span>
                                                                <span>{file.direction === 'sent' ? 'FROM HOST' : 'SENT'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!isSelected && (
                                                        <a href={`/api/files/download/${encodeURIComponent(file.name)}`} download onClick={e => e.stopPropagation()}>
                                                            <button className="p-2 bg-surface hover:bg-background border border-border rounded-lg transition-all text-foreground/60 hover:text-foreground shrink-0">
                                                                <Download size={18} />
                                                            </button>
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Batch Action Footer */}
                                {selectedFiles.length > 0 && (
                                    <div className="absolute bottom-6 left-6 right-6 bg-foreground text-background p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-slide-up border border-white/10 z-10">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">{selectedFiles.length}</div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Selected</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleBatchDelete} className="p-2 hover:bg-accent-error/20 text-white/60 hover:text-accent-error transition-all rounded-lg"><Trash2 size={20} /></button>
                                            <button onClick={handleBatchDownload} className="p-2 hover:bg-white/10 text-white/80 transition-all rounded-lg"><Download size={20} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'clipboard' && (
                    <section className="max-w-xl mx-auto w-full space-y-6 animate-fade-in">
                        <div className="card space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                    <ClipboardList size={20} className="text-accent-success" />
                                    Global Clipboard
                                </h3>
                                <button onClick={fetchClipboard} className={`p-2 rounded-lg opacity-40 hover:opacity-100 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                                    <RefreshCw size={18} />
                                </button>
                            </div>

                            <textarea
                                className="w-full h-48 bg-surface border border-border rounded-xl p-4 font-mono text-sm outline-none focus:border-foreground/20 transition-all shadow-inner"
                                placeholder="Pasted text will appear here..."
                                value={clipboard.content}
                                onChange={(e) => setClipboard({ ...clipboard, content: e.target.value })}
                            ></textarea>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => { navigator.clipboard.writeText(clipboard.content); alert('Copied!') }} className="py-4 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Copy size={14} /> Copy Local
                                </button>
                                <button onClick={pushClipboard} className="py-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                                    <RefreshCw size={14} /> Push Changes
                                </button>
                            </div>

                            <div className="p-4 bg-surface/50 border border-border rounded-xl flex items-center justify-between text-[10px] font-mono opacity-40 uppercase tracking-widest">
                                <span>Source: {clipboard.device_source}</span>
                                <span>{new Date(clipboard.last_updated * 1000).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'remote' && (
                    <section className="max-w-xl mx-auto w-full space-y-6 animate-fade-in">
                        <div className="card space-y-8 p-8">
                            <div className="text-center space-y-2">
                                <h3 className="font-black uppercase tracking-widest text-lg">Remote Control</h3>
                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Host PC Commands</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <button onClick={() => sendCommand('lock')} className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl group hover:border-foreground/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-foreground text-background rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Lock size={24} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold uppercase tracking-widest text-xs">Lock Station</div>
                                            <p className="text-[10px] opacity-40">Require password to re-entry</p>
                                        </div>
                                    </div>
                                </button>

                                <button onClick={() => sendCommand('sleep')} className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl group hover:border-foreground/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-foreground/10 text-foreground rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Moon size={24} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold uppercase tracking-widest text-xs">Sleep Mode</div>
                                            <p className="text-[10px] opacity-40">Low power, quick wake</p>
                                        </div>
                                    </div>
                                </button>

                                <div className="h-px bg-border my-2"></div>

                                <button onClick={() => sendCommand('shutdown')} className="flex items-center justify-between p-6 border-2 border-accent-error/20 bg-accent-error/5 rounded-2xl group hover:bg-accent-error/10 hover:border-accent-error/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-accent-error text-white rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold uppercase tracking-widest text-xs text-accent-error">Instant Shutdown</div>
                                            <p className="text-[10px] text-accent-error/40 font-medium">Warning: Unsaved data will be lost</p>
                                        </div>
                                    </div>
                                    <Power size={20} className="text-accent-error" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-accent-warning/5 border border-accent-warning/20 rounded-2xl flex gap-4">
                            <ShieldAlert size={24} className="text-accent-warning shrink-0" />
                            <p className="text-[10px] text-accent-warning font-bold uppercase leading-relaxed tracking-wider">Note: Remote commands are only available when the host application is running and your session is authenticated.</p>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
