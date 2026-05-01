import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (onAudioChunk: (base64Audio: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const onStopResolveRef = useRef<((blob: Blob) => void) | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const mimeType = 'audio/webm;codecs=opus';
            const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;
            
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // Accumulate for full recording
                    chunksRef.current.push(event.data);

                    // Stream to STT
                    const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64data = (reader.result as string).split(',')[1];
                        onAudioChunk(base64data);
                    };
                }
            };

            mediaRecorder.onstop = () => {
                const fullBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
                if (onStopResolveRef.current) {
                    onStopResolveRef.current(fullBlob);
                    onStopResolveRef.current = null;
                }
            };

            mediaRecorder.start(250);
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    }, [onAudioChunk]);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && isRecording) {
                onStopResolveRef.current = resolve;
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
            } else {
                resolve(null);
            }
        });
    }, [isRecording]);

    return { isRecording, startRecording, stopRecording };
};
