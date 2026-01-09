import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { SessionState } from '../hooks/useSession';

interface HandshakeUIProps {
    session: SessionState;
    isMobile: boolean;
    onInit: (name?: string) => void;
    onVerify: (pin: string) => Promise<boolean>;
}

const DesktopHandshake = ({ session }: { session: SessionState }) => {
    if (session.status === 'IDLE') {
        return (
            <div className="flex flex-col items-center justify-center p-8 relative min-h-[80vh]">
                <div className="card text-center max-w-[560px] w-full relative overflow-hidden">
                    <div className="flex flex-col items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-6xl font-black tracking-tighter m-0">TURBO<span className="opacity-40">SYNC</span></h1>
                            <div className="inline-block mt-4 px-4 py-1.5 bg-surface rounded-full border border-border">
                                <p className="opacity-60 font-bold uppercase text-[10px] tracking-[0.3em]">SECURE LOCAL TUNNEL</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative group mb-8">
                        <div className="relative bg-white p-4 rounded-[32px] inline-block shadow-xl group-hover:scale-[1.03] transition-transform duration-500 border border-border">
                            <img
                                src="/api/session/qr"
                                alt="Secure Handshake QR"
                                className="w-[240px] h-[240px] block"
                                onError={(e) => {
                                    const ip = window.location.hostname;
                                    (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=https://${ip}:8000?id=session&start=1`;
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center justify-center gap-4 bg-surface py-3 px-8 rounded-full border border-border">
                            <div className="w-3 h-3 rounded-full bg-accent-success animate-pulse"></div>
                            <span className="opacity-60 text-xs font-black tracking-[0.2em] uppercase">Ready to pair</span>
                        </div>
                        <p className="text-sm opacity-40 max-w-[340px] mx-auto leading-relaxed font-medium">Scan the code to establish an encrypted local link instantly.</p>
                    </div>
                </div>

                <footer className="mt-6 bg-surface border border-border px-6 py-2 rounded-full">
                    <p className="opacity-40 text-[10px] font-black uppercase tracking-[0.2em]">
                        v2.8 • NODE.{window.location.hostname}
                    </p>
                </footer>
            </div>
        );
    }

    if (session.status === 'PENDING_VERIFICATION') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
                <div className="card text-center max-w-[560px] w-full animate-fade-in relative">
                    <div className="bg-surface w-16 h-16 rounded-2xl border border-border flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Smartphone size={32} className="text-foreground" />
                    </div>

                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase">VERIFY ACCESS</h2>
                    <p className="opacity-50 mb-12 text-sm md:text-base px-10 font-medium leading-relaxed tracking-wide">Enter the pairing signature displayed on the host machine.</p>

                    <div className="space-y-12">
                        <div className="bg-surface p-12 rounded-3xl border border-border relative overflow-hidden">
                            <div className="relative text-8xl font-black tracking-[24px] text-foreground pl-[24px]">
                                {session.pin}
                            </div>
                        </div>
                        <p className="opacity-40 text-[10px] font-black tracking-[0.4em] mt-12 uppercase">Pairing Code</p>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const MobileHandshake = ({ session, onInit, onVerify }: { session: SessionState, onInit: (name?: string) => void, onVerify: (pin: string) => Promise<boolean> }) => {
    const [pinInput, setPinInput] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);

    const getDeviceName = () => {
        const ua = navigator.userAgent;
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/iPad/i.test(ua)) return 'iPad';
        if (/Android/i.test(ua)) {
            // Try to extract model from UA (simple)
            const match = ua.match(/Android\s+[\d\.]+;\s+([^;]+)\)/);
            return match ? match[1].trim() : 'Android Phone';
        }
        return 'Mobile Client';
    };

    // Reset timer when session status changes or new session created
    useEffect(() => {
        if (session.status === 'PENDING_VERIFICATION') {
            setTimeLeft(120);
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [session.status, session.session_id]); // dependency on session_id ensures reset on new session

    const handleVerify = async () => {
        const success = await onVerify(pinInput);
        if (!success) {
            setPinInput(''); // Clear input on failure (or maybe show error shake)
            alert('Invalid or Expired PIN');
        }
    };

    if (session.status === 'IDLE') {
        const deviceName = getDeviceName();
        return (
            <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-surface md:bg-background">
                <div className="card text-center w-full max-w-[400px] animate-fade-in relative border-none md:border shadow-none md:shadow-sm bg-transparent md:bg-card-bg">

                    {/* Updated Mobile Header */}
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-foreground text-background rounded-lg flex items-center justify-center">
                            <Smartphone size={20} />
                        </div>
                        <h1 className="text-2xl font-black tracking-tighter">TURBO<span className="opacity-40">SYNC</span></h1>
                    </div>

                    <div className="space-y-6">
                        <button onClick={() => onInit(deviceName)} className="btn-primary w-full shadow-lg py-4 text-lg">
                            INITIALIZE LINK
                        </button>
                        <p className="text-xs opacity-40 leading-relaxed max-w-[260px] mx-auto">
                            Connect as <span className="font-bold">{deviceName}</span>. Tap to start a secure peer-to-peer transfer session.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (session.status === 'PENDING_VERIFICATION') {
        const isExpired = timeLeft === 0;

        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface md:bg-background">
                <div className="card text-center w-full max-w-[400px] animate-fade-in relative border-none md:border shadow-none md:shadow-sm bg-transparent md:bg-card-bg">
                    <div className="bg-background w-16 h-16 rounded-2xl border border-border flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Smartphone size={24} className="text-foreground" />
                    </div>

                    <h2 className="text-2xl font-black mb-3 tracking-tight uppercase">VERIFY ACCESS</h2>
                    <p className="opacity-50 mb-6 text-sm px-4 font-medium leading-relaxed">Enter the pairing code from the host screen.</p>

                    <div className={`mb-8 font-mono font-bold text-sm ${isExpired ? 'text-accent-error' : 'text-accent-warning'} transition-colors`}>
                        {isExpired ? 'PIN EXPIRED' : `EXPIRES IN ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                    </div>

                    <div className="w-full space-y-8">
                        {isExpired ? (
                            <button onClick={() => onInit()} className="btn-secondary w-full py-4 uppercase">
                                Request New Code
                            </button>
                        ) : (
                            <>
                                <div className="relative">
                                    <input
                                        type="text"
                                        maxLength={4}
                                        inputMode="numeric"
                                        value={pinInput}
                                        onChange={(e) => setPinInput(e.target.value)}
                                        placeholder="0000"
                                        className="w-full py-6 text-4xl text-center bg-background border border-border rounded-2xl text-foreground font-black tracking-[12px] outline-none focus:border-foreground/50 transition-all uppercase placeholder:opacity-20"
                                    />
                                </div>
                                <button onClick={() => handleVerify()} className="btn-primary w-full shadow-xl py-4 text-base tracking-widest">
                                    AUTHORIZE
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

export function HandshakeUI({ session, isMobile, onInit, onVerify }: HandshakeUIProps) {
    if (isMobile) {
        return <MobileHandshake session={session} onInit={onInit} onVerify={onVerify} />;
    }
    return <DesktopHandshake session={session} />;
}
