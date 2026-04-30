import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (onAudioChunk: (base64Audio: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Try to use a standard audio mimeType if available
            const mimeType = 'audio/webm;codecs=opus';
            const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;
            
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    const reader = new FileReader();
                    reader.readAsDataURL(event.data);
                    reader.onloadend = () => {
                        const base64data = (reader.result as string).split(',')[1];
                        onAudioChunk(base64data);
                    };
                }
            };

            // Start recording with 250ms chunks
            mediaRecorder.start(250);
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    }, [onAudioChunk]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    }, [isRecording]);

    return { isRecording, startRecording, stopRecording };
};
