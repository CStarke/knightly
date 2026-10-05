const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  CALVIN_PLACEHOLDER_FINGERPRINTS,
  computeSha256,
  isCalvinPlaceholderUrl,
  isCalvinPlaceholderHash,
  isCalvinPlaceholderBuffer,
  detectCalvinPlaceholder,
  resolveEventBanner,
} = require('../services/image-fingerprint');

test('Calvin Placeholder Image Fingerprinting & Immunity Invariants', async (t) => {
  const fixturesDir = path.resolve(__dirname, 'fixtures/calvin-placeholders');

  await t.test('verifies all 5 root example placeholder images match registered SHA-256 hashes', () => {
    const expectedPlaceholders = [
      {
        file: 'arts-culture.png',
        expectedHash: 'a61256e0fb883e32cf84657f23486a9fb7c62bc6312d60c1e65d01ffe7fd0d4f',
        expectedSize: 20770,
        expectedBanner: 'preset:amethyst:crystals',
      },
      {
        file: 'athletics.png',
        expectedHash: 'f8cecb9826863b286c6effb71aa0b0168ad6ab96ce8b30bf1285c0aee02d1d71',
        expectedSize: 34469,
        expectedBanner: 'preset:maroon:stripes',
      },
      {
        file: 'campus-life.png',
        expectedHash: 'a9ca566d6f35aa0d313bd80824a400be4ac51b0ca0482f63c172ef549c0401ce',
        expectedSize: 106246,
        expectedBanner: 'preset:orange:lattice',
      },
      {
        file: 'faith-worship.png',
        expectedHash: 'ddce0786f8c0691a53e77e29ccfe16b4eff83f360c2e7e038960897156912a90',
        expectedSize: 24147,
        expectedBanner: 'preset:maroon:diamonds',
      },
      {
        file: 'learning-academics.png',
        expectedHash: 'f60387246ad7e5849f6b3c899129b585f8f8222fc82be1d39395caec7811ce30',
        expectedSize: 15423,
        expectedBanner: 'preset:navy:arches',
      },
    ];

    for (const item of expectedPlaceholders) {
      const filePath = path.join(fixturesDir, item.file);
      assert.ok(fs.existsSync(filePath), `Fixture file must exist: ${item.file}`);

      const buffer = fs.readFileSync(filePath);
      assert.equal(buffer.length, item.expectedSize, `Size mismatch for ${item.file}`);

      const sha256 = computeSha256(buffer);
      assert.equal(sha256, item.expectedHash, `SHA-256 hash mismatch for ${item.file}`);

      // Cryptographic buffer detection
      assert.ok(isCalvinPlaceholderBuffer(buffer), `Buffer should be detected as placeholder: ${item.file}`);
      assert.ok(isCalvinPlaceholderHash(sha256), `Hash should be detected as placeholder: ${item.file}`);

      const detected = detectCalvinPlaceholder({ buffer });
      assert.ok(detected, `Placeholder should be detected for ${item.file}`);
      assert.equal(detected.presetBanner, item.expectedBanner);
    }
  });

  await t.test('IMMUNITY INVARIANT: does NOT replace different images that happen to share the same filename', () => {
    // Simulate a custom club poster named 'athletics.png' with different image bytes
    const customPosterBuffer = Buffer.from('PNG_FAKE_IMAGE_DATA_FOR_CUSTOM_SOCCER_TOURNAMENT_FLYER_12345');
    const customPosterSha256 = computeSha256(customPosterBuffer);

    // 1. Hash and buffer checks MUST reject it as a placeholder
    assert.equal(
      isCalvinPlaceholderBuffer(customPosterBuffer),
      false,
      'Custom image buffer with same filename MUST NOT be detected as placeholder'
    );
    assert.equal(
      isCalvinPlaceholderHash(customPosterSha256),
      false,
      'Custom image hash MUST NOT match placeholder hash'
    );
    assert.equal(
      detectCalvinPlaceholder({ buffer: customPosterBuffer }),
      null,
      'Descriptor must be null for non-placeholder buffer'
    );

    // 2. URL check with same filename under a user-upload or style path MUST NOT be treated as placeholder
    const customUploadUrl1 = 'https://calvin.edu/sites/default/files/styles/large/public/events/2026-10/athletics.png?itok=XyZ99';
    const customUploadUrl2 = 'https://calvin.edu/sites/default/files/custom/athletics.png';
    const externalUrl = 'https://myclub.org/images/athletics.png';

    assert.equal(isCalvinPlaceholderUrl(customUploadUrl1), false);
    assert.equal(isCalvinPlaceholderUrl(customUploadUrl2), false);
    assert.equal(isCalvinPlaceholderUrl(externalUrl), false);

    // 3. resolveEventBanner MUST preserve the original URL
    assert.equal(
      resolveEventBanner({ imageUrl: customUploadUrl1, category: 'Athletics' }),
      customUploadUrl1,
      'Legitimate custom flyer must NOT be replaced by preset banner'
    );
    assert.equal(
      resolveEventBanner({ imageUrl: externalUrl, category: 'Athletics', buffer: customPosterBuffer }),
      externalUrl,
      'Legitimate custom flyer buffer must NOT be replaced by preset banner'
    );
  });

  await t.test('replaces canonical Calvin Drupal placeholder URLs with matching Knightly preset banners', () => {
    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/athletics.png',
        category: 'Athletics',
      }),
      'preset:maroon:stripes'
    );

    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/learning-academics.png',
        category: 'Academics',
      }),
      'preset:navy:arches'
    );

    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/faith-worship.png',
        category: 'Faith',
      }),
      'preset:maroon:diamonds'
    );

    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/campus-life.png',
        category: 'Social',
      }),
      'preset:orange:lattice'
    );

    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2025-10/arts-culture.png',
        category: 'The Arts',
      }),
      'preset:amethyst:crystals'
    );

    assert.equal(
      resolveEventBanner({
        imageUrl: 'https://calvin.edu/sites/default/files/2024-01/calvin-west-michigan.png',
        category: 'Culture',
      }),
      'preset:cranberry:globe'
    );
  });

  await t.test('prioritizes classified event category over default placeholder category', () => {
    // In Calvin Drupal, Bersama Kickoff Event is given athletics.png, but classified as Culture
    const resolved = resolveEventBanner({
      imageUrl: 'https://calvin.edu/sites/default/files/2025-10/athletics.png',
      category: 'Culture',
    });
    // Culture's preset banner is preset:cranberry:globe, not athletics preset:maroon:stripes
    assert.equal(resolved, 'preset:cranberry:globe');
  });

  await t.test('preserves genuine event hero photography untouched', () => {
    const tartuffeUrl = 'https://calvin.edu/sites/default/files/styles/large/public/2026-09/CTC%20Tartuffe.png?itok=PO0iRNs7';
    const workdayUrl = 'https://calvin.edu/sites/default/files/styles/large/public/2026-06/stewardshipworkdayheader.jpg?itok=u-29wZA8';

    assert.equal(resolveEventBanner({ imageUrl: tartuffeUrl, category: 'The Arts' }), tartuffeUrl);
    assert.equal(resolveEventBanner({ imageUrl: workdayUrl, category: 'Service' }), workdayUrl);
  });
});
