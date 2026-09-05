import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseAbhaQr,
  formatAbhaNumber,
  formatAbhaAddress,
  normalizeGender,
  normalizePhone,
  calculateAge,
} from './parseAbhaQr.ts';

describe('ABHA QR Parser Unit Tests', () => {
  describe('Helper functions', () => {
    it('formatAbhaNumber formats 14 unhyphenated digits', () => {
      assert.strictEqual(formatAbhaNumber('91452188901234'), '91-4521-8890-1234');
    });

    it('formatAbhaNumber preserves correctly formatted 14 digits', () => {
      assert.strictEqual(formatAbhaNumber('91-4521-8890-1234'), '91-4521-8890-1234');
    });

    it('formatAbhaNumber returns undefined for invalid formats', () => {
      assert.strictEqual(formatAbhaNumber('12345'), undefined);
      assert.strictEqual(formatAbhaNumber('not-a-number'), undefined);
      assert.strictEqual(formatAbhaNumber(null), undefined);
    });

    it('formatAbhaAddress validates phrAddress', () => {
      assert.strictEqual(formatAbhaAddress('ananya@abdm'), 'ananya@abdm');
      assert.strictEqual(formatAbhaAddress('ANANYA.SHARMA@SBX'), 'ananya.sharma@sbx');
      assert.strictEqual(formatAbhaAddress('invalidaddress'), undefined);
    });

    it('normalizeGender standardizes gender strings', () => {
      assert.strictEqual(normalizeGender('M'), 'Male');
      assert.strictEqual(normalizeGender('male'), 'Male');
      assert.strictEqual(normalizeGender('F'), 'Female');
      assert.strictEqual(normalizeGender('female'), 'Female');
      assert.strictEqual(normalizeGender('O'), 'Other');
      assert.strictEqual(normalizeGender('other'), 'Other');
      assert.strictEqual(normalizeGender('unknown'), undefined);
    });

    it('normalizePhone strips country code and leading zero', () => {
      assert.strictEqual(normalizePhone('9876543210'), '9876543210');
      assert.strictEqual(normalizePhone('+919876543210'), '9876543210');
      assert.strictEqual(normalizePhone('09876543210'), '9876543210');
      assert.strictEqual(normalizePhone('123'), undefined);
    });

    it('calculateAge calculates from year of birth and date strings', () => {
      const currentYear = new Date().getFullYear();
      assert.strictEqual(calculateAge(1990), currentYear - 1990);
      assert.strictEqual(calculateAge('1995'), currentYear - 1995);
      const ageFromDob = calculateAge('1990-01-01');
      assert.ok(typeof ageFromDob === 'number' && ageFromDob >= 30);
    });
  });

  describe('parseAbhaQr payload parsing', () => {
    it('Scenario 1: Valid QR containing JSON patient data (official ABDM format)', () => {
      const payload = JSON.stringify({
        hidn: '91-4521-8890-1234',
        hid: 'ananya@abdm',
        name: 'Ananya Sharma',
        gender: 'F',
        dob: '1990-05-15',
        mobile: '9876543210',
      });

      const result = parseAbhaQr(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.formatDetected, 'json');
      assert.strictEqual(result.hasPatientInfo, true);
      assert.strictEqual(result.data.fullName, 'Ananya Sharma');
      assert.strictEqual(result.data.abhaId, '91-4521-8890-1234');
      assert.strictEqual(result.data.abhaAddress, 'ananya@abdm');
      assert.strictEqual(result.data.gender, 'Female');
      assert.strictEqual(result.data.phone, '9876543210');
      assert.strictEqual(result.data.dateOfBirth, '1990-05-15');
      assert.ok(typeof result.data.age === 'number');
    });

    it('Scenario 1b: Valid QR containing wrapped JSON structure (data / patient)', () => {
      const payload = JSON.stringify({
        data: {
          abhaNumber: '91452188901234',
          fullName: 'Rajesh Kumar',
          gender: 'M',
          age: 42,
          phone: '9123456780',
        },
      });

      const result = parseAbhaQr(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.formatDetected, 'json');
      assert.strictEqual(result.data.fullName, 'Rajesh Kumar');
      assert.strictEqual(result.data.abhaId, '91-4521-8890-1234');
      assert.strictEqual(result.data.gender, 'Male');
      assert.strictEqual(result.data.age, 42);
      assert.strictEqual(result.data.phone, '9123456780');
    });

    it('Scenario 2: Valid QR containing URL with query parameters', () => {
      const payload = 'https://healthid.ndhm.gov.in/profile?hidn=91-4521-8890-1234&name=Pooja+Patel&gender=F&dob=1998-11-20&mobile=9811223344&hid=pooja@sbx';
      const result = parseAbhaQr(payload);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.formatDetected, 'url');
      assert.strictEqual(result.hasPatientInfo, true);
      assert.strictEqual(result.data.fullName, 'Pooja Patel');
      assert.strictEqual(result.data.abhaId, '91-4521-8890-1234');
      assert.strictEqual(result.data.abhaAddress, 'pooja@sbx');
      assert.strictEqual(result.data.gender, 'Female');
      assert.strictEqual(result.data.phone, '9811223344');
    });

    it('Scenario 3: Valid QR containing key-value line text', () => {
      const payload = `
        Name: Vikram Singh
        ABHA: 91-8888-7777-6666
        Gender: Male
        Age: 48
        Phone: 9988776655
      `;
      const result = parseAbhaQr(payload);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.formatDetected, 'key-value');
      assert.strictEqual(result.hasPatientInfo, true);
      assert.strictEqual(result.data.fullName, 'Vikram Singh');
      assert.strictEqual(result.data.abhaId, '91-8888-7777-6666');
      assert.strictEqual(result.data.gender, 'Male');
      assert.strictEqual(result.data.age, 48);
      assert.strictEqual(result.data.phone, '9988776655');
    });

    it('Scenario 4: Standalone 14-digit ABHA number', () => {
      const resultUnhyphenated = parseAbhaQr('91452188901234');
      assert.strictEqual(resultUnhyphenated.success, true);
      assert.strictEqual(resultUnhyphenated.formatDetected, 'standalone');
      assert.strictEqual(resultUnhyphenated.data.abhaId, '91-4521-8890-1234');

      const resultHyphenated = parseAbhaQr('91-4521-8890-1234');
      assert.strictEqual(resultHyphenated.success, true);
      assert.strictEqual(resultHyphenated.formatDetected, 'standalone');
      assert.strictEqual(resultHyphenated.data.abhaId, '91-4521-8890-1234');
    });

    it('Scenario 5: Unknown QR payload (arbitrary text/wifi)', () => {
      const payload = 'WIFI:S:MyHomeWiFi;T:WPA;P:secretpassword;;';
      const result = parseAbhaQr(payload);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.formatDetected, 'unknown');
      assert.strictEqual(result.hasPatientInfo, false);
      assert.strictEqual(result.error, 'QR detected, but patient data format is unsupported.');
    });

    it('Scenario 6: Invalid JSON syntax', () => {
      const payload = '{name: broken json without quotes, abha: 123';
      const result = parseAbhaQr(payload);

      // Falls through to text parsing or unknown if no valid fields match
      assert.strictEqual(result.hasPatientInfo, false);
      assert.strictEqual(result.success, false);
    });

    it('Scenario 7: Empty or whitespace QR payload', () => {
      const resultEmpty = parseAbhaQr('');
      assert.strictEqual(resultEmpty.success, false);
      assert.strictEqual(resultEmpty.error, 'Empty QR payload received.');

      const resultWhitespace = parseAbhaQr('   \n  ');
      assert.strictEqual(resultWhitespace.success, false);
      assert.strictEqual(resultWhitespace.error, 'Empty QR payload received.');
    });

    it('Scenario 8: Partial QR data (e.g. only name and ABHA number)', () => {
      const payload = JSON.stringify({
        name: 'Sunita Roy',
        hidn: '91-1111-2222-3333',
      });

      const result = parseAbhaQr(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.fullName, 'Sunita Roy');
      assert.strictEqual(result.data.abhaId, '91-1111-2222-3333');
      assert.strictEqual(result.data.phone, undefined);
      assert.strictEqual(result.data.gender, undefined);
      assert.strictEqual(result.data.age, undefined);
    });

    it('Scenario 9: Never invent patient data for unknown keys', () => {
      const payload = JSON.stringify({
        randomField1: 'XYZ',
        token: 'abcdef12345',
      });
      const result = parseAbhaQr(payload);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.hasPatientInfo, false);
      assert.deepStrictEqual(result.data, {});
    });
  });
});
