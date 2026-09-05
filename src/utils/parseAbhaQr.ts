/**
 * SwasthyaVaani - ABHA / Health QR Payload Parser
 *
 * Safely decodes and extracts structured patient demographics from
 * ABHA and health card QR codes without assuming a single fixed schema.
 *
 * Supported formats:
 * 1. JSON payload (ABDM standard schemas, wrapped objects)
 * 2. URL with query parameters (NDHM / ABDM profile links)
 * 3. Structured Key-Value text (colon / equals separated lines)
 * 4. Standalone 14-digit ABHA ID
 */

export interface ParsedQrPatientData {
  fullName?: string;
  abhaId?: string;       // Formatted as XX-XXXX-XXXX-XXXX
  abhaAddress?: string;  // e.g. username@abdm
  phone?: string;        // 10-digit mobile number
  dateOfBirth?: string;  // YYYY-MM-DD or DD-MM-YYYY
  age?: number;
  gender?: string;       // 'Male' | 'Female' | 'Other'
}

export type QrPayloadFormat = 'json' | 'url' | 'key-value' | 'standalone' | 'unknown';

export interface QrParseResult {
  success: boolean;
  data: ParsedQrPatientData;
  formatDetected: QrPayloadFormat;
  error?: string;
  hasPatientInfo: boolean;
}

/**
 * Validates and formats 14-digit ABHA numbers into standard XX-XXXX-XXXX-XXXX format.
 */
