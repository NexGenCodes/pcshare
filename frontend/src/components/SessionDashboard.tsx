import React, { useRef, useState, useEffect } from 'react';
import { Upload, File, Loader2, CheckCircle2, XCircle, HardDrive, Download, StopCircle, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft, Settings, X, Info, ClipboardList, Copy, RefreshCw, Send, CheckSquare, Square } from 'lucide-react';
import { useFiles } from '../hooks/useFiles';
import { useSession } from '../hooks/useSession';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../services/api';

interface SessionDashboardProps {
    sessionId: string;
    deviceName?: string;
    onBack: () => void;
}

export function SessionDashboard({ sessionId, deviceName, onBack }: SessionDashboardProps) {
    const { blockSession, disconnectSession } = useSession();
    const { theme, setTheme } = useTheme();
    // Host viewing specific session files => authenticated=true, sessionId=sessionId
    // Added isHost=true and deviceName for storage routing
    const { files, uploading, progress, status, upload } = useFiles(true, sessionId, true, deviceName);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'clipboard'>('received');
    const [showSettings, setShowSettings] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState({ content: '', last_updated: 0, device_source: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleDisconnect = async () => {
        if (confirm('Are you sure you want to disconnect this device?')) {
            await disconnectSession(sessionId);
            onBack();
        }
    };

    const handleBlock = async () => {
        if (confirm('Are you sure you want to BLOCK this device? It will be disconnected immediately.')) {
            await blockSession(sessionId);
            onBack();
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    const fetchClipboard = async () => {
        setIsRefreshing(true);
        try {
            const data = await api.get<any>('/host/clipboard');
            setClipboard(data);
        } catch (e) { console.error(e); }
        finally { setIsRefreshing(false); }
    };

    const pushClipboard = async () => {
        try {
            await api.post('/host/clipboard', { content: clipboard.content }, { 'x-device-name': 'Host' });
            fetchClipboard();
        } catch (e) { console.error(e); }
    };

    const toggleSelect = (name: string) => {
        setSelectedFiles(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
    };

    const handleBatchDelete = async () => {
        if (!confirm(`Delete ${selectedFiles.length} files?`)) return;
        try {
            await api.post('/files/batch-delete', {
                filenames: selectedFiles,
                device_name: activeTab === 'received' ? deviceName : undefined
            }, { 'x-session-id': sessionId });
            setSelectedFiles([]);
        } catch (e) { console.error(e); }
    };

    const handleBatchDownload = async () => {
        const params = new URLSearchParams();
        selectedFiles.forEach(f => params.append('filenames', f));
        if (activeTab === 'received' && deviceName) {
            params.append('device_name', deviceName);
        }
        window.open(`/api/files/batch-download?${params.toString()}`, '_blank');
    };

    const filteredFiles = files.filter(f => f.direction === activeTab);

    useEffect(() => {
        if (activeTab === 'clipboard') fetchClipboard();
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col animate-fade-in relative overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-surface rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="font-bold uppercase tracking-tight text-sm md:text-base">
                                {deviceName || 'Unknown Device'}
                            </h1>
                            <span className="text-[10px] font-mono opacity-50">{sessionId}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-surface rounded-full transition-colors opacity-60 hover:opacity-100">
                            <Settings size={20} />
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="grow p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Panel: Controls & Upload */}
                <section className="lg:col-span-4 space-y-6">
                    {/* Control Card */}
                    <div className="card space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest opacity-50">Session Controls</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleDisconnect} className="btn-secondary w-full flex flex-col items-center gap-2 py-4 hover:border-accent-warning hover:text-accent-warning transition-colors">
                                <Trash2 size={20} />
                                <span className="text-[10px] font-bold">DISCONNECT</span>
                            </button>
                            <button onClick={handleBlock} className="btn-secondary w-full flex flex-col items-center gap-2 py-4 hover:border-accent-error hover:text-accent-error transition-colors">
                                <StopCircle size={20} />
                                <span className="text-[10px] font-bold">BLOCK</span>
                            </button>
                        </div>
                    </div>

                    {/* Upload Card */}
                    <div className="card aspect-square flex flex-col relative overflow-hidden group">
                        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && upload(e.target.files[0])} className="hidden" />

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
                                    <p className="text-xs uppercase tracking-widest mt-4 opacity-50 font-bold">Sending...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-foreground text-background rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <Upload size={32} strokeWidth={2} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-lg">Send to Device</p>
                                        <p className="text-xs opacity-50 mt-1 font-medium">Tap to browse or drop</p>
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
                                {status.message}
                            </div>
                        )}
                    </div>
                </section>

                {/* Right Panel: File List */}
                <section className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                    <div className="card h-full flex flex-col p-0 overflow-hidden">
                        {/* Tabs Header */}
                        <div className="flex border-b border-border bg-surface/30">
                            <button
                                onClick={() => setActiveTab('received')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${activeTab === 'received' ? 'bg-background border-b-2 border-foreground' : 'opacity-40 hover:opacity-100'}`}
                            >
                                <ArrowDownLeft size={14} />
                                Received
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${activeTab === 'sent' ? 'bg-background border-b-2 border-foreground' : 'opacity-40 hover:opacity-100'}`}
                            >
                                <ArrowUpRight size={14} />
                                Sent
                            </button>
                            <button
                                onClick={() => setActiveTab('clipboard')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${activeTab === 'clipboard' ? 'bg-background border-b-2 border-foreground' : 'opacity-40 hover:opacity-100'}`}
                            >
                                <ClipboardList size={14} />
                                Clipboard
                            </button>
                        </div>

                        <div className="p-4 bg-surface/20 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider border-b border-border opacity-50">
                            <span>{activeTab === 'received' ? 'Direct to Downloads' : activeTab === 'sent' ? 'Temporary Buffer' : 'Global Shared Text'}</span>
                            <div className="flex items-center gap-4">
                                {selectedFiles.length > 0 && <button onClick={() => setSelectedFiles([])} className="underline opacity-40 hover:opacity-100">Clear Selection</button>}
                                <span>{activeTab === 'clipboard' ? '1 ITEM' : `${filteredFiles.length} ITEMS`}</span>
                            </div>
                        </div>

                        <div className="grow overflow-y-auto p-4 space-y-3 pb-24">
                            {activeTab === 'clipboard' ? (
                                <div className="space-y-6 animate-fade-in p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="space-y-1">
                                            <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">Shared Text Vault</h3>
                                            <p className="text-[10px] opacity-30 font-mono italic">SOURCE: {clipboard.device_source || 'HOST'}</p>
                                        </div>
                                        <button onClick={fetchClipboard} className={`p-2 hover:bg-surface rounded-lg opacity-40 ${isRefreshing ? 'animate-spin' : ''}`}>
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full h-64 bg-surface border border-border rounded-xl p-6 font-mono text-sm outline-none focus:border-foreground/20 transition-all shadow-inner"
                                        placeholder="Type something to share with the device..."
                                        value={clipboard.content}
                                        onChange={(e) => setClipboard({ ...clipboard, content: e.target.value })}
                                    ></textarea>
                                    <div className="flex gap-4">
                                        <button onClick={() => { navigator.clipboard.writeText(clipboard.content); }} className="flex-1 py-4 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Copy size={14} /> Copy Local
                                        </button>
                                        <button onClick={pushClipboard} className="flex-1 py-4 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl">
                                            <Send size={14} /> Push Sync
                                        </button>
                                    </div>
                                </div>
                            ) : filteredFiles.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4 py-20">
                                    <HardDrive size={48} strokeWidth={1} />
                                    <p className="font-bold uppercase tracking-widest text-sm">No files {activeTab} yet</p>
                                </div>
                            ) : (
                                filteredFiles.map((file) => {
                                    const isSelected = selectedFiles.includes(file.name);
                                    return (
                                        <div key={file.name}
                                            onClick={() => toggleSelect(file.name)}
                                            className={`group p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer
                                            ${isSelected ? 'bg-foreground/5 border-foreground/30' : 'border-border hover:bg-surface'}`}>
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="shrink-0 text-foreground/20 group-hover:text-foreground transition-colors">
                                                    {isSelected ? <CheckSquare size={20} className="text-accent-success" /> : <Square size={20} />}
                                                </div>
                                                <div className="w-12 h-12 bg-surface border border-border rounded-lg flex items-center justify-center text-foreground/70 font-bold text-[10px] uppercase shrink-0 overflow-hidden relative">
                                                    {file.is_dir ? (
                                                        <HardDrive size={24} className="opacity-40" />
                                                    ) : file.has_thumbnail ? (
                                                        <img
                                                            src={`/api/files/thumbnail/${activeTab === 'received' ? encodeURIComponent(`${deviceName}/${file.name}`) : encodeURIComponent(file.name)}`}
                                                            className="w-full h-full object-cover animate-fade-in"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        file.name.split('.').pop()
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold truncate text-sm">{file.name}</div>
                                                        {file.is_dir && <span className="text-[8px] bg-accent-success/10 text-accent-success border border-accent-success/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Folder</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] opacity-40 font-mono mt-0.5">
                                                        <span>{file.is_dir ? 'DIR' : formatSize(file.size)}</span>
                                                        <span>•</span>
                                                        <span>{new Date(file.modified * 1000).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!isSelected && (
                                                <a href={`/api/files/download/${activeTab === 'received' ? encodeURIComponent(`${deviceName}/${file.name}`) : encodeURIComponent(file.name)}`} target="_blank" download onClick={e => e.stopPropagation()}>
                                                    <button className="p-2 hover:bg-background border border-transparent hover:border-border rounded-lg transition-all text-foreground/60 hover:text-foreground">
                                                        <Download size={20} />
                                                    </button>
                                                </a>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Batch Footer */}
                        {selectedFiles.length > 0 && (
                            <div className="absolute bottom-6 left-6 right-6 bg-foreground text-background p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-slide-up border border-white/10 z-10">
                                <div className="flex items-center gap-3 ml-2">
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">{selectedFiles.length}</div>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Batch Selected</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleBatchDelete} className="p-2 hover:bg-accent-error/20 text-white/60 hover:text-accent-error transition-all rounded-lg"><Trash2 size={20} /></button>
                                    <button onClick={handleBatchDownload} className="p-2 hover:bg-white/10 text-white/80 transition-all rounded-lg"><Download size={20} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* --- Session Settings Modal --- */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
                    <div className="card max-w-[450px] w-full shadow-2xl border-2 border-border p-8 space-y-8 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings size={20} className="text-foreground/60" />
                                <h2 className="text-xl font-black tracking-tight uppercase">Session Settings</h2>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-surface rounded-full opacity-60">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Theme Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Appearance</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['light', 'dark', 'system'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTheme(t)}
                                            className={`py-2 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all
                                                ${theme === t
                                                    ? 'bg-foreground text-background border-foreground'
                                                    : 'bg-surface border-border opacity-60 hover:opacity-100 hover:border-foreground/20'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Session Details</label>
                                <div className="bg-surface rounded-xl p-4 space-y-3 border border-border">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="opacity-50 font-bold uppercase tracking-wider">Device Name</span>
                                        <span className="font-black">{deviceName}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="opacity-50 font-bold uppercase tracking-wider">Session ID</span>
                                        <span className="font-mono opacity-80">{sessionId.substring(0, 12)}...</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="opacity-50 font-bold uppercase tracking-wider">Status</span>
                                        <span className="text-accent-success font-black">ACTIVE</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-surface rounded-xl flex gap-3 border border-border">
                                <Info size={16} className="opacity-40 shrink-0" />
                                <p className="text-[10px] opacity-40 font-medium leading-relaxed">
                                    Closing this session will permanently remove all temporary "Sent" files from the host server.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-border">
                            <button onClick={() => setShowSettings(false)} className="btn-primary flex-1 py-4 text-xs tracking-widest">
                                DONE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
