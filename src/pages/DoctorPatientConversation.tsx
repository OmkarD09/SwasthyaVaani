import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { RefreshCw } from 'lucide-react';
import { usePatientRecord } from '../hooks/usePatientRecord';
import { PatientRecordShell } from '../components/doctor/PatientRecordShell';
import { PatientContextHeader } from '../components/doctor/PatientContextHeader';
import { ConversationTimeline } from '../components/doctor/ConversationTimeline';
import { type ConversationExchange } from '../components/doctor/ConversationMessage';
import { getUnifiedConversation, getStoredAnswers } from '../lib/conversationStore';

export function DoctorPatientConversation() {
  const params = useParams<{ id: string }>();
  const patientId = params?.id || 'pat_001';

  const { patientDetail, loading, confirmed } = usePatientRecord(patientId);
  const [exchanges, setExchanges] = useState<ConversationExchange[]>([]);

  useEffect(() => {
    // 1. Build exchanges from unified store
    let unified: any[] = [];
    try {
      unified = getUnifiedConversation() || [];
    } catch {}

    if (unified && unified.length > 0) {
      const builtExchanges: ConversationExchange[] = [];
      let pendingQuestion = 'What symptoms or concerns bring you in today?';
      let pendingCategory = 'Clinical Intake';

      unified.forEach((msg, idx) => {
        if (msg.role === 'assistant') {
          pendingQuestion = msg.content;
          pendingCategory = msg.category || 'Intake Question';
        } else if (msg.role === 'patient') {
          builtExchanges.push({
            id: msg.id || `exch-${idx}`,
            questionId: msg.questionId,
            category: pendingCategory,
            questionText: pendingQuestion,
            patientResponse: msg.content,
            originalPatientText: msg.content,
            originalLanguage: 'Hindi',
            inputMode: msg.mode || 'voice',
            timestamp: msg.timestamp || 'Just now',
          });
        }
      });

      if (builtExchanges.length > 0) {
        setExchanges(builtExchanges);
        return;
      }
    }

    // 2. Check voice history from localStorage
    try {
      const rawVoice = localStorage.getItem('swasthya_voice_history');
      if (rawVoice) {
        const voiceItems = JSON.parse(rawVoice);
        if (Array.isArray(voiceItems) && voiceItems.length > 0) {
          setExchanges(
            voiceItems.map((v, idx) => ({
              id: `voice-${idx}`,
              category: v.category || 'Voice Intake',
              questionText: v.questionText || 'Clinical Question',
              patientResponse: v.answerText,
              originalPatientText: v.answerText,
              originalLanguage: 'Hindi',
              inputMode: 'voice',
              audioUrl: v.audioUrl,
              timestamp: 'Recorded Today',
            }))
          );
          return;
        }
      }
    } catch {}

    // 3. Fallback rich multi-modal intake conversation for demonstration
    setExchanges([
      {
        id: 'ex-1',
        category: 'Chief Health Concern',
        questionText:
          'Hello! I am SwasthyaVaani, your AI health assistant. What main symptom or health concern brings you in today?',
        patientResponse:
          'Severe crushing chest pressure radiating down my left arm.',
        originalPatientText:
          'मुझे सीने में बहुत तेज दबाव और दर्द हो रहा है जो बाएं हाथ तक जा रहा है।',
        originalLanguage: 'Hindi',
        inputMode: 'voice',
        timestamp: '10:42 AM',
        isImportant: true,
      },
      {
        id: 'ex-2',
        category: 'Onset & Duration',
        questionText:
          'When did this chest pressure start, and was it sudden or gradual?',
        patientResponse:
          'Started suddenly about 2 hours ago after climbing the stairs.',
        originalPatientText:
          'यह लगभग 2 घंटे पहले अचानक शुरू हुआ जब मैं सीढ़ियां चढ़ रहा था।',
        originalLanguage: 'Hindi',
        inputMode: 'voice',
        timestamp: '10:43 AM',
      },
      {
        id: 'ex-3',
        category: 'Pain Severity Scale',
        questionText:
          'On a scale from 1 (mild) to 10 (unbearable), how severe is the chest discomfort right now?',
        patientResponse:
          'It is about an 8 out of 10. Feels very tight like a heavy weight.',
        originalPatientText:
          'यह 10 में से लगभग 8 है। बहुत भारी दबाव जैसा महसूस हो रहा है।',
        originalLanguage: 'Hindi',
        inputMode: 'voice',
        timestamp: '10:44 AM',
      },
      {
        id: 'ex-4',
        category: 'Associated Symptoms',
        questionText:
          'Are you noticing any other symptoms like difficulty breathing, sweating, nausea, or dizziness?',
        patientResponse:
          'Yes, cold sweats and shortness of breath when trying to lie flat.',
        originalPatientText:
          'हाँ, ठंडा पसीना आ रहा है और सीधा लेटने पर सांस लेने में तकलीफ होती है।',
        originalLanguage: 'Hindi',
        inputMode: 'voice',
        timestamp: '10:45 AM',
        isImportant: true,
      },
      {
        id: 'ex-5',
        category: 'Medications & Health History',
        questionText:
          'Do you take any regular medicines for blood pressure, sugar, or heart conditions?',
        patientResponse:
          'Taking Telmisartan 40mg daily for high blood pressure for the past 3 years.',
        originalPatientText:
          'पिछले 3 साल से हाई ब्लड प्रेशर के लिए रोजाना टेल्मिसार्टन 40mg ले रहा हूँ।',
        originalLanguage: 'Hindi',
        inputMode: 'text',
        timestamp: '10:46 AM',
      },
    ]);
  }, [patientId]);

  if (loading || !patientDetail) {
    return (
      <PatientRecordShell patientId={patientId}>
        <div className="flex h-96 items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-sm text-[#5f786d]">
            <RefreshCw className="animate-spin" size={20} /> Loading conversation dialog…
          </div>
        </div>
      </PatientRecordShell>
    );
  }

  const cs = patientDetail?.clinical_state || {};

  return (
    <PatientRecordShell patientId={patientId}>
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        {/* Patient Context Header */}
        <PatientContextHeader
          token={patientDetail.token}
          patientName={patientDetail.patient_name}
          patientAge={patientDetail.patient_age}
          patientGender={patientDetail.patient_gender}
          patientId={patientDetail.patient_id}
          reviewStatus={patientDetail.review_status}
          confirmed={confirmed}
          confidence={cs.confidence}
        />

        {/* Complete Chronological Conversation Timeline with [All] [Text] [Voice] Filter */}
        <ConversationTimeline exchanges={exchanges} />
      </div>
    </PatientRecordShell>
  );
}

export default DoctorPatientConversation;
