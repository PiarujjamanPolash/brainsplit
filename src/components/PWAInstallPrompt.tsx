
'use client';

import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Detect if device is iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

        // Detect if app is already installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (navigator as any).standalone;

        // Show if on iOS and not standalone
        if (isIOS && !isStandalone) {
            const dismissed = localStorage.getItem('pwa-dismissed');
            if (!dismissed) {
                setShow(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem('pwa-dismissed', 'true');
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="relative bg-primary text-primary-foreground p-4 rounded-xl shadow-2xl border border-primary-foreground/10">
                <button
                    onClick={handleDismiss}
                    className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded-full"
                >
                    <X size={16} />
                </button>

                <div className="flex gap-3 items-start pr-6">
                    <div className="bg-white/20 p-2 rounded-lg shrink-0">
                        <PlusSquare size={20} />
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-sm">Install Braingig Expenses</p>
                        <p className="text-xs text-primary-foreground/90 leading-relaxed">
                            To install, tap the <span className="inline-block align-middle mx-1"><Share size={14} /></span>
                            <strong>Share</strong> icon and select <strong>"Add to Home Screen"</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
