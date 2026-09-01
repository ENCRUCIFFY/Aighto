import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch, exit } from '@tauri-apps/plugin-process';
import { ArrowUpCircle, RefreshCw } from 'lucide-react';

export default function UpdateModal() {
    const [update, setUpdate] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [statusText, setStatusText] = useState('Restart to apply new features');

    useEffect(() => {
        async function checkForUpdates() {
            try {
                const updateResult = await check();
                if (updateResult?.available) {
                    setUpdate(updateResult);
                }
            } catch (err) {
                console.error('Update check failed:', err);
            }
        }
        checkForUpdates();
    }, []);

    const handleUpdate = async () => {
        if (!update) return;
        setDownloading(true);

        try {
            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                    contentLength = event.data.contentLength || 0;
                    setStatusText('Downloading update...');
                } else if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength;
                    if (contentLength > 0) {
                        const pct = Math.round((downloaded / contentLength) * 100);
                        setStatusText(`Downloading... ${pct}%`);
                    }
                } else if (event.event === 'Finished') {
                    setStatusText('Installing and restarting...');
                }
            });

            setStatusText('Restarting...');

            // Attempt clean relaunch; fall back to exit if permission is missing
            try {
                await relaunch();
            } catch (relaunchErr) {
                console.warn('Relaunch failed, attempting exit:', relaunchErr);
                await exit(0);
            }
        } catch (err) {
            console.error('Failed to download/install update:', err);
            setStatusText('Update failed. Please retry.');
            setDownloading(false);
        }
    };

    if (!update) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 p-4 rounded-2xl bg-[#121216] border border-white/10 shadow-2xl shadow-black/90 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-2 rounded-xl bg-white/5 text-indigo-400">
                <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-semibold text-white">Update Ready (v{update.version})</p>
                <p className="text-xs text-zinc-400">{statusText}</p>
            </div>
            <button
                onClick={handleUpdate}
                disabled={downloading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition shadow-lg shadow-indigo-950/50 flex items-center gap-2 cursor-pointer"
            >
                {downloading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {downloading ? 'Applying...' : 'Update & Restart'}
            </button>
        </div>
    );
}