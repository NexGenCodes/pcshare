import React, { useState } from 'react';
import { QrCode, Smartphone } from 'lucide-react';
import { SessionState } from '../hooks/useSession';

interface HandshakeUIProps {
    session: SessionState;
    isMobile: boolean;
    onInit: () => void;
    onVerify: (pin: string) => Promise<boolean>;
}

export function HandshakeUI({ session, isMobile, onInit, onVerify }: HandshakeUIProps) {
    const [pinInput, setPinInput] = useState('');

    const BackgroundOrbs = () => (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-turbo-primary/20 blur-[120px] rounded-full animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-turbo-accent/10 blur-[120px] rounded-full animate-float [animation-delay:2s]"></div>
        </div>
    );

    if (session.status === 'IDLE') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
                <BackgroundOrbs />
                <div className="glass-card p-10 md:p-16 text-center max-w-[500px] w-full animate-fade-in relative overflow-hidden">
                    {/* Brand Header */}
                    <div className="flex flex-col items-center gap-4 mb-10">
                        <div className="w-16 h-16 bg-turbo-primary/20 border border-turbo-primary/30 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                            <QrCode size={32} className="text-turbo-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white m-0">TURBO <span className="text-turbo-primary">SYNC</span></h1>
                            <p className="text-turbo-text-muted mt-2 font-medium">Encrypted Peer-to-Peer Tunnel</p>
                        </div>
                    </div>

                    {/* QR Section */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-turbo-primary/10 blur-2xl group-hover:bg-turbo-primary/20 transition-all duration-500 rounded-3xl"></div>
                        <div className="relative bg-white p-6 rounded-[24px] inline-block shadow-2xl animate-scale-in">
                            <img
                                src="/api/session/qr"
                                alt="Secure Handshake QR"
                                className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] block"
                                onError={(e) => {
                                    // Fallback if image fails to load
                                    (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(window.location.host);
                                }}
                            />
                        </div>
                    </div>

                    {!isMobile ? (
                        <div className="mt-12 space-y-4">
                            <div className="text-turbo-text-muted text-sm font-semibold tracking-wide items-center justify-center gap-3 bg-white/5 py-3 px-6 rounded-full inline-flex mx-auto border border-white/5">
                                <div className="pulse-dot"></div> Awaiting Secure Connection...
                            </div>
                            <p className="text-xs text-turbo-text-muted/60 max-w-[280px] mx-auto leading-relaxed">Scan the code with your mobile device to establish a local data tunnel.</p>
                        </div>
                    ) : (
                        <div className="mt-12">
                            <button onClick={onInit} className="btn-primary w-full text-lg uppercase tracking-widest py-5">
                                Start Tunneling
                            </button>
                        </div>
                    )}

                    {/* Bottom Detail */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-turbo-primary to-transparent opacity-30"></div>
                </div>

                <footer className="mt-8 text-turbo-text-muted/40 text-xs font-mono uppercase tracking-[0.2em]">
                    Turbo Sync Protocol v2.0 • Local IP: {window.location.hostname}
                </footer>
            </div>
        );
    }

    if (session.status === 'PENDING_VERIFICATION') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
                <BackgroundOrbs />
                <div className="glass-card p-8 md:p-14 text-center max-w-[500px] w-full animate-fade-in relative">
                    <div className="bg-turbo-primary/10 w-20 h-20 rounded-[28px] border border-turbo-primary/20 flex items-center justify-center mx-auto mb-8 text-turbo-primary shadow-inner">
                        <Smartphone size={40} className="animate-pulse-slow" />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-3">Identity Verified?</h2>
                    <p className="text-turbo-text-muted mb-10 text-sm md:text-base px-4">A pairing request has been detected. Confirm the security signature to proceed.</p>

                    {!isMobile ? (
                        <div className="space-y-8">
                            <div className="bg-black/20 p-8 rounded-[32px] border border-white/5 relative group">
                                <div className="absolute inset-0 bg-turbo-primary/5 blur-xl group-hover:bg-turbo-primary/10 transition-all"></div>
                                <div className="relative text-7xl font-black tracking-[16px] text-turbo-primary drop-shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                                    {session.pin}
                                </div>
                            </div>
                            <p className="text-turbo-text-muted text-sm font-medium italic mt-6 opacity-60">Enter this code on your mobile device...</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-8">
                            <div className="relative">
                                <input
                                    type="text"
                                    maxLength={4}
                                    inputMode="numeric"
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="----"
                                    className="w-full py-6 text-5xl text-center bg-black/40 border-2 border-turbo-primary/30 rounded-[24px] text-white font-black tracking-[20px] outline-none focus:border-turbo-primary focus:ring-4 focus:ring-turbo-primary/10 transition-all uppercase placeholder:text-white/10 shadow-inner"
                                />
                            </div>
                            <button onClick={() => onVerify(pinInput)} className="btn-primary w-full text-lg uppercase tracking-widest py-5">
                                Unlock Dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
}
