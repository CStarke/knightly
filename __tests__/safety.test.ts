import { describe, it } from 'node:test';
import assert from 'node:assert';
import { emergencyContacts, safetyAlerts, type EmergencyContact, type SafetyAlert } from '@/data/safety';

describe('Campus Safety Domain', () => {
  describe('Emergency Contacts', () => {
    it('contains essential campus emergency numbers', () => {
      const dispatch = emergencyContacts.find((c) => c.phone === '6165263333');
      assert.ok(dispatch, 'Campus safety dispatch must exist');
      assert.strictEqual(dispatch!.urgent, true);
      assert.ok(dispatch!.name.toLowerCase().includes('campus safety'));

      const emergency911 = emergencyContacts.find((c) => c.phone === '911');
      assert.ok(emergency911, '911 must exist');
      assert.strictEqual(emergency911!.urgent, true);
    });

    it('contains health, counseling, and crisis lifelines', () => {
      const counseling = emergencyContacts.find((c) => c.name.toLowerCase().includes('counseling'));
      assert.ok(counseling, 'Counseling Center must exist');
      assert.ok(counseling!.phone.length >= 7);

      const health = emergencyContacts.find((c) => c.name.toLowerCase().includes('health'));
      assert.ok(health, 'Health Services must exist');

      const lifeline = emergencyContacts.find((c) => c.phone === '988');
      assert.ok(lifeline, '988 Suicide & Crisis Lifeline must exist');
    });

    it('validates each emergency contact structure', () => {
      for (const contact of emergencyContacts) {
        assert.ok(contact.id.length > 0, 'Contact must have an id');
        assert.ok(contact.name.length > 0, 'Contact must have a name');
        assert.ok(contact.detail.length > 0, 'Contact must have detail info');
        assert.match(contact.phone, /^\d+$/, `Phone ${contact.phone} must be purely numeric for tel: dialing`);
      }
    });
  });

  describe('Safety Alerts', () => {
    it('validates alert severities', () => {
      const allowedSeverities: SafetyAlert['severity'][] = ['critical', 'warning', 'info'];
      for (const alert of safetyAlerts) {
        assert.ok(allowedSeverities.includes(alert.severity), `Invalid severity ${alert.severity}`);
        assert.ok(alert.title.length > 0, 'Alert must have title');
        assert.ok(alert.detail.length > 0, 'Alert must have detail');
        assert.ok(alert.area.length > 0, 'Alert must specify campus area');
        assert.ok(alert.at.length > 0, 'Alert must specify time');
      }
    });

    it('has at least one current safety alert for demonstration', () => {
      assert.ok(safetyAlerts.length >= 1);
    });
  });
});
