import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Keyboard,
  Bot,
  AlertCircle,
  Clock,
  Waves
} from 'lucide-react';
import { recordIntakeAnswer } from '../lib/conversationStore';

const INITIAL_INTAKE_GREETING: Record<string, string> = {
  English: 'Hello! I am SwasthyaVaani, your AI health assistant. What main symptom or health concern brings you in today?',
  'हिन्दी': 'नमस्ते! मैं स्वास्थ्यवाणी हूँ, आपका AI स्वास्थ्य सहायक। आज आपको क्या मुख्य तकलीफ या लक्षण महसूस हो रहे हैं?',
  'मराठी': 'नमस्कार! मी स्वास्थ्यवाणी आहे, तुमचा AI आरोग्य सहाय्यक. आज तुम्हाला कोणता मुख्य त्रास किंवा लक्षण जाणवत आहे?',
  'বাংলা': 'নমস্কার! আমি স্বাস্থ্যবাণী, আপনার এআই স্বাস্থ্য সহকারী। আজকে আপনার প্রধান समस्या বা উপসর্গ কী?',
  'తెలుగు': 'నమస్కారం! నేను స్వాస్థ్యవాణి, మీ AI ఆరోగ్య సహాయకుడిని. ఈ రోజు మీకు ఉన్న ప్రధాన సమస్య లేదా లక్షణం ఏమిటి?',
  'தமிழ்': 'வணக்கம்! நான் ஸ்வாஸ்த்யவாணி, உங்கள் AI சுகாதார உதவியாளர். இன்று உங்களுக்கு என்ன முக்கிய அறிகுறி அல்லது பிரச்சனை உள்ளது?',
  'ગુજરાતી': 'નમસ્તે! હું સ્વાસ્થ્યવાણી છું, તમારો AI હેલ્થ આસિસ્ટન્ટ. આજે તમને મુખ્ય કઈ તકલીફ કે લક્ષણ છે?',
  'ಕನ್ನಡ': 'ನಮಸ್ಕಾರ! ನಾನು ಸ್ವಾಸ್ಥ್ಯವಾಣಿ, ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಅಥವಾ ಲಕ್ಷಣವಿದೆ?',
  'മലയാളം': 'നമസ്കാരം! ഞാൻ സ്വാസ്ഥ്യവാണി, നിങ്ങളുടെ AI ഹെൽത്ത് അസിസ്റ്റന്റ്. ഇന്ന് നിങ്ങൾക്ക് എന്താണ് പ്രധാന ബുദ്ധിമുട്ട്?',
  'ਪੰਜਾਬੀ': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਵਾਸਥਿਆਵਾਣੀ ਹਾਂ, ਤੁਹਾਡਾ AI ਸਿਹਤ ਸਹਾਇਕ। ਅੱਜ ਤੁਹਾਨੂੰ ਕਿਹੜੀ ਮੁੱਖ ਸਮੱਸਿਆ ਜਾਂ ਲੱਛਣ ਹੈ?',
  'ଓଡ଼ିଆ': 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟବାଣୀ, ଆପଣଙ୍କ AI ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ। ଆଜି ଆପଣଙ୍କର ମୁଖ୍ୟ ଲକ୍ଷଣ କଣ?',
  'অসমীয়া': 'নমস্কাৰ! মই স্বাস্থ্যবাণী, আপোনাৰ AI স্বাস্থ্য সহায়ক। আজি আপোনাৰ মূল সমস্যা বা লক্ষণ কি?',
  'اردو': 'ہیلو! میں سواستھیہ وانی ہوں، آپ کا AI ہیلتھ اسسٹنٹ۔ آج آپ کو کیا بنیادی شکایت یا علامت ہے؟',
};

