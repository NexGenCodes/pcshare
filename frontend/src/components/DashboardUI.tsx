import React, { useRef } from 'react';
import { Upload, Download, File, Loader2, CheckCircle2, XCircle, Smartphone, HardDrive, Share2 } from 'lucide-react';
import { FileItem, TransferStatus } from '../hooks/useFiles';

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

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const BackgroundOrbs = () => (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-turbo-primary/10 blur-[130px] rounded-full"></div>
            <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-turbo-accent/5 blur-[130px] rounded-full"></div>
        </div>
    );

    return (
        <div className="min-h-screen p-6 md:p-12 relative">
            <BackgroundOrbs />

            <div className="max-w-[1000px] mx-auto space-y-10 animate-fade-in">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
                    <div className="text-center md:text-left">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <h1 className="text-4xl font-black text-white tracking-tight">TURBO <span className="text-turbo-primary">SYNC</span></h1>
                            <div className="px-3 py-1 bg-turbo-primary/20 border border-turbo-primary/30 rounded-full text-[10px] uppercase font-black tracking-widest text-turbo-primary animate-pulse-slow">Live Tunnel</div>
                        </div>
                        <p className="text-turbo-text-muted mt-2 font-medium">Zero-latency peer-to-peer data bridge</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-3 px-4 py-2">
                            <div className="w-8 h-8 rounded-full bg-turbo-accent/20 flex items-center justify-center text-turbo-accent">
                                <Smartphone size={16} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-white leading-tight">Mobile Linked</div>
                                <div className="text-[10px] text-turbo-text-muted">Secure Signature: Valid</div>
                            </div>
                        </div>
                        <button onClick={onReset} className="p-3 bg-white/5 hover:bg-rose-500/20 text-turbo-text-muted hover:text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-500/30">
                            <XCircle size={20} />
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Upload and Stats */}
                    <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                        <div className="glass-card p-1 bg-white/2">
                            <div className="p-10 text-center space-y-6">
                                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && onUpload(e.target.files[0])} className="hidden" />

                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`relative group h-[280px] rounded-[24px] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center overflow-hidden
                                        ${uploading
                                            ? 'bg-black/40 border-turbo-primary/50'
                                            : 'bg-white/3 border-white/10 cursor-pointer hover:border-turbo-primary hover:bg-turbo-primary/5'
                                        }`}
                                >
                                    {uploading ? (
                                        <div className="relative z-10 space-y-4 px-10 w-full animate-scale-in">
                                            <div className="w-20 h-20 bg-turbo-primary/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                                                <Loader2 className="animate-spin text-turbo-primary" size={40} />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-3xl font-black text-white">{progress}%</div>
                                                <p className="text-xs font-bold text-turbo-primary uppercase tracking-[0.2em]">Streaming Pipeline</p>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-turbo-primary transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative z-10 space-y-4 px-6">
                                            <div className="w-20 h-20 bg-white/5 rounded-[28px] flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 group-hover:bg-turbo-primary/10 group-hover:border-turbo-primary/30 transition-all duration-500">
                                                <Upload size={36} className="text-turbo-text-muted group-hover:text-turbo-primary transition-colors" />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-white">Drop to Synchronize</h3>
                                                <p className="text-sm text-turbo-text-muted">Instant zero-copy local bus</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {status && (
                                    <div className={`flex items-center gap-3 p-4 rounded-2xl border animate-scale-in text-sm font-medium ${status.type === 'success'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                        }`}>
                                        {status.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        {status.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: File List */}
                    <div className="lg:col-span-12 xl:col-span-7">
                        <div className="glass-card bg-white/2 border border-white/5 overflow-hidden flex flex-col h-full ring-1 ring-white/5">
                            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-turbo-accent/10 rounded-lg text-turbo-accent">
                                        <HardDrive size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Active Vault</h2>
                                </div>
                                <div className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-turbo-text-muted uppercase tracking-widest">{files.length} ITEMS</div>
                            </div>

                            <div className="grow overflow-y-auto max-h-[600px] scrollbar-hide divide-y divide-white/3">
                                {files.length === 0 ? (
                                    <div className="py-32 text-center space-y-4 opacity-30 px-10">
                                        <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mx-auto">
                                            <Share2 size={32} />
                                        </div>
                                        <p className="text-sm font-medium tracking-wide">No active transfers in this session.</p>
                                    </div>
                                ) : (
                                    files.map((file) => (
                                        <div key={file.name} className="px-8 py-5 flex items-center justify-between group hover:bg-white/3 transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-turbo-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="relative bg-turbo-surface-light p-3.5 rounded-2xl text-turbo-primary border border-white/5 group-hover:border-turbo-primary/30 transition-all">
                                                        <File size={22} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-white group-hover:text-turbo-primary transition-colors truncate max-w-[200px] md:max-w-md">{file.name}</div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-turbo-text-muted uppercase tracking-wider">
                                                        <span>{formatSize(file.size)}</span>
                                                        <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                                        <span>{new Date(file.modified * 1000).toLocaleTimeString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <a
                                                href={`/api/files/download/${encodeURIComponent(file.name)}`}
                                                download
                                                className="p-3 bg-white/5 hover:bg-turbo-primary text-turbo-text-muted hover:text-white rounded-xl transition-all border border-transparent hover:ring-4 hover:ring-turbo-primary/20 shadow-lg"
                                            >
                                                <Download size={20} />
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Detail */}
                <footer className="pt-10 flex items-center justify-between text-[10px] font-mono text-turbo-text-muted/30 uppercase tracking-[0.3em]">
                    <div>Cyber-Safe Protocol Active</div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 underline decoration-turbo-primary/30">AES-256 E2EE</span>
                        <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                        <span className="text-white/20">TurbSync Engine v4.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