export function formatAbhaNumber(val: unknown): string | undefined {
  if (typeof val !== 'string' && typeof val !== 'number') return undefined;
  const raw = String(val).replace(/[\s-]/g, '').trim();
  if (/^\d{14}$/.test(raw)) {
    return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}-${raw.slice(10, 14)}`;
  }
  // If already formatted with hyphens
  if (/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(String(val).trim())) {
    return String(val).trim();
  }
  return undefined;
}

/**
 * Validates ABHA address (phrAddress) such as username@abdm.
 */
export function formatAbhaAddress(val: unknown): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim().toLowerCase();
  // Typically contains '@', e.g. user@abdm or user@sbx
  if (/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

/**
 * Normalizes gender values into standard kiosk options: 'Male', 'Female', 'Other'.
 */
export function normalizeGender(val: unknown): string | undefined {
  if (!val) return undefined;
  const str = String(val).trim().toUpperCase();
  if (str === 'M' || str === 'MALE' || str === 'BOY' || str === 'MAN') {
    return 'Male';
  }
  if (str === 'F' || str === 'FEMALE' || str === 'GIRL' || str === 'WOMAN') {
    return 'Female';
  }
  if (str === 'O' || str === 'OTHER' || str === 'T' || str === 'TRANSGENDER') {
    return 'Other';
  }
  return undefined;
}

/**
 * Normalizes Indian 10-digit mobile numbers.
 */
export function normalizePhone(val: unknown): string | undefined {
  if (!val) return undefined;
  const digits = String(val).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return undefined;
}

/**
 * Calculates approximate age given a date string or birth year.
 */
export function calculateAge(dobOrYear: string | number): number | undefined {
  const currentYear = new Date().getFullYear();

  if (typeof dobOrYear === 'number' && dobOrYear > 1900 && dobOrYear <= currentYear) {
    return currentYear - dobOrYear;
  }

  const str = String(dobOrYear).trim();

  // If 4-digit year string
  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    if (y > 1900 && y <= currentYear) return currentYear - y;
  }

  // Parse standard date patterns: YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
  let birthDate: Date | null = null;
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    birthDate = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
  } else {
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      birthDate = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
    }
  }

  if (birthDate && !isNaN(birthDate.getTime())) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age >= 0 && age <= 130) {
      return age;
    }
  }

  return undefined;
}

/**
 * Extracts and maps known patient fields from a generic key-value dictionary.
 */
function extractFromDict(dict: Record<string, unknown>): ParsedQrPatientData {
  const normalizedKeys: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(dict)) {
    if (val !== undefined && val !== null) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedKeys[cleanKey] = val;
    }
  }

  const result: ParsedQrPatientData = {};

  // Full Name
  const nameVal = normalizedKeys['name'] ??
    normalizedKeys['fullname'] ??
    normalizedKeys['patientname'] ??
    normalizedKeys['displayname'];
  if (typeof nameVal === 'string' && nameVal.trim()) {
    result.fullName = nameVal.trim();
  }

  // ABHA Number (hidn, abhanumber, healthidnumber)
  const abhaNumVal = normalizedKeys['hidn'] ??
    normalizedKeys['abhanumber'] ??
    normalizedKeys['healthidnumber'] ??
    normalizedKeys['hidnumber'] ??
    normalizedKeys['abhaid'] ??
    normalizedKeys['abha'] ??
    normalizedKeys['id'];
  const formattedAbha = formatAbhaNumber(abhaNumVal);
  if (formattedAbha) {
    result.abhaId = formattedAbha;
  }

  // ABHA Address / PHR Address (hid, phraddress, abhaaddress, healthid)
  const abhaAddrVal = normalizedKeys['phraddress'] ??
    normalizedKeys['abhaaddress'] ??
    normalizedKeys['hid'] ??
    normalizedKeys['healthid'] ??
    normalizedKeys['phr'];
  const formattedAddr = formatAbhaAddress(abhaAddrVal);
  if (formattedAddr) {
    result.abhaAddress = formattedAddr;
  }

  // Gender
  const genderVal = normalizedKeys['gender'] ??
    normalizedKeys['gendercode'] ??
    normalizedKeys['sex'];
  const normGender = normalizeGender(genderVal);
  if (normGender) {
    result.gender = normGender;
  }

  // Phone / Mobile
  const phoneVal = normalizedKeys['mobile'] ??
    normalizedKeys['phone'] ??
    normalizedKeys['mobilenumber'] ??
    normalizedKeys['mobileno'] ??
    normalizedKeys['contact'];
  const normPhone = normalizePhone(phoneVal);
  if (normPhone) {
    result.phone = normPhone;
  }

  // Date of Birth / Year of Birth
  const dobVal = normalizedKeys['dob'] ??
    normalizedKeys['dateofbirth'] ??
    normalizedKeys['birthdate'];
  if (typeof dobVal === 'string' && dobVal.trim()) {
    result.dateOfBirth = dobVal.trim();
  }

  // Age
  const directAgeVal = normalizedKeys['age'];
  if (directAgeVal !== undefined) {
    const parsedAge = parseInt(String(directAgeVal).trim(), 10);
    if (!isNaN(parsedAge) && parsedAge >= 0 && parsedAge <= 130) {
      result.age = parsedAge;
    }
  }

  // If age not directly specified, try calculating from DOB or year of birth
  if (result.age === undefined) {
    const yobVal = normalizedKeys['yob'] ??
      normalizedKeys['yearofbirth'] ??
      normalizedKeys['birthyear'];
    if (yobVal !== undefined) {
      const calc = calculateAge(String(yobVal));
      if (calc !== undefined) result.age = calc;
    } else if (result.dateOfBirth) {
      const calc = calculateAge(result.dateOfBirth);
      if (calc !== undefined) result.age = calc;
    }
  }

  return result;
}

/**
 * Main parser entry point: parses raw QR payload text into structured patient data.
 */
export function parseAbhaQr(rawPayload: string): QrParseResult {
  if (!rawPayload || !rawPayload.trim()) {
    return {
      success: false,
      data: {},
      formatDetected: 'unknown',
      error: 'Empty QR payload received.',
      hasPatientInfo: false,
    };
  }

  const payload = rawPayload.trim();

  // 1. Check for standalone 14-digit ABHA Number (hyphenated or unhyphenated)
  const standaloneAbha = formatAbhaNumber(payload);
  if (standaloneAbha && (payload.replace(/[\s-]/g, '').length === 14)) {
    return {
      success: true,
      data: { abhaId: standaloneAbha },
      formatDetected: 'standalone',
      hasPatientInfo: true,
    };
  }

  // 2. Try JSON parsing
  if (payload.startsWith('{') || payload.startsWith('[')) {
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object' && parsed !== null) {
        // Handle wrapped payloads e.g. { data: { ... } } or { patient: { ... } }
        const targetObj = (parsed.data && typeof parsed.data === 'object')
          ? parsed.data
          : (parsed.patient && typeof parsed.patient === 'object')
          ? parsed.patient
          : parsed;

        const extracted = extractFromDict(targetObj as Record<string, unknown>);
        const hasInfo = Object.keys(extracted).length > 0;

        if (hasInfo) {
          return {
            success: true,
            data: extracted,
            formatDetected: 'json',
            hasPatientInfo: true,
          };
        }
      }
    } catch {
      return {
        success: false,
        data: {},
        formatDetected: 'unknown',
        error: 'Invalid JSON QR payload.',
        hasPatientInfo: false,
      };
    }
  }

  // 3. Try URL / Query string parsing
  if (payload.startsWith('http://') || payload.startsWith('https://') || payload.includes('?')) {
    try {
      // Allow custom schemes like abdm://profile?...
      const urlStr = payload.includes('://') ? payload : `http://dummy.domain/${payload}`;
      const parsedUrl = new URL(urlStr);
      const queryParams: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        queryParams[key] = val;
      });

      if (Object.keys(queryParams).length > 0) {
        const extracted = extractFromDict(queryParams);
        const hasInfo = Object.keys(extracted).length > 0;
        if (hasInfo) {
          return {
            success: true,
            data: extracted,
            formatDetected: 'url',
            hasPatientInfo: true,
          };
        }
      }
    } catch {
      // Not a valid URL
    }
  }

  // 4. Try Key-Value line separated text
  // e.g. "ABHA Number: 91-4521-8890-1234\nName: Ananya Sharma\nGender: Female"
  const lines = payload.split(/[\r\n;,|]+/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1 || payload.includes(':') || payload.includes('=')) {
    const kvDict: Record<string, string> = {};
    for (const line of lines) {
      const separatorMatch = line.match(/^([^:=]+)[:=]\s*(.+)$/);
      if (separatorMatch) {
        const key = separatorMatch[1].trim();
        const value = separatorMatch[2].trim();
        kvDict[key] = value;
      }
    }

    if (Object.keys(kvDict).length > 0) {
      const extracted = extractFromDict(kvDict);
      const hasInfo = Object.keys(extracted).length > 0;
      if (hasInfo) {
        return {
          success: true,
          data: extracted,
          formatDetected: 'key-value',
          hasPatientInfo: true,
        };
      }
    }
  }

  // If no recognized patient data found
  return {
    success: false,
    data: {},
    formatDetected: 'unknown',
    error: 'QR detected, but patient data format is unsupported.',
    hasPatientInfo: false,
  };
}
