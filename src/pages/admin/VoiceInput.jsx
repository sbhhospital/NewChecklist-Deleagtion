import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

const DeploymentVoiceInput = ({ onTranscriptChange, disabled = false }) => {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
    } = useSpeechRecognition();

    const [isClient, setIsClient] = useState(false);
    const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true);
    const [deploymentError, setDeploymentError] = useState(null);

    useEffect(() => {
        setIsClient(true);

        if (!browserSupportsSpeechRecognition) {
            setDeploymentError('BROWSER_NOT_SUPPORTED');
            return;
        }

        const checkMicrophoneAccess = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                setIsMicrophoneAvailable(true);
            } catch (error) {
                console.error('Microphone access error:', error);
                setIsMicrophoneAvailable(false);

                if (error.name === 'NotAllowedError') {
                    setDeploymentError('PERMISSION_DENIED');
                } else if (error.name === 'NotFoundError') {
                    setDeploymentError('NO_MICROPHONE');
                } else {
                    setDeploymentError('UNKNOWN_ERROR');
                }
            }
        };

        checkMicrophoneAccess();
    }, [browserSupportsSpeechRecognition]);

    useEffect(() => {
        if (transcript) {
            onTranscriptChange(transcript);
        }
    }, [transcript, onTranscriptChange]);

    const startListening = () => {
        setDeploymentError(null);
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
            .catch(error => {
                console.error('Start listening error:', error);
                setDeploymentError('SPEECH_SERVICE_UNAVAILABLE');
            });
    };

    const stopListening = () => {
        SpeechRecognition.stopListening().catch(error => {
            console.error('Stop listening error:', error);
        });
    };

    const toggleListening = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

    if (!isClient) {
        return (
            <div className="text-sm text-gray-500 mt-1">
                Loading voice input...
            </div>
        );
    }

    if (!browserSupportsSpeechRecognition) {
        return (
            <div className="text-sm text-amber-600 mt-1 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                Voice input is not supported in your browser. Please use Chrome for best experience.
            </div>
        );
    }

    if (deploymentError === 'PERMISSION_DENIED') {
        return (
            <div className="text-sm text-amber-600 mt-1">
                Microphone access is blocked. Please allow microphone access to use voice input.
                <button
                    onClick={() => window.location.reload()}
                    className="ml-2 text-purple-600 hover:text-purple-800 underline"
                >
                    Reload after granting permission
                </button>
            </div>
        );
    }

    if (deploymentError === 'SPEECH_SERVICE_UNAVAILABLE') {
        return (
            <div className="text-sm text-amber-600 mt-1">
                Speech service is temporarily unavailable in deployment environment.
                Please try again later or use manual input.
            </div>
        );
    }

    return (
        <div className="flex items-center mt-2">
            <button
                type="button"
                onClick={toggleListening}
                disabled={disabled || !isMicrophoneAvailable}
                className={`p-2 rounded-full mr-2 ${listening
                    ? 'bg-red-100 text-red-600'
                    : 'bg-purple-100 text-purple-600'
                    } hover:opacity-80 transition-all ${disabled || !isMicrophoneAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                            Listening... Speak clearly
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

export default DeploymentVoiceInput;