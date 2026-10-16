const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyEvent, KNIGHTLY_CATEGORIES } = require('../services/category-mapper');
const { parseEventsHtml, normalizeImageUrl } = require('../services/event-scraper');

test('Calvin Event Category Classification Invariants', async (t) => {
  await t.test('guarantees 100% valid Knightly categories', () => {
    assert.equal(KNIGHTLY_CATEGORIES.length, 13);
    assert.ok(KNIGHTLY_CATEGORIES.includes('Official'));
    assert.ok(KNIGHTLY_CATEGORIES.includes('Music'));
    assert.ok(KNIGHTLY_CATEGORIES.includes('The Arts'));
    assert.ok(KNIGHTLY_CATEGORIES.includes('Academics'));
    assert.ok(KNIGHTLY_CATEGORIES.includes('Faith'));
  });

  await t.test('SPECIAL INVARIANT: Kinesiology must be classified as Academics, never Athletics', () => {
    const event1 = { title: 'Kinesiology Department Seminar', location: 'Spoelhof Fieldhouse' };
    assert.equal(classifyEvent(event1), 'Academics');

    const event2 = { title: 'Senior Research in Kinesiology', location: 'Lab 102' };
    assert.equal(classifyEvent(event2), 'Academics');

    const event3 = { title: 'Exercise Science Colloquium', summary: 'Kinesiology honors presentations' };
    assert.equal(classifyEvent(event3), 'Academics');
  });

  await t.test('classifies Faith and Campus Ministries events accurately', () => {
    assert.equal(classifyEvent({ title: 'Chapel Service: Sounds of Latino Worship' }), 'Faith');
    assert.equal(classifyEvent({ title: 'Campus Ministries Prayer Night', location: 'Chapel Sanctuary' }), 'Faith');
    assert.equal(classifyEvent({ title: 'LOFT Evening Worship' }), 'Faith');
    assert.equal(classifyEvent({ title: 'Women\'s Bible Study' }), 'Faith');
  });

  await t.test('keeps Music and The Arts separate', () => {
    // Music
    assert.equal(classifyEvent({ title: 'Hymnsing with Calvin Alumni Choir' }), 'Music');
    assert.equal(classifyEvent({ title: 'High School Choir Festival Concert' }), 'Music');
    assert.equal(classifyEvent({ title: 'Music Student Seminar', location: 'Recital Hall' }), 'Music');

    // The Arts
    assert.equal(classifyEvent({ title: 'Calvin Theatre Company: Tartuffe and the Hypocrites' }), 'The Arts');
    assert.equal(classifyEvent({ title: 'French Film Festival' }), 'The Arts');
    assert.equal(classifyEvent({ title: 'Center Art Gallery Opening' }), 'The Arts');
    assert.equal(classifyEvent({ title: 'Swing Dance Club' }), 'The Arts');
  });

  await t.test('classifies Athletics accurately', () => {
    assert.equal(classifyEvent({ title: 'Men\'s Golf at MIAA 1' }), 'Athletics');
    assert.equal(classifyEvent({ title: 'Women\'s Soccer vs St. Mary\'s', location: 'Zuidema Field' }), 'Athletics');
    assert.equal(classifyEvent({ title: 'XC at Pre-Nationals at Carleton' }), 'Athletics');
    assert.equal(classifyEvent({ title: 'Calvin Football at Adrian' }), 'Athletics');
  });

  await t.test('classifies Official announcements accurately', () => {
    assert.equal(classifyEvent({ title: '150th Commencement Ceremony', summary: 'Graduation exercises' }), 'Official');
    assert.equal(classifyEvent({ title: 'Presidential Address: State of the University' }), 'Official');
    assert.equal(classifyEvent({ title: 'Campus Safety Weather Alert: Snow Closure' }), 'Official');
  });

  await t.test('falls back safely to Culture for unclassified campus events', () => {
    assert.equal(classifyEvent({ title: 'Campus Forum' }), 'Culture');
    assert.equal(classifyEvent({ title: '' }), 'Culture');
  });
});

test('Event HTML Parsing & Normalization', async (t) => {
  await t.test('normalizes protocol-relative and root-relative image URLs', () => {
    assert.equal(
      normalizeImageUrl('//calvin.edu/sites/default/files/faith.png'),
      'https://calvin.edu/sites/default/files/faith.png'
    );
    assert.equal(
      normalizeImageUrl('/sites/default/files/photo.jpg'),
      'https://calvin.edu/sites/default/files/photo.jpg'
    );
    assert.equal(
      normalizeImageUrl('https://calvin.edu/images/banner.png'),
      'https://calvin.edu/images/banner.png'
    );
    assert.equal(normalizeImageUrl(null), null);
    assert.equal(normalizeImageUrl(''), null);
  });

  await t.test('parses sample Drupal event card markup accurately', () => {
    const sampleHtml = `
      <div data-history-node-id="42124" class="node node--type-provus-event node--promoted node--view-mode-calendar event-calendar single-day-event">
        <div class="event-calendar__right">
          <div class="event-calendar__image">
            <img src="//calvin.edu/sites/default/files/2025-10/faith-worship.png" alt="Worship" />
          </div>
        </div>
        <div class="event-calendar__left">
          <div class="event-calendar__date">Oct 02, 2026</div>
          <h4 class="event-calendar__title">
            <a href="/events/chapel-service-1790951400">Chapel Service: &quot;Jesus Is the Messiah&quot;</a>
          </h4>
          <div class="event-calendar__date-location">
            <div class="event-calendar__date-location__date">10:30 am&#8211;10:50 am</div>
            <div class="event-calendar__date-location__location">
              <a href="/places/university-chapel">Chapel Sanctuary</a>
            </div>
          </div>
        </div>
      </div>
    `;

    const parsed = parseEventsHtml(sampleHtml);
    assert.equal(parsed.length, 1);
    const event = parsed[0];
    assert.equal(event.id, 'calvin-42124');
    assert.equal(event.nodeId, '42124');
    assert.equal(event.title, 'Chapel Service: "Jesus Is the Messiah"');
    assert.equal(event.date, 'Oct 02, 2026');
    assert.equal(event.time, '10:30 am–10:50 am');
    assert.equal(event.location, 'Chapel Sanctuary');
    assert.equal(event.category, 'Faith');
    assert.equal(event.imageUrl, 'https://calvin.edu/sites/default/files/2025-10/faith-worship.png');
    assert.equal(event.detailUrl, 'https://calvin.edu/events/chapel-service-1790951400');
    assert.equal(event.campusWide, true);
  });
});
