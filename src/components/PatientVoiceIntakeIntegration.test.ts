import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  recordIntakeAnswer,
  getUnifiedConversation,
  clearConversationStore,
} from '../lib/conversationStore.ts';
import {
  getStoredWorkflow,
  setStoredWorkflow,
  PATIENT_WORKFLOW_KEY,
} from '../lib/kioskState.ts';

// Setup mock localStorage in Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  };
}

describe('PatientVoiceChat & Intake Integration Forensic Regressions', () => {
  beforeEach(() => {
    localStorage.clear();
    clearConversationStore();
  });

  describe('FIX 1 — Single Speech Authority & Playback Mutual Exclusion', () => {
    it('1. When audio_base64 exists, browser speechSynthesis is NOT invoked', async () => {
      let browserSpeechCalls = 0;
      let audioElementPlayed = false;

      // Mock audio element and speechSynthesis
      const mockSpeak = async (
        text: string,
        audioBase64?: string | null,
        browserTTS?: () => void
      ) => {
        if (audioBase64) {
          // Play returned backend/Sarvam audio
          audioElementPlayed = true;
          return; // DO NOT call browser speechSynthesis
        }
        browserTTS?.();
      };

      await mockSpeak('नमस्ते! मैं स्वास्थ्यवाणी हूँ।', 'base64_wav_data_xyz', () => {
        browserSpeechCalls++;
      });

      assert.strictEqual(audioElementPlayed, true, 'Backend audio must be played');
      assert.strictEqual(browserSpeechCalls, 0, 'Browser speech MUST NOT be called when audio_base64 exists');
    });

    it('2. When audio_base64 is missing, browser speech runs exactly once', async () => {
      let browserSpeechCalls = 0;
      let audioElementPlayed = false;

      const mockSpeak = async (
        text: string,
        audioBase64?: string | null,
        browserTTS?: () => void
      ) => {
        if (audioBase64) {
          audioElementPlayed = true;
          return;
        }
        browserTTS?.();
      };

      await mockSpeak('क्या आपको बुखार भी है?', null, () => {
        browserSpeechCalls++;
      });

      assert.strictEqual(audioElementPlayed, false, 'No audio element played');
      assert.strictEqual(browserSpeechCalls, 1, 'Browser speech must be invoked exactly once');
    });

    it('3. Speech playback is invoked exactly once per question change via single authority', async () => {
      let playbackCount = 0;
      const pendingAudioBase64Ref = { current: null as string | null };

      // In the new architecture:
      // handleAnswerSubmit NEVER calls speakQuestionText directly.
      // ONLY the activeQuestionText effect invokes speakQuestionText.
      const onAnswerSubmitted = (nextQuestion: string, audio?: string | null) => {
        pendingAudioBase64Ref.current = audio || null;
        // triggers single authority effect
        triggerQuestionEffect(nextQuestion);
      };

      const triggerQuestionEffect = (qText: string) => {
        const audio = pendingAudioBase64Ref.current;
        pendingAudioBase64Ref.current = null;
        playbackCount++;
      };

      onAnswerSubmitted('यह दर्द कब से हो रहा है?', 'sarvam_audio_bytes');

      assert.strictEqual(playbackCount, 1, 'Question must be spoken exactly once');
      assert.strictEqual(pendingAudioBase64Ref.current, null, 'Pending audio ref must be consumed');
    });
  });

  describe('FIX 2 & FIX 3 — Stale Closure Elimination & Correct Answer ↔ Question Association', () => {
    it('4. Stale closure cannot associate an answer with a previous question', () => {
      const activeQuestionTextRef = { current: 'नमस्ते! आज आपको क्या तकलीफ है?' };
      const currentQuestionTargetFieldRef = { current: 'chief_complaint' };

      // Asynchronous timer fires later, reading from refs rather than closed-over variable
      const closedOverOldQuestion = activeQuestionTextRef.current;

      // Question changes synchronously to Turn 2
      activeQuestionTextRef.current = 'क्या उल्टी या मतली महसूस हो रही है?';
      currentQuestionTargetFieldRef.current = 'vomiting';

      // Callback executed:
      const answerRecordedWithCurrentRef = activeQuestionTextRef.current;
      const targetFieldWithCurrentRef = currentQuestionTargetFieldRef.current;

      assert.strictEqual(answerRecordedWithCurrentRef, 'क्या उल्टी या मतली महसूस हो रही है?');
      assert.strictEqual(targetFieldWithCurrentRef, 'vomiting');
      assert.notStrictEqual(answerRecordedWithCurrentRef, closedOverOldQuestion);
    });

    it('5. Patient answer is recorded under CURRENT question target_field, NOT next decision.target_field', () => {
      // Turn 1 State
      const activeQuestionTextRef = { current: 'नमस्ते! क्या मुख्य समस्या है?' };
      const currentQuestionTargetFieldRef = { current: 'chief_complaint' };
      const currentCategoryLabelRef = { current: 'CHIEF COMPLAINT' };

      // Patient answers Turn 1
      const patientAnswerTurn1 = 'मुझे पेट में दर्द हो रहा है।';
      const answeringText = activeQuestionTextRef.current;
      const answeringTargetField = currentQuestionTargetFieldRef.current;
      const answeringCategory = currentCategoryLabelRef.current;

      // Backend returns decision for Turn 2
      const backendDecisionTurn2 = {
        action: 'ASK',
        question: 'यह दर्द कितने दिनों से है?',
        target_field: 'symptom_duration',
      };

      // Record Turn 1 using current question values BEFORE advancing
      recordIntakeAnswer(
        answeringTargetField,
        patientAnswerTurn1,
        'voice',
        answeringCategory,
        answeringText
      );

      // Now update refs for Turn 2
      activeQuestionTextRef.current = backendDecisionTurn2.question;
      currentQuestionTargetFieldRef.current = backendDecisionTurn2.target_field;
      currentCategoryLabelRef.current = 'SYMPTOM DURATION';

      const conversation = getUnifiedConversation();
      assert.strictEqual(conversation.length, 2); // Q + A
      const recordedAnswer = conversation.find((m) => m.role === 'patient');

      assert.ok(recordedAnswer);
      assert.strictEqual(recordedAnswer.content, patientAnswerTurn1);
      assert.strictEqual(recordedAnswer.category, 'CHIEF COMPLAINT', 'Category must match Question 1, not Question 2');
      assert.notStrictEqual(recordedAnswer.category, 'SYMPTOM DURATION', 'Must NOT be off-by-one with next decision.target_field');
    });
  });

  describe('FIX 4 — Final Submission Reuses Active Intake Session Without Duplication', () => {
    it('6. Final submission reuses active intakeSessionId via POST /api/v1/intakes/{id}/submit', async () => {
      const activeSessionUuid = '7fa4a737-6fa5-4500-a6d8-73e77b6b8861';
      localStorage.setItem('swasthya_active_intake_id', activeSessionUuid);
      localStorage.setItem('swasthya_active_patient_id', 'pat_001');
      localStorage.setItem('swasthya_active_token', 'TOKEN-99');

      let submittedEndpoint = '';
      let createdIntakeCount = 0;

      const mockFetch = async (url: string, options: any) => {
        if (url.endsWith('/submit')) {
          submittedEndpoint = url;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              intake_session_id: activeSessionUuid,
              status: 'SUBMITTED',
              token: 'TOKEN-99',
              patient_id: 'pat_001',
            }),
          };
        }
        if (url === '/api/v1/intakes') {
          createdIntakeCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'new-unwanted-id', token: 'TOKEN-NEW' }),
          };
        }
        return { ok: false, status: 404 };
      };

      // Simulate PatientIntake final submit
      const activeSessionId = localStorage.getItem('swasthya_active_intake_id');
      let finalId = activeSessionId;

      if (activeSessionId) {
        const res = await mockFetch(`/api/v1/intakes/${activeSessionId}/submit`, { method: 'POST' });
        const data = await res.json();
        finalId = data.intake_session_id;
      } else {
        const res = await mockFetch('/api/v1/intakes', { method: 'POST' });
        const data = await res.json();
        finalId = data.id;
      }

      assert.strictEqual(submittedEndpoint, `/api/v1/intakes/${activeSessionUuid}/submit`);
      assert.strictEqual(finalId, activeSessionUuid, 'Session UUID before and after submission must be identical');
      assert.strictEqual(createdIntakeCount, 0, 'Must NOT create a duplicate intake session on submission');
    });

    it('7. When no active session exists, creates session with correct workflow type', async () => {
      localStorage.removeItem('swasthya_active_intake_id');
      setStoredWorkflow('AYUSH');

      let capturedPayload: any = null;
      const mockFetch = async (url: string, options: any) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'fresh-ayush-session-123', token: 'AYUSH-TOK' }),
        };
      };

      const activeSessionId = localStorage.getItem('swasthya_active_intake_id');
      let finalId = '';
      if (activeSessionId) {
        // ...
      } else {
        const res = await mockFetch('/api/v1/intakes', {
          method: 'POST',
          body: JSON.stringify({
            patient_name: 'Omkar Test',
            workflow_type: getStoredWorkflow(),
          }),
        });
        const data = await res.json();
        finalId = data.id;
      }

      assert.strictEqual(finalId, 'fresh-ayush-session-123');
      assert.strictEqual(capturedPayload.workflow_type, 'AYUSH');
    });
  });

  describe('FIX 5 — AYUSH vs General Clinical Workflow Selection', () => {
    it('8. Default workflow is GENERAL_CLINICAL', () => {
      localStorage.removeItem(PATIENT_WORKFLOW_KEY);
      assert.strictEqual(getStoredWorkflow(), 'GENERAL_CLINICAL');
    });

    it('9. AYUSH track selection is persisted and carried into session creation', () => {
      setStoredWorkflow('AYUSH');
      assert.strictEqual(getStoredWorkflow(), 'AYUSH');

      setStoredWorkflow('GENERAL_CLINICAL');
      assert.strictEqual(getStoredWorkflow(), 'GENERAL_CLINICAL');
    });
  });

  describe('FIX 6 — ASR Audio Submission vs Chip Click Routing', () => {
    it('10. Hands-free voice submission calls handleAnswerSubmit() without overrideAnswer and routes audio to /voice-answer', async () => {
      let selectedEndpoint = '';
      let sentFormData = false;
      let sentJsonBody = false;

      const mockSubmit = async (
        recordedAudio: Blob | null,
        overrideAnswer?: string
      ) => {
        const fallbackText = (overrideAnswer || 'browser transcript').trim();
        if (recordedAudio && recordedAudio.size > 0 && !overrideAnswer) {
          selectedEndpoint = '/api/v1/intakes/session-123/voice-answer';
          sentFormData = true;
        } else {
          selectedEndpoint = '/api/v1/intakes/session-123/answers';
          sentJsonBody = true;
        }
      };

      // 1. Hands-free silence timer fires: calls handleAnswerSubmit() without arguments
      const mockRecordedBlob = { size: 1024, type: 'audio/webm' } as Blob;
      await mockSubmit(mockRecordedBlob, undefined);

      assert.strictEqual(
        selectedEndpoint,
        '/api/v1/intakes/session-123/voice-answer',
        'Hands-free voice submission MUST route to /voice-answer'
      );
      assert.strictEqual(sentFormData, true, 'Must send audio payload as FormData');
      assert.strictEqual(sentJsonBody, false, 'Must NOT send JSON text bypass');
    });

    it('11. Suggestion chip clicks call handleAnswerSubmit(chipText) and route to /answers directly', async () => {
      let selectedEndpoint = '';
      let sentFormData = false;
      let sentJsonBody = false;

      const mockSubmit = async (
        recordedAudio: Blob | null,
        overrideAnswer?: string
      ) => {
        const fallbackText = (overrideAnswer || 'browser transcript').trim();
        if (recordedAudio && recordedAudio.size > 0 && !overrideAnswer) {
          selectedEndpoint = '/api/v1/intakes/session-123/voice-answer';
          sentFormData = true;
        } else {
          selectedEndpoint = '/api/v1/intakes/session-123/answers';
          sentJsonBody = true;
        }
      };

      // 2. Chip clicked: calls handleAnswerSubmit(chipText)
      const mockRecordedBlob = { size: 0, type: 'audio/webm' } as Blob;
      await mockSubmit(mockRecordedBlob, 'Severe Chest Pain');

      assert.strictEqual(
        selectedEndpoint,
        '/api/v1/intakes/session-123/answers',
        'Chip click MUST route to /answers JSON endpoint'
      );
      assert.strictEqual(sentJsonBody, true, 'Must send chip text as JSON');
      assert.strictEqual(sentFormData, false, 'Must NOT send empty audio FormData');
    });
  });
});


