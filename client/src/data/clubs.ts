import type { FeedCategory } from '@/data/feed';
import type { MaterialSymbolName, SfSymbolName } from '@/components/ui/icon';

export type Club = {
  id: string;
  name: string;
  category: FeedCategory;
  /** 2-letter monogram for avatar. */
  mark: string;
  tagline: string;
  description: string;
  meetingSchedule?: string;
  location?: string;
  contactEmail: string;
  leader?: string;
  colors: [string, string];
  sf: SfSymbolName;
  md: MaterialSymbolName;
  image?: string;
  isDepartment?: boolean;
};

export const CALVIN_CLUBS: Club[] = [
  {
    id: 'abstraction',
    name: 'Abstraction',
    category: 'Academics',
    mark: 'AB',
    tagline: 'Calvin’s premier software & creative coding guild',
    description:
      'A community of student developers building creative software projects, exploring algorithms, and participating in regional hackathons.',
    meetingSchedule: 'Wednesdays · 6:30 PM - 8:30 PM',
    location: 'North Hall 276 (CS Lab)',
    contactEmail: 'abstraction@calvin.edu',
    leader: 'Pending Claim (Student Leader)',
    colors: ['#0A2E36', '#14B8A6'],
    sf: 'chevron.left.forwardslash.chevron.right',
    md: 'code',
    image:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'acm',
    name: 'ACM Student Chapter',
    category: 'Academics',
    mark: 'AC',
    tagline: 'Hack nights, coding challenges & tech projects',
    description:
      "Calvin's official student chapter of the Association for Computing Machinery. We host bi-weekly hack nights, tech talks with software alumni, coding competitions, and collaborative open-source projects for all skill levels.",
    meetingSchedule: 'Thursdays · 7:00 PM - 11:00 PM',
    location: 'North Hall 276',
    contactEmail: 'acm@calvin.edu',
    leader: 'Sophia Chen (President)',
    colors: ['#15514A', '#3FA08F'],
    sf: 'laptopcomputer',
    md: 'computer',
    image:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'calvin-theatre',
    name: 'Calvin Theatre Company',
    category: 'The Arts',
    mark: 'CT',
    tagline: 'Mainstage productions, stagecraft & student one-acts',
    description:
      'Producing four mainstage shows annually alongside student-directed one-acts, technical stagecraft workshops, and open improv nights. Open to all students regardless of major or prior theatre experience.',
    meetingSchedule: 'Auditions & rehearsals posted per show',
    location: 'Gezon Auditorium & CFAC',
    contactEmail: 'theatre@calvin.edu',
    leader: 'Marcus Vance (Company Manager)',
    colors: ['#3B2E58', '#8A6FC4'],
    sf: 'theatermasks.fill',
    md: 'theater_comedy',
    image:
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'outdoor-rec',
    name: 'Outdoor Recreation',
    category: 'Outdoors',
    mark: 'OR',
    tagline: 'Hikes, paddling, camping & Preserve outings',
    description:
      "Getting Calvin students outside into Michigan's natural landscapes. We organize weekend camping trips to Sleeping Bear Dunes, sunrise hikes at the Ecosystem Preserve, climbing gym nights, and outdoor gear rentals.",
    meetingSchedule: 'Bi-weekly Tuesdays · 6:30 PM & weekend outings',
    location: 'Preserve Trailhead / Fieldhouse',
    contactEmail: 'outdoorrec@calvin.edu',
    leader: 'Liam O’Connor (Trip Coordinator)',
    colors: ['#1F4D2E', '#5FA271'],
    sf: 'mountain.2.fill',
    md: 'hiking',
    image:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'jazz-collective',
    name: 'Jazz Collective',
    category: 'Music',
    mark: 'JC',
    tagline: 'Open jazz jams, student combos & basement sessions',
    description:
      'A collaborative student-run jazz community. We host open basement jam sessions, form informal quartets and big-band charts, and perform at campus coffeehouses and student showcases.',
    meetingSchedule: 'Every other Thursday · 9:00 PM',
    location: 'Commons Annex Basement',
    contactEmail: 'jazzcollective@calvin.edu',
    leader: 'Miles DeJong (Session Lead)',
    colors: ['#1F2933', '#5C7080'],
    sf: 'guitars.fill',
    md: 'piano',
    image:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'knights-robotics',
    name: 'Knights Robotics',
    category: 'Academics',
    mark: 'KR',
    tagline: 'Autonomous rovers, combat bots & CAD engineering',
    description:
      'Designing, manufacturing, and programming competitive robots. Students collaborate across mechanical engineering, computer science, and electrical systems on collegiate design challenges.',
    meetingSchedule: 'Wednesdays · 6:30 PM',
    location: 'Engineering Building MakerLab',
    contactEmail: 'robotics@calvin.edu',
    leader: 'Ethan Bakker (Captain)',
    colors: ['#1E3A8A', '#3B82F6'],
    sf: 'gearshape.2.fill',
    md: 'precision_manufacturing',
    image:
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'dance-guild',
    name: 'Dance Guild',
    category: 'The Arts',
    mark: 'DG',
    tagline: "Calvin's largest student dance organization",
    description:
      'With over 300 participating students every semester, Dance Guild welcomes dancers from beginner to advanced across hip hop, contemporary, tap, ballet, and jazz, culminating in our semester-end showcases in the CFAC.',
    meetingSchedule: 'Weekly section rehearsals',
    location: 'Spoelhof Fieldhouse Studios',
    contactEmail: 'danceguild@calvin.edu',
    leader: 'Chloe VanDyke (Director)',
    colors: ['#7C2D12', '#F97316'],
    sf: 'figure.dance',
    md: 'self_improvement',
    image:
      'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'environmental-club',
    name: 'Environmental Club',
    category: 'Outdoors',
    mark: 'EC',
    tagline: 'Campus sustainability, pollinator gardens & climate stewardship',
    description:
      'Advocating for campus stewardship and ecological restoration. We maintain native pollinator gardens on campus, run Plaster Creek clean-ups, host native plant sales, and organize sustainability symposiums.',
    meetingSchedule: 'Mondays · 5:30 PM',
    location: 'DeVries Hall Greenhouse Lobby',
    contactEmail: 'environmental@calvin.edu',
    leader: 'Anika Mulder (President)',
    colors: ['#14532D', '#22C55E'],
    sf: 'leaf.fill',
    md: 'eco',
    image:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'isa',
    name: 'International Student Association',
    category: 'Culture',
    mark: 'IS',
    tagline: 'Celebrating global cultures and community at Calvin',
    description:
      'Connecting international and domestic students through shared culture, international dinner nights, cultural showcases, language partner tables, and excursions throughout Michigan.',
    meetingSchedule: 'First Friday of each month · 6:00 PM',
    location: 'Commons Union Board Room',
    contactEmail: 'isa@calvin.edu',
    leader: 'Tariq Al-Mansoor (President)',
    colors: ['#047857', '#10B981'],
    sf: 'globe.americas.fill',
    md: 'public',
    image:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'calvin-esports',
    name: 'Calvin Esports',
    category: 'Gaming',
    mark: 'CE',
    tagline: 'Competitive & casual collegiate gaming',
    description:
      'Representing Calvin in collegiate leagues across Rocket League, Valorant, Smash Bros, and League of Legends, alongside casual campus LAN parties and community game nights.',
    meetingSchedule: 'Fridays · 7:00 PM',
    location: 'Esports Arena, Spoelhof Fieldhouse',
    contactEmail: 'esports@calvin.edu',
    leader: 'David Kim (Coordinator)',
    colors: ['#4C1D95', '#8B5CF6'],
    sf: 'gamecontroller.fill',
    md: 'sports_esports',
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pre-med',
    name: 'Pre-Med Society',
    category: 'Career',
    mark: 'PM',
    tagline: 'Clinical shadowing, suture clinics & MCAT cohorts',
    description:
      'Supporting pre-health and pre-medical students through guest physician lectures, suture clinics, volunteer placement in Grand Rapids hospitals, and collaborative MCAT study cohorts.',
    meetingSchedule: 'Tuesdays · 7:00 PM',
    location: 'Science Building 010',
    contactEmail: 'premed@calvin.edu',
    leader: 'Hannah Kuipers (Co-President)',
    colors: ['#991B1B', '#EF4444'],
    sf: 'cross.case.fill',
    md: 'medical_services',
    image:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'abide',
    name: 'Abide Ministries',
    category: 'Faith',
    mark: 'AB',
    tagline: 'Student-led prayer, Scripture study & discipleship',
    description:
      'Weekly dorm Bible studies, morning prayer walks through the seminary pond trail, and intentional mentorship for spiritual growth in Christian community.',
    meetingSchedule: 'Wednesdays · 8:00 PM',
    location: 'Chapel Prayer Room',
    contactEmail: 'abide@calvin.edu',
    leader: 'Caleb Rood (Ministry Coordinator)',
    colors: ['#1E293B', '#64748B'],
    sf: 'cross.fill',
    md: 'church',
    image:
      'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'calvin-orchestra',
    name: 'Calvin Orchestra',
    category: 'Music',
    mark: 'CO',
    tagline: 'Symphonic performance & masterworks',
    description:
      'Calvin’s premier orchestral ensemble performing classical masterworks, contemporary compositions, and collaborating with choral programs in the Covenant Fine Arts Center.',
    meetingSchedule: 'Tue & Thu rehearsals · 4:00 PM',
    location: 'Covenant Fine Arts Center',
    contactEmail: 'orchestra@calvin.edu',
    leader: 'Dr. Tiffany Engle (Conductor)',
    colors: ['#4A2545', '#9B5E96'],
    sf: 'music.note',
    md: 'music_note',
    image:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'knights-athletics',
    name: 'Knights Athletics',
    category: 'Athletics',
    mark: 'KA',
    tagline: 'Calvin NCAA Division III Athletics',
    description:
      'Official home of Calvin University Varsity Athletics across 21 varsity sports in the MIAA conference. Knight Nation comes together for gold-outs, rivalry games, and championship tournaments.',
    meetingSchedule: 'Game days throughout the week',
    location: 'Spoelhof Fieldhouse & Zuidema Field',
    contactEmail: 'athletics@calvin.edu',
    colors: ['#1B3A5C', '#4C90CE'],
    sf: 'sportscourt.fill',
    md: 'sports_soccer',
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'campus-ministries',
    name: 'Campus Ministries',
    category: 'Faith',
    mark: 'CM',
    tagline: 'Chapel, LOFT, Jubilee & pastoral care',
    description:
      'Fostering corporate worship, spiritual formation, and pastoral care across the Calvin community, including daily 10:00 AM chapel and Sunday evening LOFT services.',
    meetingSchedule: 'Daily Chapel 10:00 AM · LOFT Sundays 8:00 PM',
    location: 'Calvin Chapel',
    contactEmail: 'ministries@calvin.edu',
    colors: ['#2F4858', '#6A8CA3'],
    sf: 'hands.and.sparkles.fill',
    md: 'volunteer_activism',
    image:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'student-activities',
    name: 'Student Activities',
    category: 'Social',
    mark: 'SA',
    tagline: 'Campus traditions, Airband, concerts & late nights',
    description:
      "The team behind Calvin's biggest campus traditions, from Airband and Chaos Day to outdoor movies, campus concerts, and weekly late-night weekend programming.",
    meetingSchedule: 'Office hours M-F · 9:00 AM - 5:00 PM',
    location: 'Commons Union Level 2',
    contactEmail: 'activities@calvin.edu',
    colors: ['#8C2131', '#C4566B'],
    sf: 'music.mic',
    md: 'mic',
    image:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'service-learning',
    name: 'Service Learning Center',
    category: 'Service',
    mark: 'SL',
    tagline: 'Community partnerships & volunteer action in Grand Rapids',
    description:
      'Connecting students to meaningful engagement with local Grand Rapids community organizations, schools, food pantries, and neighborhood associations.',
    meetingSchedule: 'Saturday service vans leave at 8:30 AM',
    location: 'Spoelhof Center 301',
    contactEmail: 'slc@calvin.edu',
    colors: ['#5C3A1E', '#B98249'],
    sf: 'shippingbox.fill',
    md: 'inventory_2',
    image:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'student-senate',
    name: 'Student Senate',
    category: 'Social',
    mark: 'SS',
    tagline: 'Student advocacy, campus representation & club charters',
    description:
      "Calvin's elected student government. We advocate for student needs with university administration, manage club charters and funding, and lead campus life initiatives like the weekend shuttles.",
    meetingSchedule: 'Tuesdays · 9:00 PM',
    location: 'Commons Union Senate Chambers',
    contactEmail: 'senate@calvin.edu',
    colors: ['#3D3D5C', '#8080A8'],
    sf: 'bus.fill',
    md: 'directions_bus',
    isDepartment: true,
  },
  {
    id: 'art-department',
    name: 'Art Department',
    category: 'The Arts',
    mark: 'AD',
    tagline: 'Exhibitions, studio workshops & gallery receptions',
    description:
      'Visual arts at Calvin University, featuring student gallery exhibitions, visiting artist lectures, ceramics studios, graphic design showcases, and photography labs.',
    location: 'Center Art Gallery, CFAC',
    contactEmail: 'art@calvin.edu',
    colors: ['#6B2A4A', '#C06A96'],
    sf: 'paintpalette.fill',
    md: 'palette',
    image:
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'chemistry-department',
    name: 'Chemistry Department',
    category: 'Academics',
    mark: 'CD',
    tagline: 'Undergraduate research, lab training & chemistry seminars',
    description:
      'Academic and research opportunities in chemistry and biochemistry, including undergraduate lab instrumentation certifications, research fellowships, and guest lectures.',
    location: 'DeVries Hall',
    contactEmail: 'chemistry@calvin.edu',
    colors: ['#34495E', '#7B8FA3'],
    sf: 'flask.fill',
    md: 'science',
    isDepartment: true,
  },
  {
    id: 'dining-services',
    name: 'Dining Services',
    category: 'Social',
    mark: 'DS',
    tagline: 'Campus dining halls, cafes & culinary updates',
    description:
      'Updates, menu specials, allergen station highlights, and holiday dining hours across Commons Dining Hall, Knollcrest Dining, Uppercrust, and campus cafes.',
    location: 'Commons Union Level 1',
    contactEmail: 'dining@calvin.edu',
    colors: ['#8A5A00', '#E0A62A'],
    sf: 'fork.knife',
    md: 'restaurant',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    isDepartment: true,
  },
  {
    id: 'active-minds',
    name: 'Active Minds',
    category: 'Wellness',
    mark: 'AM',
    tagline: 'Mental health advocacy, peer wellness & community care',
    description:
      'Student-led chapter dedicated to opening campus conversations around mental health, wellness workshops, de-stress study breaks, and destigmatizing mental health care at Calvin.',
    meetingSchedule: 'Thursdays · 6:00 PM',
    location: 'Spoelhof Center 210',
    contactEmail: 'activeminds@calvin.edu',
    leader: 'Maya Lin (President)',
    colors: ['#0E7490', '#06B6D4'],
    sf: 'heart.text.square.fill',
    md: 'health_and_safety',
    image:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
  },
];

export function getAllClubs(): Club[] {
  return CALVIN_CLUBS;
}

export function getClubById(id: string): Club | undefined {
  const cleanId = id.trim().toLowerCase();
  return CALVIN_CLUBS.find((c) => c.id.toLowerCase() === cleanId);
}

export function getClubByName(name: string): Club | undefined {
  const cleanName = name.trim().toLowerCase();
  return CALVIN_CLUBS.find((c) => c.name.toLowerCase() === cleanName);
}

export function searchClubs(query: string, category: FeedCategory | 'All'): Club[] {
  const needle = query.trim().toLowerCase();

  return CALVIN_CLUBS.filter((club) => {
    const matchesCategory = category === 'All' || club.category === category;
    const matchesQuery =
      needle.length === 0 ||
      club.name.toLowerCase().includes(needle) ||
      club.tagline.toLowerCase().includes(needle) ||
      club.description.toLowerCase().includes(needle) ||
      (club.location ?? '').toLowerCase().includes(needle);

    return matchesCategory && matchesQuery;
  });
}
