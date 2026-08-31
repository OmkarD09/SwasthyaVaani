import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ArrowRight, Mic, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { getKioskTranslation } from '../lib/kioskTranslations';
import { INTAKE_QUESTIONS_VOICE as INTAKE_QUESTIONS } from './PatientVoiceChat';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'patient';
  text: string;
  time: string;
  chips?: string[];
}

export function PatientTextChat({
  language,
  patientName = 'Ananya Sharma',
  patientAge = '34',
  onComplete,
  onSwitchToVoice,
}: {
  language: string;
  patientName?: string;
  patientAge?: string;
  onComplete: () => void;
  onSwitchToVoice: () => void;
}) {
  const currentLang = language || 'English';
  const t = getKioskTranslation(currentLang);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getLocalizedText = (dict: Record<string, string>) => {
    return dict[currentLang] || dict['English'] || Object.values(dict)[0];
  };

  const getLocalizedChips = (dict: Record<string, string[]>) => {
    return dict[currentLang] || dict['English'] || Object.values(dict)[0];
  };

  const initialQuestion = INTAKE_QUESTIONS[0];
  const initialAiMessage: ChatMessage = {
    id: 'msg-0',
    sender: 'ai',
    text: getLocalizedText(initialQuestion.question),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    chips: getLocalizedChips(initialQuestion.chips),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialAiMessage]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [intakeSessionId, setIntakeSessionId] = useState<string | null>(null);

  // Initialize Backend Session
  useEffect(() => {
    async function initSession() {
      try {
        const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';
        const res = await fetch('/api/v1/intakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 35,
            patient_gender: 'FEMALE',
            language_code: langCode,
            workflow_type: 'GENERAL_CLINICAL',
            interaction_mode: 'TEXT',
            consent_given: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIntakeSessionId(data.id);
        }
      } catch (err) {
        console.warn('[SwasthyaVaani Text] Backend session init note:', err);
      }
    }
    initSession();
  }, [patientName, patientAge, currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handlePatientResponse = async (answerText: string) => {
    if (!answerText.trim() || isThinking || isFinished) return;

    const trimmedAnswer = answerText.trim();
    const currentQ = INTAKE_QUESTIONS[currentStepIndex];
    const newAnswers = { ...answers, [currentQ.id]: trimmedAnswer };
    setAnswers(newAnswers);

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'patient',
      text: trimmedAnswer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);

    // Sync to Backend
    if (intakeSessionId) {
      try {
        const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';
        await fetch(`/api/v1/intakes/${intakeSessionId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: trimmedAnswer,
            input_mode: 'TEXT',
            language_code: langCode,
          }),
        });
      } catch (err) {
        console.warn('Backend answer sync note:', err);
      }
    }

    const nextIndex = currentStepIndex + 1;

    setTimeout(() => {
      if (nextIndex < INTAKE_QUESTIONS.length) {
        const nextQ = INTAKE_QUESTIONS[nextIndex];
        const nextAiMessage: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          text: getLocalizedText(nextQ.question),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chips: getLocalizedChips(nextQ.chips),
        };
        setMessages((prev) => [...prev, nextAiMessage]);
        setCurrentStepIndex(nextIndex);
        setIsThinking(false);
      } else {
        const completionText =
          currentLang === 'हिन्दी'
            ? 'धन्यवाद! आपकी सभी 6 जानकारियां रिकॉर्ड कर ली गई हैं। अब आप अपनी पुरानी पर्ची या रिपोर्ट अपलोड कर सकते हैं।'
            : currentLang === 'मराठी'
            ? 'धन्यवाद! तुमचे सर्व 6 प्रश्नांची उत्तरे नोंदवली गेली आहेत. आता तुम्ही तुमची कागदपत्रे जोडू शकता.'
            : currentLang === 'বাংলা'
            ? 'ধন্যবাদ! আপনার সমস্ত উত্তর রেকর্ড করা হয়েছে। এখন আপনি আপনার পূর্বের রিপোর্ট যুক্ত করতে পারেন।'
            : 'Thank you! All 6 clinical intake questions have been recorded. You can now proceed to attach any previous prescriptions or reports.';

        const finalAiMessage: ChatMessage = {
          id: `msg-final-${Date.now()}`,
          sender: 'ai',
          text: completionText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, finalAiMessage]);
        setIsFinished(true);
        setIsThinking(false);
      }
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePatientResponse(inputText);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setAnswers({});
    setIsFinished(false);
    setMessages([initialAiMessage]);
  };

  return (
    <div className="patient-chat-container">
      {/* Header with Switch to Voice */}
      <div className="chat-header">
        <div className="chat-title-group">
          <div className="ai-avatar-badge">
            <Sparkles size={16} className="sparkle-icon" />
          </div>
          <div>
            <h3>SwasthyaVaani Assistant</h3>
            <p className="chat-subtitle">
              Interactive clinical intake · {currentLang}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="switch-mode-btn"
            onClick={onSwitchToVoice}
            title="Switch to Voice Mode"
          >
            <Mic size={15} />
            <span>Voice mode</span>
          </button>
          <button
            type="button"
            className="chat-reset-btn"
            onClick={handleReset}
            title="Start over"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages-area">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message-row ${msg.sender === 'ai' ? 'ai-row' : 'patient-row'}`}
          >
            {msg.sender === 'ai' && (
              <div className="message-avatar ai-avatar">
                <Bot size={16} />
              </div>
            )}

            <div className={`message-bubble ${msg.sender === 'ai' ? 'ai-bubble' : 'patient-bubble'}`}>
              <div className="message-text">{msg.text}</div>
              <div className="message-time">{msg.time}</div>

              {/* Suggestion Chips */}
              {msg.chips && !isFinished && msg.id === messages[messages.length - 1]?.id && (
                <div className="chip-container">
                  {msg.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handlePatientResponse(chip)}
                      disabled={isThinking}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.sender === 'patient' && (
              <div className="message-avatar patient-avatar">
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="chat-message-row ai-row">
            <div className="message-avatar ai-avatar">
              <Bot size={16} />
            </div>
            <div className="message-bubble ai-bubble typing-bubble">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Completion Actions */}
      {!isFinished ? (
        <div className="chat-input-area">
          <input
            type="text"
            className="chat-text-input"
            placeholder={
              currentLang === 'हिन्दी'
                ? 'यहाँ अपना उत्तर लिखें या ऊपर दिए विकल्प चुनें...'
                : currentLang === 'मराठी'
                ? 'येथे तुमचे उत्तर लिहा किंवा वरील पर्याय निवडा...'
                : 'Type your answer or select an option above...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
            autoFocus
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={() => handlePatientResponse(inputText)}
            disabled={!inputText.trim() || isThinking}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="chat-finished-panel">
          <div className="finished-badge">
            <CheckCircle2 size={16} />
            <span>All 6 intake questions completed</span>
          </div>
          <button
            type="button"
            className="chat-proceed-btn"
            onClick={onComplete}
          >
            <span>Attach Medical Records</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
