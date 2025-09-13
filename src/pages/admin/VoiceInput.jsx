import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff } from 'lucide-react';

const VoiceInput = ({ onTranscriptChange, disabled = false }) => {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = SpeechRecognition.useSpeechRecognition();

    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        // Check browser support on component mount
        if (!browserSupportsSpeechRecognition || !isMicrophoneAvailable) {
            setIsSupported(false);
        }
    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable]);

    useEffect(() => {
        // Send transcript updates to parent component
        if (transcript) {
            onTranscriptChange(transcript);
        }
    }, [transcript, onTranscriptChange]);

    const startListening = () => {
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    };

    const stopListening = () => {
        SpeechRecognition.stopListening();
    };

    const toggleListening = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isSupported) {
        return (
            <div className="text-sm text-red-600 mt-1">
                Voice input is not supported in your browser or microphone access is blocked.
            </div>
        );
    }

    return (
        <div className="flex items-center mt-2">
            <button
                type="button"
                onClick={toggleListening}
                disabled={disabled}
                className={`p-2 rounded-full mr-2 ${listening
                    ? 'bg-red-100 text-red-600'
                    : 'bg-purple-100 text-purple-600'
                    } hover:opacity-80 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={listening ? 'Stop listening' : 'Start voice typing'}
            >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <div className="flex-1">
                <div className="flex items-center text-sm text-gray-500">
                    {listening && (
                        <div className="flex items-center mr-2">
                            <span className="relative flex h-3 w-3 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            Listening...
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={resetTranscript}
                        disabled={!transcript || disabled}
                        className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Clear voice input
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VoiceInput;