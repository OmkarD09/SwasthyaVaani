import type { LanguageCode } from '../i18n';

export interface IntakeQuestion {
  id: string;
  category: 'concern' | 'duration' | 'severity' | 'history' | 'associated';
  prompt: Record<LanguageCode, string>;
  placeholder: Record<LanguageCode, string>;
}

export interface IntakeAnswer {
  questionId: string;
  questionText: string;
  category: string;
  answerText: string;
}

export interface IntakeSession {
  language: LanguageCode;
  answers: Record<string, string>; // questionId -> answerText
  hasRecords: boolean;
  uploadedRecordName?: string;
  completedAt?: string;
}

export const DEFAULT_QUESTIONS: IntakeQuestion[] = [
  {
    id: 'chief_concern',
    category: 'concern',
    prompt: {
      en: 'What is the main problem you are experiencing today?',
      hi: 'आज आप किस मुख्य समस्या का सामना कर रहे हैं?',
      mr: 'आज तुम्हाला मुख्यत्वे कोणता त्रास जाणवत आहे?',
    },
    placeholder: {
      en: 'e.g. Cough and throat irritation, headache, body pain...',
      hi: 'उदा. खांसी और गले में खराश, सिरदर्द, बदन दर्द...',
      mr: 'उदा. खोकला आणि घशात खवखव, डोकेदुखी, अंगदुखी...',
    },
  },
  {
    id: 'duration',
    category: 'duration',
    prompt: {
      en: 'How long have you been having this problem?',
      hi: 'आपको यह समस्या कितने समय से हो रही है?',
      mr: 'तुम्हाला हा त्रास किती दिवसांपासून होत आहे?',
    },
    placeholder: {
      en: 'e.g. 2 days, about a week, since yesterday morning...',
      hi: 'उदा. 2 दिन, लगभग एक सप्ताह, कल सुबह से...',
      mr: 'उदा. २ दिवस, सुमारे एक आठवडा, काल सकाळपासून...',
    },
  },
  {
    id: 'severity',
    category: 'severity',
    prompt: {
      en: 'How severe is the discomfort or pain, and is it getting worse?',
      hi: 'तकलीफ या दर्द कितना अधिक है, और क्या यह बढ़ रहा है?',
      mr: 'त्रास किंवा वेदना किती तीव्र आहे, आणि ती वाढत आहे का?',
    },
    placeholder: {
      en: 'e.g. Moderate pain, worse at night, mild but constant...',
      hi: 'उदा. मध्यम दर्द, रात में अधिक, हल्का लेकिन लगातार...',
      mr: 'उदा. मध्यम वेदना, रात्री जास्त, हलका पण सतत...',
    },
  },
  {
    id: 'associated_symptoms',
    category: 'associated',
    prompt: {
      en: 'Are there any other symptoms you have noticed?',
      hi: 'क्या आपने कोई अन्य लक्षण भी महसूस किए हैं?',
      mr: 'तुम्हाला इतर काही लक्षणे जाणवत आहेत का?',
    },
    placeholder: {
      en: 'e.g. Mild fever, feeling weak, loss of appetite, none...',
      hi: 'उदा. हल्का बुखार, कमजोरी, भूख न लगना, कोई नहीं...',
      mr: 'उदा. हलका ताप, अशक्तपणा, भूक न लागणे, काही नाही...',
    },
  },
  {
    id: 'medical_history',
    category: 'history',
    prompt: {
      en: 'Do you take any regular medicines or have any known allergies/conditions?',
      hi: 'क्या आप कोई नियमित दवा लेते हैं या कोई एलर्जी/पुरानी बीमारी है?',
      mr: 'तुम्ही कोणतीही नियमित औषधे घेत आहात का किंवा काही ॲलर्जी/आजार आहे का?',
    },
    placeholder: {
      en: 'e.g. Blood pressure medicine, dust allergy, none...',
      hi: 'उदा. बीपी की दवा, धूल से एलर्जी, कोई नहीं...',
      mr: 'उदा. रक्तदाबाचे औषध, धुळीची ॲलर्जी, काही नाही...',
    },
  },
];

const INTAKE_STORAGE_KEY = 'sv_active_intake_session';

export const intakeApi = {
  getQuestions: async (): Promise<IntakeQuestion[]> => {
    return DEFAULT_QUESTIONS;
  },

  getSession: async (): Promise<IntakeSession | null> => {
    try {
      const stored = localStorage.getItem(INTAKE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  },

  saveSession: async (session: IntakeSession): Promise<void> => {
    try {
      localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  },

  clearSession: async (): Promise<void> => {
    try {
      localStorage.removeItem(INTAKE_STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
