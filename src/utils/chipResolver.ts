/**
 * Deterministic clinical chip resolver based on backend adaptive question target_field.
 * Provides kiosk-friendly single-tap options for Duration, Severity, Binary symptoms,
 * and AYUSH constitutional dimensions across English, Hindi, and Marathi.
 *
 * Returns undefined for free-text dimensions where narrative description is clinically essential.
 */

export function resolveChipsForTargetField(
  targetField: string | undefined | null,
  language: string
): string[] | undefined {
  if (!targetField) return undefined;
  const field = targetField.toLowerCase().trim();
  const isHi = language === 'हिन्दी' || language === 'Hindi' || language.startsWith('hi');
  const isMr = language === 'मराठी' || language === 'Marathi' || language.startsWith('mr');

  // 1. Duration & Onset
  if (['duration', 'symptom_duration', 'onset', 'symptom_onset'].includes(field)) {
    if (isHi) return ['आज सुबह से', 'कल से', '2–3 दिन पहले', '1 सप्ताह से अधिक', 'काफी समय से'];
    if (isMr) return ['आज सकाळपासून', 'कालपासून', '२–३ दिवसांपूर्वी', '१ आठवड्यापेक्षा जास्त', 'खूप दिवसांपासून'];
    return ['Since today', 'Since yesterday', '2–3 days ago', 'More than 1 week', 'Ongoing / Chronic'];
  }

  // 2. Severity
  if (field === 'severity' || field === 'pain_scale') {
    if (isHi) return ['हल्का दर्द (1–3)', 'मध्यम दर्द (4–6)', 'तेज दर्द (7–10)'];
    if (isMr) return ['कमी त्रास (१–३)', 'मध्यम त्रास (४–६)', 'तीव्र वेदना (७–१०)'];
    return ['Mild (1–3)', 'Moderate (4–6)', 'Severe (7–10)'];
  }

  // 3. Binary Symptoms (Yes / No / Not sure)
  const binarySymptomFields = [
    'vomiting', 'nausea_vomiting', 'fever', 'breathlessness', 'blurred_vision',
    'eye_watering', 'light_sensitivity', 'photophobia', 'eye_discharge',
    'dysuria_burning', 'blood_in_stool', 'dark_stool', 'sweating_diaphoresis',
    'swelling_warmth', 'injury_history', 'hematuria_blood', 'antacid_relief'
  ];
  if (binarySymptomFields.includes(field)) {
    if (isHi) return ['हाँ (Yes)', 'नहीं (No)', 'पक्का नहीं पता (Not sure)'];
    if (isMr) return ['होय (Yes)', 'नाही (No)', 'नक्की माहित नाही (Not sure)'];
    return ['Yes', 'No', 'Not sure'];
  }

  // 4. Stool Consistency / Frequency
  if (field === 'stool_consistency') {
    if (isHi) return ['पानी जैसा पतला', 'हल्का ढीला / पतला', 'सामान्य बंधा हुआ'];
    if (isMr) return ['पाण्यासारखे पातळ', 'मऊ / सैल', 'सामान्य'];
    return ['Watery / Liquid', 'Soft / Loose', 'Normal / Formed'];
  }
  if (field === 'stool_frequency') {
    if (isHi) return ['1–2 बार', '3–4 बार', '5 या अधिक बार'];
    if (isMr) return ['१–२ वेळा', '३–४ वेळा', '५ किंवा जास्त वेळा'];
    return ['1–2 times', '3–4 times', '5+ times'];
  }

  // 5. AYUSH Dimensions
  if (field === 'agni') {
    if (isHi) return ['सामान्य भूख (Sama)', 'कम भूख / मंद (Manda)', 'तेज भूख (Tikshna)', 'अनियमित भूख (Vishama)'];
    if (isMr) return ['सामान्य भूक (Sama)', 'कमी भूक (Manda)', 'जास्त भूक (Tikshna)', 'अनियमित भूक (Vishama)'];
    return ['Normal / Balanced (Sama)', 'Poor / Low Appetite (Manda)', 'Sharp / High Hunger (Tikshna)', 'Irregular (Vishama)'];
  }
  if (field === 'koshtha') {
    if (isHi) return ['नियमित साफ (Madhyam)', 'कब्ज / सख्त (Krura)', 'नरम / पतला (Mridu)'];
    if (isMr) return ['नियमित (Madhyam)', 'बद्धकोष्ठता / कठीण (Krura)', 'पातळ / मऊ (Mridu)'];
    return ['Regular / Normal (Madhyam)', 'Hard / Constipated (Krura)', 'Soft / Frequent (Mridu)'];
  }
  if (field === 'sattva') {
    if (isHi) return ['शांत व मजबूत मन (Pravara)', 'सामान्य (Madhyama)', 'जल्दी घबराने वाला (Avara)'];
    if (isMr) return ['शांत व स्थिर (Pravara)', 'मध्यम (Madhyama)', 'लवकर घाबरणारे (Avara)'];
    return ['Calm / Strong (Pravara)', 'Moderate (Madhyama)', 'Easily Stressed (Avara)'];
  }

  // 6. Free-Text Clinical Dimensions (No chips, keep keyboard/voice input)
  return undefined;
}
