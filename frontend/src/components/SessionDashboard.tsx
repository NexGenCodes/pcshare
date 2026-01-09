import React, { useRef, useState } from 'react';
import { Upload, File, Loader2, CheckCircle2, XCircle, HardDrive, Download, StopCircle, Trash2, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useFiles } from '../hooks/useFiles';
import { useSession } from '../hooks/useSession';
import { ThemeToggle } from './ThemeToggle';

interface SessionDashboardProps {
    sessionId: string;
    deviceName?: string;
    onBack: () => void;
}

export function SessionDashboard({ sessionId, deviceName, onBack }: SessionDashboardProps) {
    const { blockSession, disconnectSession } = useSession();
    // Host viewing specific session files => authenticated=true, sessionId=sessionId
    // Added isHost=true and deviceName for storage routing
    const { files, uploading, progress, status, upload } = useFiles(true, sessionId, true, deviceName);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

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

    const filteredFiles = files.filter(f => f.direction === activeTab);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col animate-fade-in">
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
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${activeTab === 'received' ? 'bg-background border-b-2 border-foreground' : 'opacity-40 hover:opacity-100'}`}
                            >
                                <ArrowDownLeft size={16} />
                                Received Files
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                                ${activeTab === 'sent' ? 'bg-background border-b-2 border-foreground' : 'opacity-40 hover:opacity-100'}`}
                            >
                                <ArrowUpRight size={16} />
                                Sent Files
                            </button>
                        </div>

                        <div className="p-4 bg-surface/20 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider border-b border-border opacity-50">
                            <span>{activeTab === 'received' ? 'Vault (Direct to Downloads)' : 'Temporary Buffers (Deleted on Disconnect)'}</span>
                            <span>{filteredFiles.length} {filteredFiles.length === 1 ? 'Item' : 'Items'}</span>
                        </div>

                        <div className="grow overflow-y-auto p-4 space-y-3">
                            {filteredFiles.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4 py-20">
                                    <HardDrive size={48} strokeWidth={1} />
                                    <p className="font-bold uppercase tracking-widest text-sm">No files {activeTab} yet</p>
                                </div>
                            ) : (
                                filteredFiles.map((file) => (
                                    <div key={file.name} className="group p-4 rounded-lg border border-border hover:bg-surface transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-foreground/70 font-bold text-[10px] uppercase">
                                                {file.name.split('.').pop()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold truncate text-sm md:text-base">{file.name}</div>
                                                <div className="flex items-center gap-2 text-xs opacity-50 font-mono mt-0.5">
                                                    <span>{formatSize(file.size)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(file.modified * 1000).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <a href={`/api/files/download/${activeTab === 'received' ? encodeURIComponent(`${deviceName}/${file.name}`) : encodeURIComponent(file.name)}`} target="_blank" download>
                                            <button className="p-2 hover:bg-background border border-transparent hover:border-border rounded-lg transition-all text-foreground/60 hover:text-foreground">
                                                <Download size={20} />
                                            </button>
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
