import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Settings, Mic, Video, Volume2 } from 'lucide-react';

interface DeviceSettingsProps {
    currentAudioInput?: string;
    currentVideoInput?: string;
    currentAudioOutput?: string;
    onDeviceChange: (kind: MediaDeviceKind, deviceId: string) => void;
}

export function DeviceSettings({
    currentAudioInput,
    currentVideoInput,
    currentAudioOutput,
    onDeviceChange
}: DeviceSettingsProps) {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first to get labels
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                const dev = await navigator.mediaDevices.enumerateDevices();
                setDevices(dev);
            } catch (e) {
                console.error("Failed to enumerate devices", e);
            }
        };

        if (isOpen) {
            getDevices();
            navigator.mediaDevices.addEventListener('devicechange', getDevices);
        }

        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getDevices);
        };
    }, [isOpen]);

    const audioInputs = devices.filter(d => d.kind === 'audioinput');
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full h-10 w-10 bg-white/10 hover:bg-white/20 border-0">
                    <Settings className="h-5 w-5 text-white" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle>Device Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Microphone */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-zinc-400">
                            <Mic className="h-4 w-4" /> Microphone
                        </label>
                        <Select
                            value={currentAudioInput}
                            onValueChange={(val) => onDeviceChange('audioinput', val)}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Select Microphone" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                {audioInputs.map(d => (
                                    <SelectItem key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Camera */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-zinc-400">
                            <Video className="h-4 w-4" /> Camera
                        </label>
                        <Select
                            value={currentVideoInput}
                            onValueChange={(val) => onDeviceChange('videoinput', val)}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Select Camera" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                {videoInputs.map(d => (
                                    <SelectItem key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Speakers (Chrome only mostly) */}
                    {audioOutputs.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2 text-zinc-400">
                                <Volume2 className="h-4 w-4" /> Speakers
                            </label>
                            <Select
                                value={currentAudioOutput}
                                onValueChange={(val) => onDeviceChange('audiooutput', val)}
                            >
                                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectValue placeholder="Select Speakers" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    {audioOutputs.map(d => (
                                        <SelectItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Speaker ${d.deviceId.slice(0, 5)}...`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
