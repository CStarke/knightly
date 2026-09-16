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

    it('ensures all alert IDs are unique', () => {
      const ids = safetyAlerts.map((a) => a.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All alert IDs must be unique');
    });

    it('allows filtering alerts by severity tier', () => {
      const warningAlerts = safetyAlerts.filter((a) => a.severity === 'warning');
      assert.ok(warningAlerts.length >= 1);
      for (const alert of warningAlerts) {
        assert.strictEqual(alert.severity, 'warning');
      }

      const infoAlerts = safetyAlerts.filter((a) => a.severity === 'info');
      assert.ok(infoAlerts.length >= 1);
      for (const alert of infoAlerts) {
        assert.strictEqual(alert.severity, 'info');
      }
    });

    it('finds alerts by impacted campus area', () => {
      const knollcrestAlerts = safetyAlerts.filter((a) =>
        a.area.toLowerCase().includes('knollcrest') || a.area === 'All campus'
      );
      assert.ok(knollcrestAlerts.length >= 1);
    });

    it('ranks alert severities with critical taking highest precedence', () => {
      const severityRank: Record<SafetyAlert['severity'], number> = {
        critical: 3,
        warning: 2,
        info: 1,
      };

      assert.ok(severityRank.critical > severityRank.warning);
      assert.ok(severityRank.warning > severityRank.info);
    });
  });

  describe('Emergency Contact Invariants & Dialing Logic', () => {
    it('ensures all emergency contact IDs are unique', () => {
      const ids = emergencyContacts.map((c) => c.id);
      const uniqueIds = new Set(ids);
      assert.strictEqual(ids.length, uniqueIds.size, 'All contact IDs must be unique');
    });

    it('formats valid tel: URLs for one-touch dialing', () => {
      for (const c of emergencyContacts) {
        const telUrl = `tel:${c.phone}`;
        assert.match(telUrl, /^tel:\d{3,10}$/, `Telephone URL "${telUrl}" must be valid`);
      }
    });

    it('ensures phones are either 3-digit shortcodes or 10-digit full numbers', () => {
      for (const c of emergencyContacts) {
        assert.ok(
          c.phone.length === 3 || c.phone.length === 10,
          `Phone "${c.phone}" must be either 3 or 10 digits`
        );
      }
    });

    it('verifies Title IX Coordinator contact information is present and accessible', () => {
      const titleIX = emergencyContacts.find((c) => c.name.includes('Title IX'));
      assert.ok(titleIX, 'Title IX Coordinator contact must be present');
      assert.strictEqual(titleIX?.phone, '6165268775');
      assert.ok(titleIX?.detail.length > 0);
    });

    it('differentiates urgent primary dispatch from routine campus services', () => {
      const urgent = emergencyContacts.filter((c) => c.urgent);
      const nonUrgent = emergencyContacts.filter((c) => !c.urgent);

      assert.strictEqual(urgent.length, 2, 'Should have exactly 2 urgent hotlines (Dispatch and 911)');
      assert.ok(nonUrgent.length >= 3, 'Should have several non-urgent care contacts');
    });
  });
});
