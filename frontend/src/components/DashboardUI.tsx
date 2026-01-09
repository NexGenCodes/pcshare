import React, { useRef, useState, useEffect } from 'react';
import { Upload, File, Loader2, CheckCircle2, XCircle, Moon, Sun, Monitor, HardDrive, Download, Trash2, Smartphone } from 'lucide-react';
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
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Initialize theme based on system preference or storage could happen here
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        } else {
            setTheme('light');
            document.documentElement.classList.remove('dark');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
            {/* Mobile-First Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-foreground text-background rounded-lg flex items-center justify-center">
                            <Monitor size={16} strokeWidth={3} />
                        </div>
                        <h1 className="font-extrabold tracking-tighter text-lg uppercase hidden md:block">Turbo<span className="opacity-40">Sync</span></h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
                            <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">Connected</span>
                        </div>

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

            <main className="grow p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

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
                                <div className="font-bold text-lg">Mobile Linked</div>
                                <div className="text-xs opacity-50 font-mono">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</div>
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
                                        <p className="text-xs opacity-50 mt-1 font-medium">Tap to browse or drop files</p>
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

                {/* File List Section */}
                <section className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                    <div className="card h-full flex flex-col p-0 overflow-hidden">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
                            <div className="flex items-center gap-3">
                                <HardDrive size={20} className="text-foreground" />
                                <h2 className="font-bold text-lg tracking-tight">Shared Files</h2>
                            </div>
                            <span className="px-2 py-1 bg-background border border-border rounded text-xs font-bold font-mono opacity-60">{files.length} ITEMS</span>
                        </div>

                        <div className="grow overflow-y-auto p-4 space-y-3">
                            {files.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4">
                                    <File size={48} strokeWidth={1} />
                                    <p className="font-bold uppercase tracking-widest text-sm">Vault Empty</p>
                                </div>
                            ) : (
                                files.map((file) => (
                                    <div key={file.name} className="group p-4 rounded-lg border border-border hover:bg-surface transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-foreground/70 font-bold text-[10px] uppercase shrink-0">
                                                {file.name.split('.').pop()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="font-bold truncate text-sm">{file.name}</div>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0
                                                        ${file.direction === 'sent' ? 'bg-accent-success/10 text-accent-success border border-accent-success/20' : 'bg-foreground/5 opacity-40 border border-border'}`}>
                                                        {file.direction === 'sent' ? 'From Host' : 'Sent'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs opacity-40 font-mono">
                                                    <span>{formatSize(file.size)}</span>
                                                    <span>•</span>
                                                    <span>{new Date(file.modified * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <a href={`/api/files/download/${encodeURIComponent(file.name)}`} download>
                                            <button className="p-2 bg-surface hover:bg-background border border-border rounded-lg transition-all text-foreground/60 hover:text-foreground shrink-0">
                                                <Download size={18} />
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