const SUGGESTED_CHIPS: Record<string, string[]> = {
  English: ['Severe Chest Pain', 'High Fever & Chills', 'Persistent Cough', 'Stomach Cramps', 'Shortness of Breath'],
  'हिन्दी': ['सीने में तेज दर्द', 'तेज बुखार और ठंड', 'लगातार खांसी', 'पेट में दर्द', 'सांस लेने में तकलीफ'],
  'मराठी': ['छातीत तीव्र वेदना', 'तीव्र ताप आणि थंडी', 'सतत खोकला', 'पोटात दुखणे', 'दम लागणे'],
  'বাংলা': ['বুকে তীব্র ব্যথা', 'তীব্র জ্বর এবং কাঁপুনি', 'ক্রমাগত কাশি', 'পেটে ব্যথা', 'শ্বাসকষ্ট'],
  'తెలుగు': ['ఛాతీలో తీవ్రమైన నొప్పి', 'తీవ్రమైన జ్వరం', 'ఎడతెగని దగ్గు', 'కడుపు నొప్పి', 'శ్వాస ఆడకపోవడం'],
  'தமிழ்': ['மார்பில் கடுமையான வலி', 'காய்ச்சல் & குளிர்', 'தொடர் இருமல்', 'வயிற்று வலி', 'மூச்சுத்திணறல்'],
  'ગુજરાતી': ['છાતીમાં તીવ્ર દુખાવો', 'તાવ અને ઠંડી', 'સતત ખાંસી', 'પેટમાં દુખાવો', 'શ્વાસ લેવામાં તકલીફ'],
  'ಕನ್ನಡ': ['ಎದೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು', 'ತೀವ್ರ ಜ್ವರ', 'ನಿರಂತರ ಕೆಮ್ಮು', 'ಹೊಟ್ಟೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ'],
  'മലയാളം': ['നെഞ്ചിൽ കഠിനമായ വേദന', 'പനിയും വിറയലും', 'വിട്ടുമാറാത്ത ചുമ', 'വയറുവേദന', 'ശ്വാസതടസ്സം'],
  'ਪੰਜਾਬੀ': ['ਛਾਤੀ ਵਿੱਚ ਤੇਜ਼ ਦਰਦ', 'ਤੇਜ਼ ਬੁਖਾਰ', 'ਲਗਾਤਾਰ ਖੰਘ', 'ਪੇਟ ਦਰਦ', 'ਸਾਹ ਚੜ੍ਹਨਾ'],
  'ଓଡ଼ିଆ': ['ଛାତିରେ ପ୍ରବଳ ଯନ୍ତ୍ରଣା', 'ଜ୍ୱର ଓ ଥଣ୍ଡା', 'କାଶ', 'ପେଟ ଯନ୍ତ୍ରଣା', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ'],
  'অসমীয়া': ['বুকুত তীব্ৰ বিষ', 'জ্বৰ আৰু ঠাণ্ডা', 'কাহ', 'পেটৰ বিষ', 'উশাহৰ সমস্যা'],
  'اردو': ['سینے میں شدید درد', 'تیز بخار اور سردی', 'مسلسل کھانسی', 'پیٹ کا درد', 'سانस پھولنا'],
};

function getLanguageCodeTag(lang: string): string {
  switch (lang) {
    case 'हिन्दी':
    case 'Hindi':
      return 'hi-IN';
    case 'मराठी':
    case 'Marathi':
      return 'mr-IN';
    case 'বাংলা':
    case 'Bengali':
      return 'bn-IN';
    case 'தமிழ்':
    case 'Tamil':
      return 'ta-IN';
    case 'తెలుగు':
    case 'Telugu':
      return 'te-IN';
    case 'ગુજરાતી':
    case 'Gujarati':
      return 'gu-IN';
    case 'ಕನ್ನಡ':
    case 'Kannada':
      return 'kn-IN';
    case 'മലയാളം':
    case 'Malayalam':
      return 'ml-IN';
    case 'ਪੰਜਾਬੀ':
    case 'Punjabi':
      return 'pa-IN';
    case 'ଓଡ଼ିଆ':
    case 'Odia':
      return 'or-IN';
    case 'অসমীয়া':
    case 'Assamese':
      return 'as-IN';
    case 'اردو':
    case 'Urdu':
      return 'ur-IN';
    default:
      return 'en-IN';
  }
}

export function PatientVoiceChat({
  language,
  patientName = 'Ananya Sharma',
  patientAge = '34',
  onComplete,
  onSwitchToText,
}: {
  language: string;
  patientName?: string;
  patientAge?: string;
  onComplete: () => void;
  onSwitchToText: () => void;
}) {
  const currentLang = language || 'English';
  const langTag = getLanguageCodeTag(currentLang);
  const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';

  const MAX_QUESTIONS = 10;
  const [questionCount, setQuestionCount] = useState(1);
  const [activeQuestionText, setActiveQuestionText] = useState(
    INITIAL_INTAKE_GREETING[currentLang] || INITIAL_INTAKE_GREETING['English']
  );
  const [activeCategory, setActiveCategory] = useState('Chief Complaint');

  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [finishReason, setFinishReason] = useState<string>('');

  const [intakeSessionId, setIntakeSessionId] = useState<string | null>(null);
  const [currentQuestionEventId, setCurrentQuestionEventId] = useState<string | null>(null);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  // History of completed Q&A pairs
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ questionText: string; answerText: string; category: string }>
  >([]);

  const liveTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const silenceIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const isComponentMounted = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);

  // 1. Initialize Intake Session in Backend
  useEffect(() => {
    isComponentMounted.current = true;
    async function initSession() {
      try {
        const res = await fetch('/api/v1/intakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 35,
            patient_gender: 'FEMALE',
            language_code: langCode,
            workflow_type: 'GENERAL_CLINICAL',
            interaction_mode: 'VOICE',
            consent_given: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isComponentMounted.current) {
            setIntakeSessionId(data.id);
            localStorage.setItem('swasthya_active_intake_id', data.id);
            localStorage.setItem('swasthya_active_token', data.token || '');
          }
        }
      } catch (err) {
        console.warn('[SwasthyaVaani Voice] Backend session init notice:', err);
      }
    }
    initSession();

    return () => {
      isComponentMounted.current = false;
      stopSpeaking();
      stopListening();
    };
  }, [patientName, patientAge, langCode]);

  // 2. Automatically Speak initial or updated question
  useEffect(() => {
    if (!isFinished && activeQuestionText) {
      speakQuestionText(activeQuestionText);
    }
  }, [activeQuestionText, isFinished]);

  // 3. Spoken Audio Synthesis (Sarvam AI Bulbul v3 with Web Speech fallback)
  const speakQuestionText = async (text: string) => {
    stopSpeaking();
    stopListening();
    setIsSpeakingAi(true);

    try {
      // Try Sarvam AI TTS Endpoint
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language_code', langCode);

      const ttsRes = await fetch('/api/v1/speech/tts', {
        method: 'POST',
        body: formData,
      });

      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        if (ttsData.audio_base64 && isComponentMounted.current) {
          const audio = new Audio(`data:audio/wav;base64,${ttsData.audio_base64}`);
          currentAudioElementRef.current = audio;

          audio.onended = () => {
            if (isComponentMounted.current && !isFinished) {
              setIsSpeakingAi(false);
              // Hands-Free: Start listening automatically when AI finishes speaking
              startListening();
            }
          };
          audio.onerror = () => {
            fallbackWebSpeechTTS(text);
          };
          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('[VoiceTTS] Sarvam TTS fallback to Web Speech:', err);
    }

    // Fallback to Browser Web Speech API
    fallbackWebSpeechTTS(text);
  };

  const fallbackWebSpeechTTS = (text: string) => {
    if (!('speechSynthesis' in window)) {
      if (isComponentMounted.current) {
        setIsSpeakingAi(false);
        startListening();
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langTag;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith(langTag.toLowerCase().slice(0, 2))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        if (isComponentMounted.current) setIsSpeakingAi(true);
      };
      utterance.onend = () => {
        if (isComponentMounted.current && !isFinished) {
          setIsSpeakingAi(false);
          // Hands-Free: Automatically start listening after speaking
          startListening();
        }
      };
      utterance.onerror = () => {
        if (isComponentMounted.current) {
          setIsSpeakingAi(false);
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis notice:', err);
      if (isComponentMounted.current) {
        setIsSpeakingAi(false);
        startListening();
      }
    }
  };

  const stopSpeaking = () => {
    if (currentAudioElementRef.current) {
      try {
        currentAudioElementRef.current.pause();
        currentAudioElementRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingAi(false);
  };

  // 4. Dynamic Audio Waveform Visualizer
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height - 8) + 4;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#c98e20');
        gradient.addColorStop(1, '#eaba61');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // 5. Automatic Silence Detection (3.5s pause auto-submit)
  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);

    const currentText = liveTranscriptRef.current.trim();
    if (!currentText || currentText.length < 3) {
      setSilenceCountdown(null);
      return;
    }

    let remaining = 3;
    setSilenceCountdown(remaining);

    silenceIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setSilenceCountdown(remaining);
      } else {
        clearInterval(silenceIntervalRef.current);
        setSilenceCountdown(null);
      }
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      const finalRecorded = liveTranscriptRef.current.trim();
      if (finalRecorded.length >= 3 && !isSubmittingRef.current) {
        handleAnswerSubmit(finalRecorded);
      }
    }, 3500);
  };

  // 6. Start Hands-Free Continuous Listening
  const startListening = async () => {
    if (isFinished || isSubmittingRef.current) return;

    stopSpeaking();
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setSilenceCountdown(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langTag;

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          const cleanText = text.trim();
          liveTranscriptRef.current = cleanText;
          setLiveTranscript(cleanText);

          // Whenever speech is detected, trigger/reset the 3.5s silence countdown
          if (cleanText.length >= 2) {
            resetSilenceTimer();
          }
        };

        recognition.onend = () => {
          // If recognition naturally pauses and patient has spoken text, auto-submit
          const recorded = liveTranscriptRef.current.trim();
          if (recorded.length >= 3 && !isSubmittingRef.current && !isSpeakingAi) {
            handleAnswerSubmit(recorded);
          } else if (!isFinished && !isSpeakingAi && !isSubmittingRef.current && isComponentMounted.current) {
            // Keep microphone alive for continuous hands-free listening
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization notice:', err);
      }
    }

    // Media Stream Waveform Visualizer
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          drawWaveform();
        }
      }
    } catch (err) {
      console.warn('Microphone stream access note:', err);
    }

    setIsListening(true);
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    setSilenceCountdown(null);

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }

    setIsListening(false);
  };

  // 7. Submit Answer to Backend Adaptive Engine & Determine Next Dynamic Question
  const handleAnswerSubmit = async (overrideAnswer?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    stopListening();
    stopSpeaking();

    const answerToSubmit = (overrideAnswer || liveTranscriptRef.current || liveTranscript).trim();
    if (!answerToSubmit) {
      isSubmittingRef.current = false;
      return;
    }

    setIsProcessing(true);

    // Save to conversation history
    setConversationHistory((prev) => [
      ...prev,
      {
        category: activeCategory,
        questionText: activeQuestionText,
        answerText: answerToSubmit,
      },
    ]);

    // Record into unified conversation store (for Doctor Review & Patient Summary pages)
    recordIntakeAnswer(
      `q_${questionCount}`,
      answerToSubmit,
      'voice',
      activeCategory,
      activeQuestionText
    );

    setLiveTranscript('');
    liveTranscriptRef.current = '';

    try {
      const activeId = intakeSessionId || localStorage.getItem('swasthya_active_intake_id');

      if (activeId) {
        const res = await fetch(`/api/v1/intakes/${activeId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: answerToSubmit,
            input_mode: 'VOICE',
            language_code: langCode,
            audio_duration_seconds: 4.0,
            question_event_id: currentQuestionEventId || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const decision = data.decision;
          const updatedState = data.clinical_state;
          const nextQEventId = data.question_event_id || decision?.question_event_id || null;
          setCurrentQuestionEventId(nextQEventId);

          if (updatedState?.red_flags?.length > 0) {
            setRedFlags(updatedState.red_flags);
          }

          const nextQCount = questionCount + 1;
          setQuestionCount(nextQCount);

          // Check if AI Engine says STOP or reached max 10 questions
          if (decision?.action === 'STOP' || nextQCount > MAX_QUESTIONS) {
            setIsFinished(true);
            setFinishReason(decision?.reason || 'Clinical intake completed.');

            const completionSpeech =
              currentLang === 'हिन्दी'
                ? 'धन्यवाद! आपकी स्वास्थ्य संबंधी जानकारी दर्ज कर ली गई है। अब आप अपनी पुरानी पर्ची या रिपोर्ट जोड़ सकते हैं।'
                : currentLang === 'मराठी'
                ? 'धन्यवाद! तुमची आरोग्य माहिती नोंदवली गेली आहे. आता तुम्ही तुमची कागदपत्रे जोडू शकता.'
                : 'Thank you! Your clinical information has been recorded. You can now attach previous documents or proceed.';

            speakQuestionText(completionSpeech);
            setIsProcessing(false);
            isSubmittingRef.current = false;
            return;
          }

          // If AI Engine says ASK next dynamic question
          if (decision?.action === 'ASK' && decision?.question) {
            const nextText = decision.question;
            const nextTarget = decision.target_field || 'Clinical Detail';
            setActiveCategory(nextTarget.toUpperCase().replace('_', ' '));
            setActiveQuestionText(nextText);
            setIsProcessing(false);
            isSubmittingRef.current = false;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Backend adaptive answer processing note:', err);
    }

    // Fallback: If offline or rate-limited, advance question count
    const nextQCount = questionCount + 1;
    setQuestionCount(nextQCount);

    if (nextQCount > MAX_QUESTIONS) {
      setIsFinished(true);
      const completionSpeech =
        currentLang === 'हिन्दी'
          ? 'धन्यवाद! आपकी जानकारी दर्ज कर ली गई है।'
          : 'Thank you! Your information has been recorded.';
      speakQuestionText(completionSpeech);
    } else {
      const fallbackQuestions = [
        currentLang === 'हिन्दी' ? 'यह तकलीफ आपको कितने दिनों या हफ्तों से है?' : 'How long have you been experiencing this discomfort?',
        currentLang === 'हिन्दी' ? '1 से 10 के पैमाने पर दर्द या परेशानी कितनी तेज है?' : 'On a scale of 1 to 10, how severe is your pain or discomfort?',
        currentLang === 'हिन्दी' ? 'क्या यह दर्द शरीर के किसी अन्य हिस्से में भी जा रहा है?' : 'Does the pain radiate to any other part of your body?',
        currentLang === 'हिन्दी' ? 'क्या इसके साथ चक्कर, सांस फूलना या बुखार है?' : 'Are you experiencing any other symptoms like fever or dizziness?'
      ];
      const nextFallback = fallbackQuestions[(nextQCount - 2) % fallbackQuestions.length];
      setActiveQuestionText(nextFallback);
    }

    setIsProcessing(false);
    isSubmittingRef.current = false;
  };

  const handleChipClick = (chipText: string) => {
    liveTranscriptRef.current = chipText;
    setLiveTranscript(chipText);
    handleAnswerSubmit(chipText);
  };

  return (
    <div className="kiosk-card voice-intake-container max-w-3xl mx-auto w-full">
      {/* Top Header & Adaptive Progress Counter */}
      <div className="flex items-center justify-between border-b border-[#e8ece7] pb-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#173e35]/10 text-[#173e35] text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles size={13} className="text-[#c98e20]" />
            AI Voice Intake · {currentLang}
          </span>
          <span className="text-xs font-medium text-[#5c726a]">
            Patient: <b>{patientName}</b> ({patientAge} yrs)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono ${
            isFinished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100/80 text-amber-900'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isFinished ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`} />
            {isFinished ? 'Intake Complete' : 'Active Clinical Intake'}
          </span>
        </div>
      </div>

      {/* Red Flag Alert Banner if Emergency Signals Detected */}
      {redFlags.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 animate-pulse" />
            <span className="text-xs font-semibold">
              Emergency Signal Flagged: High Priority Physician Triage Active
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-100 font-bold">
            Priority Queue
          </span>
        </div>
      )}

      {/* Active Question Box */}
      {!isFinished ? (
        <div className="bg-[#fcfdfa] border border-[#e2e7df] rounded-2xl p-6 shadow-sm mb-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#c98e20] flex items-center gap-1.5">
              <Bot size={15} />
              AI Clinical Inquiry · {activeCategory}
            </span>

            {/* Live Automated Status Pill */}
            {isProcessing ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold bg-amber-100 px-3 py-1 rounded-full animate-pulse">
                <Sparkles size={13} className="animate-spin" />
                AI is thinking & analyzing...
              </span>
            ) : isSpeakingAi ? (
              <span className="flex items-center gap-1.5 text-xs text-[#1f5b4e] font-semibold bg-[#1f5b4e]/10 px-3 py-1 rounded-full animate-pulse">
                <Volume2 size={13} />
                AI Speaking question aloud...
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-100 px-3 py-1 rounded-full animate-pulse">
                <Mic size={13} />
                Listening to you... Speak freely
              </span>
            ) : null}
          </div>

          <h2 className="text-lg md:text-xl font-semibold text-[#173e35] leading-relaxed mb-4">
            {activeQuestionText}
          </h2>

          {/* Audio Waveform Canvas */}
          <div className="relative w-full h-14 bg-[#173e35]/5 rounded-xl flex items-center justify-center overflow-hidden mb-4 border border-[#e2e7df]">
            <canvas ref={canvasRef} width={600} height={56} className="w-full h-full" />
            {isSpeakingAi && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[#173e35] bg-white/60 backdrop-blur-xs font-semibold gap-2">
                <Waves size={16} className="text-[#c98e20] animate-pulse" />
                Listening will start automatically once question finishes speaking
              </div>
            )}
            {!isListening && !isSpeakingAi && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-[#5c726a] bg-white/70 backdrop-blur-xs font-medium">
                Automatic continuous conversation active
              </div>
            )}
          </div>

          {/* Live Transcript & Silence Auto-Submit Bar */}
          {isListening && (
            <div className="mb-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-sm flex items-start gap-2.5">
                <Mic size={16} className="text-emerald-600 mt-0.5 animate-bounce shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">
                    {liveTranscript || 'Listening... Please speak your answer freely.'}
                  </p>
                </div>
              </div>

              {/* Automatic 3-4 Second Pause Indicator */}
              {silenceCountdown !== null && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#c98e20] bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 font-semibold animate-pulse shadow-2xs">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-[#c98e20]" />
                    Pause detected! Moving to next question in <b>{silenceCountdown}s</b>...
                  </span>
                  <span className="text-[11px] text-[#5c726a] font-normal">(Keep speaking to continue)</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Click Answer Chips */}
          <div className="mb-5">
            <span className="text-xs font-medium text-[#5c726a] mb-2 block">
              Or Tap Quick Answer Suggestion:
            </span>
            <div className="flex flex-wrap gap-2">
              {(SUGGESTED_CHIPS[currentLang] || SUGGESTED_CHIPS['English']).map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f5f7f4] hover:bg-[#eaf1ec] text-[#173e35] border border-[#dce3da] hover:border-[#1f5b4e] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Controls Bar (Fully Automated, Re-read + Switch to Text) */}
          <div className="flex items-center justify-between pt-3 border-t border-[#eef2ec]">
            <button
              type="button"
              onClick={() => speakQuestionText(activeQuestionText)}
              disabled={isSpeakingAi || isProcessing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f5f7f4] hover:bg-[#eaf1ec] text-[#173e35] text-xs font-medium border border-[#dce3da] transition-all cursor-pointer disabled:opacity-50"
              title="Re-read Question Aloud"
            >
              <Volume2 size={14} />
              Re-listen Question
            </button>

            <button
              type="button"
              onClick={onSwitchToText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#5c726a] hover:text-[#173e35] hover:bg-[#f0f4ee] transition-all cursor-pointer"
            >
              <Keyboard size={13} />
              Switch to Text Chat
            </button>
          </div>
        </div>
      ) : (
        /* Completion State */
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-8 text-center mb-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#173e35] mb-2">
            Clinical Voice Intake Completed!
          </h3>
          <p className="text-sm text-[#5c726a] max-w-lg mx-auto mb-6">
            {finishReason || 'Minimum sufficient history successfully gathered and categorized for the physician.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1f5b4e] hover:bg-[#173e35] text-white font-semibold shadow-md transition-all cursor-pointer active:scale-95"
            >
              Continue to Document Upload & Confirmation
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Recorded Clinical Data Summary */}
      {conversationHistory.length > 0 && (
        <div className="border border-[#e2e7df] rounded-xl p-4 bg-white shadow-2xs mb-4">
          <span className="text-xs font-mono uppercase font-bold text-[#5c726a] block mb-2">
            Recorded Clinical Data Points ({conversationHistory.length})
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {conversationHistory.map((item, idx) => (
              <div key={idx} className="text-xs p-2.5 rounded-lg bg-[#f8faf7] border border-[#eef2ec]">
                <div className="flex items-center justify-between font-semibold text-[#173e35] mb-0.5">
                  <span>Q{idx + 1}: {item.category}</span>
                  <span className="text-[10px] text-[#5c726a] font-normal font-mono">Recorded</span>
                </div>
                <p className="text-[#3c544d] font-normal mt-0.5">"{item.answerText}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
