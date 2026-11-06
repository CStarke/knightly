import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const readSource = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const source = readSource('components/ui/starfield.tsx');

// Guard the actual renderer: the former SVG helper passed tests while the mounted sky broke.
test('the mounted starfield renders three direct layers with diamonds only in the foreground', () => {
  assert.equal((source.match(/<Animated.View\b/g) ?? []).length, 3);
  assert.doesNotMatch(source, /<Image\b|createStarfieldLayerUri|StarPoint|sparkleCross/);
  const distant = source.slice(source.indexOf('{layer1Stars.map'), source.indexOf('{layer2Stars.map'));
  const midground = source.slice(source.indexOf('{layer2Stars.map'), source.indexOf('{layer3Stars.map'));
  const foreground = source.slice(source.indexOf('{layer3Stars.map'));
  assert.doesNotMatch(distant + midground, /isSparkle|sparkleDiamond/);
  assert.match(foreground, /star.isSparkle/);
  assert.match(foreground, /width: star.size \* 1.8/);
  assert.match(foreground, /height: star.size \* 1.8/);
  assert.match(foreground, /borderWidth: StyleSheet.hairlineWidth/);
  assert.match(foreground, /rotate: "45deg"/);
  assert.match(midground, /shadowOpacity: isDark \? 0.5 : 0.2/);
  assert.match(midground, /shadowRadius: star.size \* 0.8/);
  assert.match(foreground, /shadowOpacity: isDark \? 0.95 : 0.45/);
  assert.match(foreground, /shadowRadius: star.size \* 1.3/);
});

test('all background hosts use the shared renderer and screen scrolling reaches its parallax context', () => {
  for (const host of ['components/app-tabs.tsx', 'components/app-tabs.web.tsx', 'app/clubs/index.tsx', 'app/clubs/[id].tsx', 'app/complete-club-profile.tsx']) {
    const hostSource = readSource(host);
    assert.match(hostSource, /StarfieldContext.Provider/);
    assert.match(hostSource, /<ParallaxStarfield translateX=\{translateX\} scrollY=\{scrollY\}/);
  }
  assert.match(readSource('hooks/use-screen-scroll.ts'), /starfield.scrollY.value = event.contentOffset.y/);
  assert.match(readSource('components/ui/screen.tsx'), /backgroundColor: starfield \? 'transparent' : theme.background/);
  assert.match(source, /pointerEvents="none"/);
  assert.equal((source.match(/Math.min\(900, Math.max\(0, scrollY.value\)/g) ?? []).length, 3);
  assert.match(source, /Dimensions.get\('screen'\).height/);
});
