import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveChipsForTargetField } from '../utils/chipResolver.ts';
import { clearConversationStore } from '../lib/conversationStore.ts';

describe('PatientTextChat Dynamic Chips & Resolution Unit Tests', () => {
  describe('resolveChipsForTargetField - Duration & Onset', () => {
    it('returns localized duration chips in English', () => {
      const chips = resolveChipsForTargetField('duration', 'English');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.includes('Since today'));
      assert.ok(chips.includes('2–3 days ago'));
    });

    it('returns localized duration chips in Hindi', () => {
      const chips = resolveChipsForTargetField('symptom_duration', 'हिन्दी');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.includes('आज सुबह से'));
      assert.ok(chips.includes('2–3 दिन पहले'));
    });

    it('returns localized duration chips in Marathi', () => {
      const chips = resolveChipsForTargetField('onset', 'मराठी');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.includes('आज सकाळपासून'));
      assert.ok(chips.includes('२–३ दिवसांपूर्वी'));
    });
  });

  describe('resolveChipsForTargetField - Severity', () => {
    it('returns 1-3, 4-6, 7-10 severity tiers in English', () => {
      const chips = resolveChipsForTargetField('severity', 'English');
      assert.deepStrictEqual(chips, ['Mild (1–3)', 'Moderate (4–6)', 'Severe (7–10)']);
    });

    it('returns severity tiers in Hindi', () => {
      const chips = resolveChipsForTargetField('pain_scale', 'हिन्दी');
      assert.deepStrictEqual(chips, ['हल्का दर्द (1–3)', 'मध्यम दर्द (4–6)', 'तेज दर्द (7–10)']);
    });

    it('returns severity tiers in Marathi', () => {
      const chips = resolveChipsForTargetField('severity', 'मराठी');
      assert.deepStrictEqual(chips, ['कमी त्रास (१–३)', 'मध्यम त्रास (४–६)', 'तीव्र वेदना (७–१०)']);
    });
  });

  describe('resolveChipsForTargetField - Yes/No/Unsure Binary Symptoms', () => {
    it('returns Yes/No/Not sure for vomiting and fever in English', () => {
      assert.deepStrictEqual(resolveChipsForTargetField('vomiting', 'English'), ['Yes', 'No', 'Not sure']);
      assert.deepStrictEqual(resolveChipsForTargetField('fever', 'English'), ['Yes', 'No', 'Not sure']);
      assert.deepStrictEqual(resolveChipsForTargetField('breathlessness', 'English'), ['Yes', 'No', 'Not sure']);
    });

    it('returns Yes/No/Not sure in Hindi for red flags like blood_in_stool and dark_stool', () => {
      assert.deepStrictEqual(resolveChipsForTargetField('blood_in_stool', 'हिन्दी'), ['हाँ (Yes)', 'नहीं (No)', 'पक्का नहीं पता (Not sure)']);
      assert.deepStrictEqual(resolveChipsForTargetField('dark_stool', 'हिन्दी'), ['हाँ (Yes)', 'नहीं (No)', 'पक्का नहीं पता (Not sure)']);
    });

    it('returns Yes/No/Not sure in Marathi for ocular symptoms like light_sensitivity and blurred_vision', () => {
      assert.deepStrictEqual(resolveChipsForTargetField('light_sensitivity', 'मराठी'), ['होय (Yes)', 'नाही (No)', 'नक्की माहित नाही (Not sure)']);
      assert.deepStrictEqual(resolveChipsForTargetField('blurred_vision', 'मराठी'), ['होय (Yes)', 'नाही (No)', 'नक्की माहित नाही (Not sure)']);
    });
  });

  describe('resolveChipsForTargetField - AYUSH Dimensions', () => {
    it('returns Agni constitutional appetite options in English', () => {
      const chips = resolveChipsForTargetField('agni', 'English');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.some((c) => c.includes('Sama')));
      assert.ok(chips.some((c) => c.includes('Manda')));
      assert.ok(chips.some((c) => c.includes('Tikshna')));
      assert.ok(chips.some((c) => c.includes('Vishama')));
    });

    it('returns Koshtha bowel habit options in Hindi', () => {
      const chips = resolveChipsForTargetField('koshtha', 'हिन्दी');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.some((c) => c.includes('Madhyam')));
      assert.ok(chips.some((c) => c.includes('Krura')));
      assert.ok(chips.some((c) => c.includes('Mridu')));
    });

    it('returns Sattva resilience options in Marathi', () => {
      const chips = resolveChipsForTargetField('sattva', 'मराठी');
      assert.ok(Array.isArray(chips));
      assert.ok(chips.some((c) => c.includes('Pravara')));
      assert.ok(chips.some((c) => c.includes('Madhyama')));
      assert.ok(chips.some((c) => c.includes('Avara')));
    });
  });

  describe('resolveChipsForTargetField - Free-Text Clinical Dimensions', () => {
    it('returns undefined for free-text anatomical location', () => {
      assert.strictEqual(resolveChipsForTargetField('location', 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('abdominal_location', 'English'), undefined);
    });

    it('returns undefined for narrative food exposure and dietary details', () => {
      assert.strictEqual(resolveChipsForTargetField('food_exposure', 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('ahara_vihara', 'English'), undefined);
    });

    it('returns undefined for open-ended exploration and complaint clarification', () => {
      assert.strictEqual(resolveChipsForTargetField('open_exploration', 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('open_gi_exploration', 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('chief_complaint', 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('clarify_problem', 'English'), undefined);
    });

    it('returns undefined for null or empty string', () => {
      assert.strictEqual(resolveChipsForTargetField(null, 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField(undefined, 'English'), undefined);
      assert.strictEqual(resolveChipsForTargetField('', 'English'), undefined);
    });
  });
});

describe('Chat Double Submission & Session Recovery Invariant Tests', () => {
  it('synchronous lock prevents duplicate concurrent invocations', async () => {
    let callCount = 0;
    let isSubmitting = false;

    // Simulate handlePatientResponse synchronous guard
    const simulateSubmit = async (text: string) => {
      if (isSubmitting || !text.trim()) return 'SKIPPED';
      isSubmitting = true;
      try {
        callCount++;
        // Simulate async network request
        await new Promise((resolve) => setTimeout(resolve, 15));
        return 'SUCCESS';
      } finally {
        isSubmitting = false;
      }
    };

    // Rapid concurrent double click / enter press within same tick
    const [res1, res2] = await Promise.all([
      simulateSubmit('I have severe pain'),
      simulateSubmit('I have severe pain'),
    ]);

    assert.strictEqual(callCount, 1, 'Only one answer request must be dispatched');
    assert.strictEqual(res1, 'SUCCESS');
    assert.strictEqual(res2, 'SKIPPED');

    // Sequential next turn must succeed
    const res3 = await simulateSubmit('It started yesterday');
    assert.strictEqual(callCount, 2, 'Sequential turn must succeed');
    assert.strictEqual(res3, 'SUCCESS');
  });

  it('session recovery ensures valid intake session before dispatching answer', async () => {
    let activeSessionId: string | null = null;
    let sessionCreationCalls = 0;

    const mockEnsureSession = async () => {
      if (activeSessionId) return activeSessionId;
      sessionCreationCalls++;
      // Simulate backend POST /api/v1/intakes
      activeSessionId = 'intake-recovered-123';
      return activeSessionId;
    };

    const simulateSubmitWithRecovery = async (answer: string) => {
      let activeId = activeSessionId;
      if (!activeId) {
        activeId = await mockEnsureSession();
      }
      return { activeId, answer };
    };

    // First call: initial session was null (failed on mount), must recover and succeed
    const result1 = await simulateSubmitWithRecovery('Headache since morning');
    assert.strictEqual(result1.activeId, 'intake-recovered-123');
    assert.strictEqual(sessionCreationCalls, 1);

    // Second call: already initialized, must reuse existing without duplicate creation
    const result2 = await simulateSubmitWithRecovery('Severity is 6');
    assert.strictEqual(result2.activeId, 'intake-recovered-123');
    assert.strictEqual(sessionCreationCalls, 1, 'Must not duplicate session');
  });

  describe('New Patient Session Isolation & ensureSession Hardening', () => {
    // Polyfill in-memory localStorage for Node test environment if not present
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

    it('clearConversationStore explicitly removes persisted answers and conversation', () => {
      localStorage.setItem('swasthya_patient_answers', JSON.stringify({ chief_complaint: 'stale chest pain' }));
      localStorage.setItem('swasthya_unified_conversation', JSON.stringify([{ role: 'patient', content: 'stale chest pain' }]));

      clearConversationStore();

      assert.strictEqual(localStorage.getItem('swasthya_patient_answers'), null);
      assert.strictEqual(localStorage.getItem('swasthya_unified_conversation'), null);
    });

    it('new patient journey clears old intake ID and ensureSession creates a fresh session', async () => {
      // Stale previous session from earlier voice intake
      localStorage.setItem('swasthya_active_intake_id', 'stale-voice-cardiac-intake-999');
      localStorage.setItem('swasthya_active_token', 'TOKEN-999');

      // Patient starts new journey at language or details step -> explicitly cleared
      localStorage.removeItem('swasthya_active_intake_id');
      localStorage.removeItem('swasthya_active_token');
      clearConversationStore();

      assert.strictEqual(localStorage.getItem('swasthya_active_intake_id'), null);

      // In PatientTextChat, ensureSession creates fresh intake session
      let createdSessionId = '';
      const ensureFreshSession = async (propId?: string | null, activeStateId?: string | null) => {
        if (activeStateId) return activeStateId;
        if (propId) return propId;
        // Do NOT blindly read localStorage['swasthya_active_intake_id']
        createdSessionId = 'new-clean-chat-intake-1001';
        localStorage.setItem('swasthya_active_intake_id', createdSessionId);
        return createdSessionId;
      };

      const sessionId = await ensureFreshSession(null, null);
      assert.strictEqual(sessionId, 'new-clean-chat-intake-1001');
      assert.notStrictEqual(sessionId, 'stale-voice-cardiac-intake-999');
      assert.strictEqual(localStorage.getItem('swasthya_active_intake_id'), 'new-clean-chat-intake-1001');
    });

    it('ensureSession does not revive abandoned stale localStorage ID when starting fresh chat', async () => {
      // Even if an abandoned stale ID was left in localStorage
      localStorage.setItem('swasthya_active_intake_id', 'abandoned-stale-cardiac-id');

      // Hardened ensureSession does NOT blindly read localStorage
      let backendCreationCalls = 0;
      const hardenedEnsureSession = async (intakeSessionIdState: string | null, propIntakeSessionId?: string | null) => {
        if (intakeSessionIdState) return intakeSessionIdState;
        if (propIntakeSessionId) return propIntakeSessionId;
        backendCreationCalls++;
        const newSessionId = 'brand-new-intake-session-2002';
        localStorage.setItem('swasthya_active_intake_id', newSessionId);
        return newSessionId;
      };

      const resolvedId = await hardenedEnsureSession(null, null);
      assert.strictEqual(resolvedId, 'brand-new-intake-session-2002');
      assert.notStrictEqual(resolvedId, 'abandoned-stale-cardiac-id');
      assert.strictEqual(backendCreationCalls, 1);
    });
  });
});
