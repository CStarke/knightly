import type { MaterialSymbolName, SfSymbolName } from '@/components/ui/icon';

export type FeedCategory =
  | 'The Arts'
  | 'Athletics'
  | 'Music'
  | 'Academics'
  | 'Faith'
  | 'Service'
  | 'Social'
  | 'Outdoors';

export const feedCategories: FeedCategory[] = [
  'The Arts',
  'Athletics',
  'Music',
  'Academics',
  'Faith',
  'Service',
  'Social',
  'Outdoors',
];

export type Post = {
  id: string;
  /** Club, department, or office that posted. */
  org: string;
  /** Monogram shown in the post avatar. */
  mark: string;
  category: FeedCategory;
  postedAt: string;
  headline: string;
  body: string;
  when?: string;
  where?: string;
  /** Student follows this org, so it shows up in For You. */
  followed: boolean;
  /** Open to all of campus, so it shows up in For You regardless of follows. */
  campusWide: boolean;
  /** Poster gradient. */
  colors: [string, string];
  sf: SfSymbolName;
  md: MaterialSymbolName;
};

export const posts: Post[] = [
  {
    id: 'p1',
    org: 'Student Activities',
    mark: 'SA',
    category: 'Social',
    postedAt: '2h',
    headline: 'Airband is back',
    body: 'Lip sync, choreography, and far too much fog machine. Sign your floor up by Thursday at midnight, eight spots left.',
    when: 'Fri, Sep 18 · 8:00 PM',
    where: 'Van Noord Arena',
    followed: true,
    campusWide: true,
    colors: ['#862633', '#C4566B'],
    sf: 'music.mic',
    md: 'mic',
  },
  {
    id: 'p2',
    org: 'Calvin Theatre Company',
    mark: 'CT',
    category: 'The Arts',
    postedAt: '5h',
    headline: 'Auditions: Much Ado About Nothing',
    body: 'No experience needed, no monologue to prepare. Walk in, read a side, leave in twenty minutes. Crew sign-ups happen at the same table.',
    when: 'Mon, Sep 21 · 6:00-9:00 PM',
    where: 'Gezon Auditorium',
    followed: true,
    campusWide: false,
    colors: ['#3B2E58', '#8A6FC4'],
    sf: 'theatermasks.fill',
    md: 'theater_comedy',
  },
  {
    id: 'p3',
    org: 'Knights Athletics',
    mark: 'KA',
    category: 'Athletics',
    postedAt: '8h',
    headline: 'Soccer vs. Hope, under the lights',
    body: 'Student section gets in free with a Knight Card. Gold out, so wear the shirt they handed you at orientation.',
    when: 'Sat, Sep 19 · 7:00 PM',
    where: 'Zuidema Field',
    followed: true,
    campusWide: true,
    colors: ['#1B3A5C', '#4C90CE'],
    sf: 'soccerball',
    md: 'sports_soccer',
  },
  {
    id: 'p4',
    org: 'Campus Ministries',
    mark: 'CM',
    category: 'Faith',
    postedAt: '11h',
    headline: 'LOFT starts Sunday',
    body: 'Twenty-four student musicians rotating week to week. Doors at 7:30, service at 8, cider on the patio after.',
    when: 'Sun, Sep 20 · 8:00 PM',
    where: 'Chapel Undercroft',
    followed: true,
    campusWide: true,
    colors: ['#2F4858', '#6A8CA3'],
    sf: 'hands.and.sparkles.fill',
    md: 'volunteer_activism',
  },
  {
    id: 'p5',
    org: 'ACM Student Chapter',
    mark: 'AC',
    category: 'Academics',
    postedAt: '1d',
    headline: 'Hack night: build something dumb',
    body: 'Pizza, whiteboards, and zero expectations. Bring a laptop or borrow one of ours. Last time someone made a Commons line predictor.',
    when: 'Thu, Sep 17 · 7:00-11:00 PM',
    where: 'North Hall 276',
    followed: true,
    campusWide: false,
    colors: ['#15514A', '#3FA08F'],
    sf: 'laptopcomputer',
    md: 'computer',
  },
  {
    id: 'p6',
    org: 'Dining Services',
    mark: 'DS',
    category: 'Social',
    postedAt: '1d',
    headline: 'Commons reopens with the loft seating',
    body: 'New allergen-free station, 120 more seats upstairs, and the grab-and-go case is restocked at 7 every night now.',
    when: 'Open today until 9:00 PM',
    where: 'Commons Dining Hall',
    followed: false,
    campusWide: true,
    colors: ['#8A5A00', '#E0A62A'],
    sf: 'fork.knife',
    md: 'restaurant',
  },
  {
    id: 'p7',
    org: 'Calvin Orchestra',
    mark: 'CO',
    category: 'Music',
    postedAt: '1d',
    headline: 'Open rehearsal, no ticket needed',
    body: 'Sit in the balcony and listen to Dvorak fall apart and come back together. Stay for as long or as little as you want.',
    when: 'Tue, Sep 22 · 7:30 PM',
    where: 'Covenant Fine Arts Center',
    followed: false,
    campusWide: false,
    colors: ['#4A2545', '#9B5E96'],
    sf: 'music.note',
    md: 'music_note',
  },
  {
    id: 'p8',
    org: 'Outdoor Recreation',
    mark: 'OR',
    category: 'Outdoors',
    postedAt: '2d',
    headline: 'Sunrise hike at the Preserve',
    body: 'Meet at the trailhead, walk the loop, be back before your 9 a.m. Coffee is on us. Fourteen spots, first come.',
    when: 'Sat, Sep 19 · 6:45 AM',
    where: 'Ecosystem Preserve trailhead',
    followed: true,
    campusWide: false,
    colors: ['#1F4D2E', '#5FA271'],
    sf: 'mountain.2.fill',
    md: 'hiking',
  },
  {
    id: 'p9',
    org: 'Service Learning Center',
    mark: 'SL',
    category: 'Service',
    postedAt: '2d',
    headline: 'Saturday mornings at the food bank',
    body: 'Vans leave from Commons Lawn at 8:30 and are back by noon. No ongoing commitment, come once or come every week.',
    when: 'Saturdays · 8:30 AM',
    where: 'Commons Lawn',
    followed: false,
    campusWide: true,
    colors: ['#5C3A1E', '#B98249'],
    sf: 'shippingbox.fill',
    md: 'inventory_2',
  },
  {
    id: 'p10',
    org: 'Art Department',
    mark: 'AD',
    category: 'The Arts',
    postedAt: '3d',
    headline: 'Senior show opening reception',
    body: 'Eleven seniors, one gallery, a lot of nervous energy. Snacks are genuinely good this year.',
    when: 'Fri, Sep 25 · 5:00-8:00 PM',
    where: 'Center Art Gallery',
    followed: false,
    campusWide: false,
    colors: ['#6B2A4A', '#C06A96'],
    sf: 'paintpalette.fill',
    md: 'palette',
  },
  {
    id: 'p11',
    org: 'Knights Athletics',
    mark: 'KA',
    category: 'Athletics',
    postedAt: '3d',
    headline: 'Volleyball hosts Olivet',
    body: 'Ana Oyelaran had 31 kills last weekend. Come watch her do it again in a much louder room.',
    when: 'Wed, Sep 23 · 6:30 PM',
    where: 'Van Noord Arena',
    followed: true,
    campusWide: false,
    colors: ['#1B3A5C', '#5AA0D8'],
    sf: 'volleyball.fill',
    md: 'sports_volleyball',
  },
  {
    id: 'p12',
    org: 'Chemistry Department',
    mark: 'CD',
    category: 'Academics',
    postedAt: '4d',
    headline: 'New NMR is coming in January',
    body: 'Undergrads will run it themselves after a short certification. Sign up for the first training cohort now.',
    when: 'Training starts Jan 12',
    where: 'DeVries Hall 118',
    followed: false,
    campusWide: false,
    colors: ['#34495E', '#7B8FA3'],
    sf: 'flask.fill',
    md: 'science',
  },
  {
    id: 'p13',
    org: 'Student Senate',
    mark: 'SS',
    category: 'Social',
    postedAt: '5d',
    headline: 'Late-night shuttle adds a Woodlawn loop',
    body: 'Friday and Saturday, every 20 minutes until 2 a.m. You asked for this in the spring survey.',
    when: 'Starts this weekend',
    where: 'Commons Lawn stop',
    followed: false,
    campusWide: true,
    colors: ['#3D3D5C', '#8080A8'],
    sf: 'bus.fill',
    md: 'directions_bus',
  },
  {
    id: 'p14',
    org: 'Jazz Collective',
    mark: 'JC',
    category: 'Music',
    postedAt: '6d',
    headline: 'Basement session, bring an instrument',
    body: 'Open jam every other Thursday. Horns especially welcome, we have been carrying the melody on one trumpet.',
    when: 'Thu, Sep 24 · 9:00 PM',
    where: 'Commons Annex basement',
    followed: true,
    campusWide: false,
    colors: ['#1F2933', '#5C7080'],
    sf: 'guitars.fill',
    md: 'piano',
  },
];

export function forYouPosts() {
  return posts.filter((post) => post.followed || post.campusWide);
}

export function searchPosts(query: string, category: FeedCategory | 'All') {
  const needle = query.trim().toLowerCase();

  return posts.filter((post) => {
    const matchesCategory = category === 'All' || post.category === category;
    const matchesQuery =
      needle.length === 0 ||
      post.headline.toLowerCase().includes(needle) ||
      post.body.toLowerCase().includes(needle) ||
      post.org.toLowerCase().includes(needle) ||
      post.category.toLowerCase().includes(needle) ||
      (post.where ?? '').toLowerCase().includes(needle);

    return matchesCategory && matchesQuery;
  });
}

export const followedOrgs = Array.from(
  new Set(posts.filter((post) => post.followed).map((post) => post.org))
);
