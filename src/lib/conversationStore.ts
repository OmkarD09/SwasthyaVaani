export interface UnifiedMessage {
  id: string;
  role: 'patient' | 'assistant';
  content: string;
  mode: 'voice' | 'text';
  timestamp: string;
  category?: string;
  questionId?: string;
}

export interface PatientAnswers {
  chief_complaint?: string;
  onset?: string;
  severity?: string;
  radiation?: string;
  associated?: string;
  associated_symptoms?: string;
  history?: string;
  medications?: string;
  daily_impact?: string;
  symptoms?: string;
  duration?: string;
  [key: string]: string | undefined;
}

export interface ExtractedClinicalSummary {
  chiefConcern: string;
  symptoms: string[];
  duration: string | null;
  severity: string | null;
  radiation: string | null;
  associatedSymptoms: string | null;
  medicalHistory: string | null;
  dailyImpact: string | null;
  interactionModes: ('voice' | 'text')[];
  totalResponses: number;
}

const STORAGE_KEY_ANSWERS = 'swasthya_patient_answers';
const STORAGE_KEY_CONVERSATION = 'swasthya_unified_conversation';

/**
 * Retrieve all merged patient answers (from both text and voice interactions).
 */
export function getStoredAnswers(): PatientAnswers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANSWERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading patient answers:', e);
  }
  return {};
}

/**
 * Retrieve the full unified conversation transcript (voice transcripts + text messages).
 */
export function getUnifiedConversation(): UnifiedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATION);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading unified conversation:', e);
  }
  return [];
}

/**
 * Save a question-and-answer pair into the unified conversation store.
 * Supports both text and voice modes, merging into a unified structured dataset.
 */
export function recordIntakeAnswer(
  questionId: string,
  answerText: string,
  mode: 'voice' | 'text',
  category?: string,
  questionText?: string
): void {
  const trimmed = answerText.trim();
  if (!trimmed) return;

  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Update structured answers dictionary
  const currentAnswers = getStoredAnswers();
  currentAnswers[questionId] = trimmed;

  // Normalize aliases
  if (questionId === 'associated_symptoms' && !currentAnswers.associated) {
    currentAnswers.associated = trimmed;
  }
  if (questionId === 'associated' && !currentAnswers.associated_symptoms) {
    currentAnswers.associated_symptoms = trimmed;
  }
  if (questionId === 'duration' && !currentAnswers.onset) {
    currentAnswers.onset = trimmed;
  }
  if (questionId === 'medications' && !currentAnswers.history) {
    currentAnswers.history = trimmed;
  }

  try {
    localStorage.setItem(STORAGE_KEY_ANSWERS, JSON.stringify(currentAnswers));
  } catch (e) {
    console.warn('Error writing answers:', e);
  }

  // 2. Append to unified conversation transcript
  const conversation = getUnifiedConversation();

  if (questionText) {
    // Check if question already recorded to avoid duplicate assistant messages
    const lastMsg = conversation[conversation.length - 1];
    if (!lastMsg || lastMsg.content !== questionText) {
      conversation.push({
        id: `q-${questionId}-${Date.now()}`,
        role: 'assistant',
        content: questionText,
        mode,
        timestamp: now,
        category,
        questionId,
      });
    }
  }

  conversation.push({
    id: `ans-${questionId}-${Date.now()}`,
    role: 'patient',
    content: trimmed,
    mode,
    timestamp: now,
    category,
    questionId,
  });

  try {
    localStorage.setItem(STORAGE_KEY_CONVERSATION, JSON.stringify(conversation));
  } catch (e) {
    console.warn('Error writing unified conversation:', e);
  }
}

/**
 * Generate a concise, structured AI clinical summary from both voice and text data.
 * Adheres to safety rules: only includes information actually provided by the patient.
 */
export function buildClinicalSummary(
  customAnswers?: PatientAnswers,
  customConversation?: UnifiedMessage[]
): ExtractedClinicalSummary {
  const answers = customAnswers || getStoredAnswers();
  const conversation = customConversation || getUnifiedConversation();

  // Detect which interaction modes were used
  const modesSet = new Set<'voice' | 'text'>();
  conversation.forEach((msg) => modesSet.add(msg.mode));
  const interactionModes = Array.from(modesSet);

  // Chief concern & symptoms
  const chiefConcern =
    answers.chief_complaint ||
    answers.symptoms ||
    (conversation.find((m) => m.role === 'patient')?.content) ||
    'Not provided';

  // Gather symptoms list from answers
  const symptoms: string[] = [];
  if (answers.chief_complaint) symptoms.push(answers.chief_complaint);
  if (answers.associated_symptoms || answers.associated) {
    symptoms.push(answers.associated_symptoms || answers.associated || '');
  }
  if (answers.radiation) symptoms.push(`Location: ${answers.radiation}`);

  // Duration & Timeline
  const duration = answers.onset || answers.duration || null;

  // Severity
  const severity = answers.severity || null;

  // Location / Radiation
  const radiation = answers.radiation || null;

  // Associated symptoms
  const associatedSymptoms = answers.associated_symptoms || answers.associated || null;

  // Medical history / Medications
  const medicalHistory = answers.history || answers.medications || null;

  // Daily impact
  const dailyImpact = answers.daily_impact || null;

  const totalResponses = conversation.filter((m) => m.role === 'patient').length;

  return {
    chiefConcern,
    symptoms: symptoms.filter(Boolean),
    duration,
    severity,
    radiation,
    associatedSymptoms,
    medicalHistory,
    dailyImpact,
    interactionModes: interactionModes.length > 0 ? interactionModes : ['text'],
    totalResponses,
  };
}
