import assert from 'node:assert/strict';
import Module from 'node:module';
import { test, mock } from 'node:test';
import type { ReactElement } from 'react';

import { posts, type Post } from '@/data/feed';

// Exercise the actual screen and its control callbacks without requiring a native renderer.
// Native views and context providers are boundaries; the filtering implementation stays real.
test('feed screen reconciles mobile favorites with shared mobile/web filters', () => {
  const React = require('react');
  const state: unknown[] = [];
  let stateIndex = 0;
  let platform = 'ios';
  let width = 390;
  let favorites: Post[] = [];
  const samplePosts = posts.slice(0, 6);
  const followedClub = samplePosts[0].clubId;
  const stubs = new Map<string, unknown>();
  const component = (name: string) => name;
  for (const [path, names] of [
    ['components/post-card', ['PostCard']],
    ['components/themed-text', ['ThemedText']],
    ['components/ui/card', ['Card']],
    ['components/ui/chip', ['ChipRow']],
    ['components/ui/icon', ['Icon']],
    ['components/ui/screen', ['Screen', 'ScreenFlatList']],
    ['components/ui/search-field', ['SearchField']],
    ['components/ui/segmented', ['Segmented']],
  ] as const) {
    stubs.set(`@/${path}`, Object.fromEntries(names.map(name => [name, component(name)])));
  }
  stubs.set('@/context/feed-context', {
    useFeed: () => ({ posts: samplePosts, favoritePosts: favorites }),
  });
  stubs.set('@/context/club-follow-context', {
    useClubFollow: () => ({ isFollowing: (id: string) => id === followedClub, followedCount: 1 }),
  });
  stubs.set('@/context/clubs-navigation-context', {
    useClubsNavigation: () => ({ openClubsDirectory: () => {} }),
  });
  stubs.set('react-native', {
    Platform: {
      get OS() { return platform; },
      select: (options: Record<string, unknown>) => options[platform] ?? options.default,
    },
    Pressable: 'Pressable', View: 'View', StyleSheet: { create: (styles: unknown) => styles },
    useWindowDimensions: () => ({ width }),
  });
  stubs.set('react', {
    ...React,
    useState: (initial: unknown) => {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value: unknown) => { state[index] = value; }];
    },
    useDeferredValue: (value: unknown) => value,
    useMemo: (calculate: () => unknown) => calculate(),
  });

  // Restore the loader even on failure so this test cannot alter other test files.
  const loader = Module as unknown as { _load: (...args: any[]) => any };
  const originalLoad = loader._load;
  const loadMock = mock.method(loader, '_load', (...args: any[]) => {
    return stubs.has(args[0]) ? stubs.get(args[0]) : originalLoad(...args);
  });
  try {
    const FeedScreen = require('@/app/(tabs)/index').default;
    const render = (): ReactElement<any> => { stateIndex = 0; return FeedScreen(); };
    const find = (node: any, type: string): any => {
      if (!node) return undefined;
      if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
      if (node.type === type) return node;
      return find(node.props?.children, type);
    };
    const header = (screen: ReactElement<any>) => screen.props.ListHeaderComponent ?? screen.props.children;
    const mobilePosts = (screen: ReactElement<any>): Post[] => screen.props.data.flat();

    let screen = render();
    assert.equal(screen.type, 'ScreenFlatList');
    assert.ok(screen.props.data.every((row: Post[]) => row.length === 1));
    assert.deepEqual(find(header(screen), 'Segmented').props.options, ['Following', 'All Campus', 'Favorites']);
    assert.ok(mobilePosts(screen).every(post => post.campusWide || post.clubId === followedClub));

    find(header(screen), 'Segmented').props.onChange('All Campus');
    screen = render();
    assert.equal(mobilePosts(screen).length, samplePosts.length);
    find(header(screen), 'ChipRow').props.onChange(samplePosts[0].category);
    screen = render();
    assert.ok(mobilePosts(screen).every(post => post.category === samplePosts[0].category));
    // Tapping the selected category again restores All.
    find(header(screen), 'ChipRow').props.onChange(samplePosts[0].category);
    screen = render();
    find(header(screen), 'SearchField').props.onChangeText(samplePosts[0].headline);
    assert.deepEqual(mobilePosts(render()).map(post => post.id), [samplePosts[0].id]);
    find(header(render()), 'SearchField').props.onChangeText('');

    find(header(render()), 'Segmented').props.onChange('Favorites');
    assert.equal(mobilePosts(render()).length, 0);
    favorites = [samplePosts[1]];
    assert.deepEqual(mobilePosts(render()).map(post => post.id), [samplePosts[1].id]);
    // A context update after removing the last favorite must immediately empty the tab.
    favorites = [];
    assert.equal(mobilePosts(render()).length, 0);

    // Web layout shares all three toggle options (including Favorites) and responsive three-column layout.
    platform = 'web'; width = 1200;
    state[0] = 'All Campus';
    screen = render();
    assert.equal(screen.type, 'Screen');
    assert.deepEqual(find(header(screen), 'Segmented').props.options, ['Following', 'All Campus', 'Favorites']);
    assert.ok(find(screen, 'PostCard'));
    assert.equal(screen.props.children[1].props.children[0].props.children[0].length, 3);
    width = 800;
    assert.equal(render().props.children[1].props.children[0].props.children[0].length, 2);
    find(header(screen), 'SearchField').props.onChangeText('no matching campus post');
    assert.equal(find(render(), 'PostCard'), undefined);
    find(header(screen), 'SearchField').props.onChangeText('');

    // Web filtering also supports Favorites
    state[0] = 'Favorites';
    favorites = [samplePosts[2]];
    const webFavScreen = render();
    const postCards: any[] = [];
    const collectPostCards = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) { node.forEach(collectPostCards); return; }
      if (node.type === 'PostCard') postCards.push(node);
      collectPostCards(node.props?.children);
    };
    collectPostCards(webFavScreen);
    assert.deepEqual(postCards.map(c => c.props.post.id), [samplePosts[2].id]);
  } finally {
    loadMock.mock.restore();
  }
});
