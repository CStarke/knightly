-- Knightly Initial Seed Data

-- Students
INSERT INTO public.students (id, name, email, major, class_year, residence_hall, room, advisor, meal_plan, swipes_remaining, dining_dollars)
VALUES (
  '1234567',
  'Alex Knight',
  'ak23@calvin.edu',
  'Computer Science, B.S.',
  'Sophomore',
  'Bolt Hall',
  '214',
  'Prof. Victor Norman',
  'Core 17',
  12,
  145.50
) ON CONFLICT (id) DO NOTHING;

-- Clubs
INSERT INTO public.clubs (id, name, category, description, members_count)
VALUES
  ('running-club', 'Calvin Running Club', 'athletics', 'Weekly group runs across campus trails for all fitness levels.', 42),
  ('cs-club', 'Computer Science Club', 'academic', 'Hackathons, coding workshops, and tech networking.', 88),
  ('campus-choir', 'Campus Choir', 'the-arts', 'Vocal ensemble performing choral classics and hymns in Chapel.', 65)
ON CONFLICT (id) DO NOTHING;
