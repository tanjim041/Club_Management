import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx > -1) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}

if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
})

const DEFAULT_PASSWORD = 'Password123!'
const INSTITUTE_ID = '11111111-1111-1111-1111-111111111111'
const MASTER_ADMIN_ID = 'e1584813-d097-4078-b2f0-f48c4c8161e0'

// ---------------------------------------------------------------------------
// 1. Demo User Provisioning
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  {
    email: 'demo.participant@festivo.org',
    fullName: 'Alex Rivera [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Computer Science & Engineering',
    experienceLevel: 'intermediate',
    interests: ['Technology', 'Robotics', 'Photography', 'Competitive Programming'],
    skills: ['Python', 'TypeScript', 'React', 'Digital Photography'],
  },
  {
    email: 'participant1@festivo.org',
    fullName: 'Jordan Hayes [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Software Engineering',
    experienceLevel: 'advanced',
    interests: ['Technology', 'Startups', 'Case Studies'],
    skills: ['Go', 'Kubernetes', 'Financial Modeling'],
  },
  {
    email: 'participant2@festivo.org',
    fullName: 'Morgan Chen [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Media & Visual Arts',
    experienceLevel: 'intermediate',
    interests: ['Photography', 'Documentary', 'UI/UX Design'],
    skills: ['Lightroom', 'Cinematography', 'Figma'],
  },
  {
    email: 'participant3@festivo.org',
    fullName: 'Taylor Kim [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Business Administration',
    experienceLevel: 'intermediate',
    interests: ['Business', 'Career Planning', 'Venture Capital'],
    skills: ['Strategic Pitching', 'Market Research'],
  },
  {
    email: 'participant4@festivo.org',
    fullName: 'Samira Khan [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Biotechnology & Environmental Science',
    experienceLevel: 'advanced',
    interests: ['Science', 'Social Service', 'Community Outreach'],
    skills: ['Microbiology', 'Volunteer Coordination', 'Public Speaking'],
  },
  {
    email: 'participant5@festivo.org',
    fullName: 'Devon Vance [Demo Participant]',
    role: 'participant',
    institution: 'Horizon Institute of Technology',
    department: 'Applied Physics',
    experienceLevel: 'beginner',
    interests: ['Science', 'Astronomy', 'Robotics'],
    skills: ['MATLAB', 'Circuits'],
  },
  {
    email: 'organizer.tech@festivo.org',
    fullName: 'Elena Rostova [Demo - Tech Organizer]',
    role: 'organizer',
    scopedClubs: ['22222222-2222-2222-2222-222222222221'], // Apex Technology only
    institution: 'Horizon Institute of Technology',
    department: 'School of Engineering',
    experienceLevel: 'advanced',
    interests: ['Technology', 'Robotics'],
    skills: ['Operations', 'Event Management'],
  },
  {
    email: 'organizer.photo@festivo.org',
    fullName: 'Julian Vance [Demo - Photo Organizer]',
    role: 'organizer',
    scopedClubs: ['22222222-2222-2222-2222-222222222222'], // Lumina Photography only
    institution: 'Horizon Institute of Technology',
    department: 'School of Humanities & Fine Arts',
    experienceLevel: 'advanced',
    interests: ['Photography', 'Visual Media'],
    skills: ['Curating', 'Exhibition Design'],
  },
  {
    email: 'organizer.business@festivo.org',
    fullName: 'Sarah Jenkins [Demo - Business & Social Organizer]',
    role: 'organizer',
    scopedClubs: [
      '22222222-2222-2222-2222-222222222223', // Nexus Business
      '22222222-2222-2222-2222-222222222224', // Beacon Social Service
    ],
    institution: 'Horizon Institute of Technology',
    department: 'School of Business & Social Policy',
    experienceLevel: 'advanced',
    interests: ['Business', 'Social Service'],
    skills: ['Partnership Outreach', 'Logistics'],
  },
  {
    email: 'organizer.science@festivo.org',
    fullName: 'Dr. Marcus Vance [Demo - Science Organizer]',
    role: 'organizer',
    scopedClubs: ['22222222-2222-2222-2222-222222222225'], // Vertex Science only
    institution: 'Horizon Institute of Technology',
    department: 'Faculty of Natural Sciences',
    experienceLevel: 'advanced',
    interests: ['Science', 'Olympiad'],
    skills: ['Academic Coordination'],
  },
  {
    email: 'staff@festivo.org',
    fullName: 'Morgan Reed [Demo Gate Staff]',
    role: 'check_in_staff',
    scopedClubs: [
      '22222222-2222-2222-2222-222222222221', // Apex Technology
      '22222222-2222-2222-2222-222222222222', // Lumina Photography
      '22222222-2222-2222-2222-222222222223', // Nexus Business
      '22222222-2222-2222-2222-222222222224', // Beacon Social Service
      '22222222-2222-2222-2222-222222222225', // Vertex Science
    ],
    institution: 'Horizon Institute of Technology',
    department: 'Campus Security & Gate Operations',
    experienceLevel: 'advanced',
    interests: ['Gate Operations', 'Event Logistics'],
    skills: ['Check-In Operations', 'Roster Verification'],
  },
]

async function ensureDemoUsers() {
  console.log('Ensuring demo auth users and profiles...')
  const userMap = new Map()

  // First fetch existing users
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 100 })
  if (listError) throw listError

  const existingByEmail = new Map()
  for (const u of listData.users) {
    if (u.email) existingByEmail.set(u.email.toLowerCase(), u)
  }

  for (const demoUser of DEMO_USERS) {
    let userId
    const existing = existingByEmail.get(demoUser.email.toLowerCase())

    if (existing) {
      userId = existing.id
      // Update password to ensure it matches documentation
      await supabase.auth.admin.updateUserById(userId, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demoUser.fullName, is_demo: true },
      })
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: demoUser.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demoUser.fullName, is_demo: true },
      })
      if (createError) throw createError
      userId = created.user.id
    }

    userMap.set(demoUser.email, userId)

    // Upsert public profile
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email: demoUser.email,
        full_name: demoUser.fullName,
        institution: demoUser.institution,
        department: demoUser.department,
        experience_level: demoUser.experienceLevel,
        interests: demoUser.interests,
        skills: demoUser.skills,
        profile_completed: true,
        profile_completed_at: new Date('2026-09-01T12:00:00Z').toISOString(),
      },
      { onConflict: 'id' },
    )
    if (profileError) throw profileError
  }

  // Also verify master admin profile
  await supabase.from('profiles').upsert(
    {
      id: MASTER_ADMIN_ID,
      email: 'admin@festivo.org',
      full_name: 'Campus Administrator [Demo Superuser]',
      institution: 'Horizon Institute of Technology',
      department: 'Central Student Affairs Directorate',
      experience_level: 'advanced',
      interests: ['Campus Administration', 'Event Governance'],
      skills: ['Operations', 'Authorization'],
      profile_completed: true,
      profile_completed_at: new Date('2026-09-01T12:00:00Z').toISOString(),
    },
    { onConflict: 'id' },
  )

  return userMap
}

// ---------------------------------------------------------------------------
// 2. Clubs & Fests Structure
// ---------------------------------------------------------------------------
const CLUBS = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    name: 'Apex Technology Society [Demo]',
    slug: 'apex-technology-society',
    category: 'Technology',
    tagline: 'Pioneering student software, intelligent robotics, and open systems.',
    description:
      'Apex Technology Society is Horizon Campus premier engineering and computer society. We organize collegiate hackathons, algorithmic leagues, robotics exhibitions, and open-source sprints to prepare students for impactful technology careers.',
    logoUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://apextech.horizon.edu',
    facebookUrl: null,
    segments: [
      {
        id: '44444444-4444-4444-4444-444444444101',
        title: 'Software & Web Systems',
        description:
          '[Demo] Collaborative engineering of full-stack cloud applications, scalable microservices, and student utilities.',
        imageUrl:
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '44444444-4444-4444-4444-444444444102',
        title: 'Robotics & Hardware Labs',
        description:
          '[Demo] Autonomous navigation, micro-controller circuits, robotic arms, and smart IoT sensor architectures.',
        imageUrl:
          'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        id: '44444444-4444-4444-4444-444444444103',
        title: 'Competitive Programming League',
        description:
          '[Demo] Algorithmic problem-solving, graph algorithms, dynamic programming, and ICPC collegiate challenge training.',
        imageUrl:
          'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: '55555555-5555-5555-5555-555555555101',
        title: 'National Collegiate Hackathon Champions 2025 [Demo]',
        description:
          '[Demo] Awarded First Place overall for an autonomous emergency dispatch network powered by distributed mesh protocol.',
        achievedOn: '2025-11-20',
        awardedBy: 'National Tech Council',
        imageUrl:
          'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '55555555-5555-5555-5555-555555555102',
        title: 'Best Engineering Student Chapter of the Year [Demo]',
        description:
          '[Demo] Recognized for exemplary collegiate leadership, technical mentorship, and high-impact campus tech initiatives.',
        achievedOn: '2025-06-14',
        awardedBy: 'Horizon Academic Senate',
        imageUrl:
          'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
    ],
    gallery: [
      {
        id: '66666666-6666-6666-6666-666666666101',
        imageUrl:
          'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
        altText: 'Apex Tech Hackathon Finals [Demo]',
        caption: '[Demo] Collegiate engineers collaborating late into the night during the annual system sprint.',
        sortOrder: 1,
      },
      {
        id: '66666666-6666-6666-6666-666666666102',
        imageUrl:
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        altText: 'Robotics Embedded Hardware Lab [Demo]',
        caption: '[Demo] Sensor calibration and soldering session for autonomous rover competition entries.',
        sortOrder: 2,
      },
      {
        id: '66666666-6666-6666-6666-666666666103',
        imageUrl:
          'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
        altText: 'Cloud Architecture Workshop [Demo]',
        caption: '[Demo] High-throughput backend systems seminar delivered by student architects.',
        sortOrder: 3,
      },
    ],
    upcomingFest: {
      id: '33333333-3333-3333-3333-333333333101',
      title: 'TechNova 2026: Horizon Tech Carnival [Demo]',
      slug: 'technova-2026',
      category: 'Technology & Computing',
      description:
        '[Demo] Horizon flagship multi-day engineering carnival featuring collegiate programming, web systems hackathon, and robotics arenas.',
      startsAt: '2026-11-12T09:00:00+06:00',
      endsAt: '2026-11-14T20:00:00+06:00',
      registrationOpensAt: '2026-10-01T00:00:00+06:00',
      registrationClosesAt: '2026-11-10T23:59:59+06:00',
      locationName: 'Horizon Engineering Complex & Main Auditorium',
      locationAddress: 'Building A, Innovation Boulevard, Campus North',
      bannerUrl:
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777101',
          title: 'Horizon Collegiate Programming Contest [Demo]',
          slug: 'horizon-collegiate-programming-contest',
          category: 'Competitive Programming',
          description:
            '[Demo] A five-hour intense algorithmic contest testing dynamic programming, graph traversal, number theory, and data structures.',
          startsAt: '2026-11-12T10:00:00+06:00',
          endsAt: '2026-11-12T15:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-10T23:59:59+06:00',
          venue: 'Computer Science Lab 301',
          registrationMode: 'individual',
          capacity: 60,
          teamMinSize: null,
          teamMaxSize: null,
          rules:
            '1. Solo participation only.\n2. C++, Python, and Java standard compilers supported.\n3. Internet access strictly blocked during contest runtime.',
          demoState: 'open_with_capacity',
          confirmedCount: 15, // Leaves 45 available units
        },
        {
          id: '77777777-7777-7777-7777-777777777102',
          title: 'Full-Stack Web Systems Challenge [Demo]',
          slug: 'web-systems-challenge',
          category: 'Software Engineering',
          description:
            '[Demo] Build a high-performance, accessible real-time collaboration tool within 36 hours. Scored on architecture, UX, and test coverage.',
          startsAt: '2026-11-13T09:00:00+06:00',
          endsAt: '2026-11-14T18:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-10T23:59:59+06:00',
          venue: 'Horizon MakerSpace Hub',
          registrationMode: 'team',
          capacity: 4, // 4 teams capacity
          teamMinSize: 2,
          teamMaxSize: 4,
          waitlistEnabled: true,
          rules:
            '1. Teams must comprise 2 to 4 student members.\n2. Boilerplate starter code permitted, but original implementation required.\n3. Live demo before judging panel.',
          demoState: 'full_with_waitlist',
          confirmedCount: 4, // 4 teams confirmed -> capacity is 0!
          waitlistCount: 2, // 2 teams on waitlist
        },
        {
          id: '77777777-7777-7777-7777-777777777103',
          title: 'Autonomous Robotics Showcase & Battle [Demo]',
          slug: 'robotics-showcase',
          category: 'Robotics',
          description:
            '[Demo] Collegiate battle bot showcase and line-follower obstacle speed sprint in an enclosed obstacle arena.',
          startsAt: '2026-11-13T14:00:00+06:00', // Overlaps with Web Challenge on Nov 13!
          endsAt: '2026-11-13T17:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-10T23:59:59+06:00',
          venue: 'Central Robotics Arena, North Quad',
          registrationMode: 'team',
          capacity: 8,
          teamMinSize: 2,
          teamMaxSize: 4,
          rules:
            '1. Robots must adhere to 5kg weight constraint.\n2. Remote fail-safe kill switch required.\n3. Safety goggles mandatory inside pit perimeter.',
          demoState: 'overlapping_schedule',
          confirmedCount: 3,
        },
      ],
    },
    pastFest: {
      id: '33333333-3333-3333-3333-333333333102',
      title: 'Apex InnoTech Summit 2025 [Demo]',
      slug: 'apex-innotech-summit-2025',
      category: 'Technology',
      description:
        '[Demo] The 2025 edition of Horizon engineering conference featuring national hackathon tracks and student project exhibitions.',
      startsAt: '2025-10-15T09:00:00+06:00',
      endsAt: '2025-10-17T18:00:00+06:00',
      operationalStatus: 'completed',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777104',
          title: 'National Collegiate Hackathon 2025 [Demo]',
          slug: 'national-collegiate-hackathon-2025',
          category: 'Software Engineering',
          description: '[Demo] The flagship 48-hour development challenge of 2025.',
          startsAt: '2025-10-15T10:00:00+06:00',
          endsAt: '2025-10-17T16:00:00+06:00',
          registrationMode: 'team',
          capacity: 12,
          teamMinSize: 2,
          teamMaxSize: 4,
          operationalStatus: 'completed',
        },
        {
          id: '77777777-7777-7777-7777-777777777105',
          title: 'RoboMaze Navigation Challenge 2025 [Demo]',
          slug: 'robomaze-challenge-2025',
          category: 'Robotics',
          description: '[Demo] Obstacle navigation contest for micro-controller automated rovers.',
          startsAt: '2025-10-16T13:00:00+06:00',
          endsAt: '2025-10-16T17:00:00+06:00',
          registrationMode: 'individual',
          capacity: 20,
          teamMinSize: null,
          teamMaxSize: null,
          operationalStatus: 'completed',
        },
      ],
      showcases: [
        {
          id: '88888888-8888-8888-8888-888888888101',
          eventId: '77777777-7777-7777-7777-777777777104',
          title: 'National Collegiate Hackathon 2025 Recap [Demo]',
          description:
            '[Demo] 36 teams competed across cloud, AI, and mobility tracks with over $10,000 in student project grants awarded.',
          showcaseType: 'recap',
          occurredOn: '2025-10-17',
          coverImageUrl:
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
          externalUrl: 'https://apextech.horizon.edu/hackathon-2025',
          sortOrder: 1,
        },
        {
          id: '88888888-8888-8888-8888-888888888102',
          eventId: '77777777-7777-7777-7777-777777777105',
          title: 'RoboMaze Navigation Finals 2025 [Demo]',
          description:
            '[Demo] Over 40 autonomous rovers traversed dynamic randomized obstacle mazes with millisecond precision.',
          showcaseType: 'competition',
          occurredOn: '2025-10-16',
          coverImageUrl:
            'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
          sortOrder: 2,
        },
      ],
    },
  },

  // 2. PHOTOGRAPHY CLUB
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Lumina Photography & Media Club [Demo]',
    slug: 'lumina-photography-club',
    category: 'Photography',
    tagline: 'Capturing moments, telling campus stories, and exploring visual arts.',
    description:
      'Lumina Photography & Media Club unites collegiate photographers, documentary creators, and visual artists. We host exhibitions, photo walks, photojournalism projects, and digital editing masterclasses.',
    logoUrl:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://luminaphoto.horizon.edu',
    facebookUrl: null,
    segments: [
      {
        id: '44444444-4444-4444-4444-444444444201',
        title: 'Visual Storytelling & Portraiture',
        description:
          '[Demo] Studio lighting techniques, natural light portraits, and narrative-driven photographic sequences.',
        imageUrl:
          'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '44444444-4444-4444-4444-444444444202',
        title: 'Photojournalism & Campus Documentary',
        description:
          '[Demo] Covering collegiate cultural milestones, campus athletics, student activism, and everyday life.',
        imageUrl:
          'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        id: '44444444-4444-4444-4444-444444444203',
        title: 'Digital Post-Processing & Darkroom',
        description:
          '[Demo] RAW image development, color science, color grading suites, and archival print calibration.',
        imageUrl:
          'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: '55555555-5555-5555-5555-555555555201',
        title: 'Inter-University Photo Salon Grand Prize 2025 [Demo]',
        description:
          '[Demo] Awarded Best Collegiate Gallery Curation at the National University Photographic Arts Biennial.',
        achievedOn: '2025-10-04',
        awardedBy: 'Federation of Photographic Art',
        imageUrl:
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '55555555-5555-5555-5555-555555555202',
        title: 'Documentary Media Chapter Excellence Citation [Demo]',
        description:
          '[Demo] Commended for student photojournalism highlighting campus environmental stewardship and biodiversity.',
        achievedOn: '2025-05-18',
        awardedBy: 'Horizon Media Board',
        imageUrl:
          'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
    ],
    gallery: [
      {
        id: '66666666-6666-6666-6666-666666666201',
        imageUrl:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
        altText: 'Campus Golden Hour Photo Walk [Demo]',
        caption: '[Demo] Student photographers capturing dynamic architectural shadows across the South Courtyard.',
        sortOrder: 1,
      },
      {
        id: '66666666-6666-6666-6666-666666666202',
        imageUrl:
          'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
        altText: 'Annual Photo Exhibition Gallery [Demo]',
        caption: '[Demo] Curated gallery wall featuring over 80 framed student photographic works.',
        sortOrder: 2,
      },
      {
        id: '66666666-6666-6666-6666-666666666203',
        imageUrl:
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        altText: 'Film Photography Masterclass [Demo]',
        caption: '[Demo] Hands-on analog camera mechanics and darkroom exposure demonstration.',
        sortOrder: 3,
      },
    ],
    upcomingFest: {
      id: '33333333-3333-3333-3333-333333333201',
      title: 'Aperture Horizon Photo Fest 2026 [Demo]',
      slug: 'aperture-horizon-2026',
      category: 'Photography & Visual Arts',
      description:
        '[Demo] A three-day festival of visual arts celebrating campus culture with photo walks, curation galleries, and studio workshops.',
      startsAt: '2026-11-16T09:00:00+06:00',
      endsAt: '2026-11-18T19:00:00+06:00',
      registrationOpensAt: '2026-10-01T00:00:00+06:00',
      registrationClosesAt: '2026-11-14T23:59:59+06:00',
      locationName: 'Horizon Fine Arts Pavilion & Central Plaza',
      bannerUrl:
        'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777201',
          title: 'Campus Architecture Photo Walk [Demo]',
          slug: 'campus-photo-walk',
          category: 'Street Photography',
          description:
            '[Demo] Guided expedition across campus architectural landmarks focusing on natural light, geometric framing, and urban scale.',
          startsAt: '2026-11-16T10:00:00+06:00',
          endsAt: '2026-11-16T13:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-14T23:59:59+06:00',
          venue: 'Horizon Clocktower Plaza Meetup',
          registrationMode: 'individual',
          capacity: 30,
          teamMinSize: null,
          teamMaxSize: null,
          rules:
            '1. Any camera type allowed (DSLR, Mirrorless, Smartphone).\n2. Participants submit top 3 unedited frames at end of route.',
          demoState: 'open_with_capacity',
          confirmedCount: 8, // Leaves 22 available units
        },
        {
          id: '77777777-7777-7777-7777-777777777202',
          title: 'RAW Color Grading & Editing Workshop [Demo]',
          slug: 'editing-workshop',
          category: 'Post-Processing',
          description:
            '[Demo] Intensive laboratory session covering tonal curves, color grading matrices, and print-ready export calibration.',
          startsAt: '2026-11-17T14:00:00+06:00',
          endsAt: '2026-11-17T17:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-14T23:59:59+06:00',
          venue: 'Digital Arts Lab 204',
          registrationMode: 'individual',
          capacity: 6, // Small lab capacity
          teamMinSize: null,
          teamMaxSize: null,
          waitlistEnabled: false, // Strictly full when cap reached!
          rules:
            '1. Bring a laptop with Lightroom or Capture One installed.\n2. Sample RAW files provided on entry.',
          demoState: 'full_event',
          confirmedCount: 6, // Capacity fully exhausted -> registrationState: 'full'
        },
        {
          id: '77777777-7777-7777-7777-777777777203',
          title: 'Curated Annual Photo Exhibition [Demo]',
          slug: 'photo-exhibition',
          category: 'Exhibition',
          description:
            '[Demo] Juried student gallery showcase displaying 60 selected prints reviewed by professional photographers.',
          startsAt: '2026-11-18T10:00:00+06:00',
          endsAt: '2026-11-18T18:00:00+06:00',
          registrationOpensAt: '2026-09-15T00:00:00+06:00',
          registrationClosesAt: '2026-10-05T23:59:59+06:00', // Registration deadline closed on Oct 5!
          venue: 'Fine Arts Atrium',
          registrationMode: 'individual',
          capacity: 60,
          teamMinSize: null,
          teamMaxSize: null,
          rules:
            '1. Submission prints must be minimum 300 DPI.\n2. Artist statement required per piece.',
          demoState: 'registration_closed',
          confirmedCount: 24,
        },
      ],
    },
    pastFest: {
      id: '33333333-3333-3333-3333-333333333202',
      title: 'Aperture Retrospective 2025 [Demo]',
      slug: 'aperture-retrospective-2025',
      category: 'Photography',
      description:
        '[Demo] The 2025 campus photography symposium and documentary film showcase.',
      startsAt: '2025-11-10T09:00:00+06:00',
      endsAt: '2025-11-12T18:00:00+06:00',
      operationalStatus: 'completed',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777204',
          title: 'Moments in Monochrome Exhibition 2025 [Demo]',
          slug: 'moments-in-monochrome-2025',
          category: 'Exhibition',
          description: '[Demo] Black and white film prints celebrating campus heritage.',
          startsAt: '2025-11-10T10:00:00+06:00',
          endsAt: '2025-11-12T16:00:00+06:00',
          registrationMode: 'individual',
          capacity: 40,
          teamMinSize: null,
          teamMaxSize: null,
          operationalStatus: 'completed',
        },
      ],
      showcases: [
        {
          id: '88888888-8888-8888-8888-888888888201',
          eventId: '77777777-7777-7777-7777-777777777204',
          title: 'Moments in Monochrome Exhibition Showcase [Demo]',
          description:
            '[Demo] A curated collection of 50 analog silver-gelatin prints exploring human resilience and campus architecture.',
          showcaseType: 'event',
          occurredOn: '2025-11-12',
          coverImageUrl:
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
          sortOrder: 1,
        },
      ],
    },
  },

  // 3. BUSINESS AND CAREER CLUB
  {
    id: '22222222-2222-2222-2222-222222222223',
    name: 'Nexus Business & Career Guild [Demo]',
    slug: 'nexus-business-career-guild',
    category: 'Business and Career',
    tagline: 'Empowering future executives, entrepreneurs, and corporate innovators.',
    description:
      'Nexus Business & Career Guild bridges academic excellence with executive leadership. We organize prestigious case competitions, seed pitch challenges, networking galas, and resume review clinics.',
    logoUrl:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://nexusguild.horizon.edu',
    facebookUrl: null,
    segments: [
      {
        id: '44444444-4444-4444-4444-444444444301',
        title: 'Strategic Case Analysis',
        description:
          '[Demo] Management consulting frameworks, financial modeling, and competitive strategy breakdown.',
        imageUrl:
          'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '44444444-4444-4444-4444-444444444302',
        title: 'Venture Pitch & Incubation',
        description:
          '[Demo] Early-stage venture incubation, pitch deck design, customer discovery, and angel investor networking.',
        imageUrl:
          'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        id: '44444444-4444-4444-4444-444444444303',
        title: 'Executive Career Prep',
        description:
          '[Demo] Behavioral interview bootcamps, resume optimization, and executive shadowing sessions.',
        imageUrl:
          'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: '55555555-5555-5555-5555-555555555301',
        title: 'National Case League Champions 2025 [Demo]',
        description:
          '[Demo] Defeated 24 collegiate business schools in a 48-hour multinational supply chain strategy challenge.',
        achievedOn: '2025-11-08',
        awardedBy: 'Apex Management Institute',
        imageUrl:
          'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '55555555-5555-5555-5555-555555555302',
        title: 'Excellence in Corporate Partnership Award [Demo]',
        description:
          '[Demo] Connected over 150 student interns with premier consulting and tech employers.',
        achievedOn: '2025-07-22',
        awardedBy: 'Horizon Business School',
        imageUrl:
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
    ],
    gallery: [
      {
        id: '66666666-6666-6666-6666-666666666301',
        imageUrl:
          'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
        altText: 'Annual Venture Pitch Challenge [Demo]',
        caption: '[Demo] Student founder pitching an AI logistical automation venture before judges.',
        sortOrder: 1,
      },
      {
        id: '66666666-6666-6666-6666-666666666302',
        imageUrl:
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        altText: 'Business Strategy Roundtable [Demo]',
        caption: '[Demo] Guild members analyzing corporate case studies in the executive boardroom.',
        sortOrder: 2,
      },
      {
        id: '66666666-6666-6666-6666-666666666303',
        imageUrl:
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
        altText: 'Corporate Networking Reception [Demo]',
        caption: '[Demo] Student delegates networking with industry partners at the annual gala.',
        sortOrder: 3,
      },
    ],
    upcomingFest: {
      id: '33333333-3333-3333-3333-333333333301',
      title: 'Vanguard Leadership & Career Summit 2026 [Demo]',
      slug: 'vanguard-summit-2026',
      category: 'Business & Leadership',
      description:
        '[Demo] The flagship campus conference for prospective consultants, entrepreneurs, and finance leaders.',
      startsAt: '2026-11-20T09:00:00+06:00',
      endsAt: '2026-11-22T19:00:00+06:00',
      registrationOpensAt: '2026-10-01T00:00:00+06:00',
      registrationClosesAt: '2026-11-18T23:59:59+06:00',
      locationName: 'Horizon Executive Center & Grand Ballroom',
      bannerUrl:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777301',
          title: 'Business Case Competition 2026 [Demo]',
          slug: 'business-case-competition',
          category: 'Management Strategy',
          description:
            '[Demo] 36-hour live case cracking on renewable energy infrastructure. Teams present to venture partners.',
          startsAt: '2026-11-20T10:00:00+06:00',
          endsAt: '2026-11-21T16:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-18T23:59:59+06:00',
          venue: 'Executive Seminar Hall 1',
          registrationMode: 'team',
          capacity: 15,
          teamMinSize: 3,
          teamMaxSize: 4,
          rules:
            '1. Teams must consist of 3 or 4 registered students.\n2. External mentorship prohibited during case window.\n3. 15-minute presentation followed by 10-minute Q&A.',
          demoState: 'open_with_capacity',
          confirmedCount: 5,
        },
        {
          id: '77777777-7777-7777-7777-777777777302',
          title: 'Collegiate Venture Pitch Challenge [Demo]',
          slug: 'pitch-challenge',
          category: 'Entrepreneurship',
          description:
            '[Demo] Fast-paced seed pitch competition for student-founded technological and social ventures.',
          startsAt: '2026-11-21T14:00:00+06:00',
          endsAt: '2026-11-21T18:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-18T23:59:59+06:00',
          venue: 'Auditorium Tiered Stage',
          registrationMode: 'team',
          capacity: 4, // 4 slots
          teamMinSize: 2,
          teamMaxSize: 4,
          waitlistEnabled: true,
          rules:
            '1. Slide deck must not exceed 10 slides.\n2. Working prototype or MVP demonstration required.\n3. 5-minute strict timer.',
          demoState: 'full_with_waitlist',
          confirmedCount: 4, // Full capacity!
          waitlistCount: 2,
        },
        {
          id: '77777777-7777-7777-7777-777777777303',
          title: 'Executive Career & Networking Workshop [Demo]',
          slug: 'career-workshop',
          category: 'Career Development',
          description:
            '[Demo] Small-group mentoring with corporate leaders covering executive resume crafting and interview strategy.',
          startsAt: '2026-11-21T14:00:00+06:00', // Overlaps with Pitch Challenge on Nov 21!
          endsAt: '2026-11-21T17:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-18T23:59:59+06:00',
          venue: 'Boardroom B, 3rd Floor',
          registrationMode: 'individual',
          capacity: 25,
          teamMinSize: null,
          teamMaxSize: null,
          rules: '1. Business formal attire mandatory.\n2. Bring 3 hard copies of current resume.',
          demoState: 'overlapping_schedule',
          confirmedCount: 10,
        },
      ],
    },
    pastFest: {
      id: '33333333-3333-3333-3333-333333333302',
      title: 'Nexus Enterprise Forum 2025 [Demo]',
      slug: 'nexus-enterprise-forum-2025',
      category: 'Business',
      description:
        '[Demo] The 2025 student entrepreneurship expo connecting young founders with venture capital.',
      startsAt: '2025-11-05T09:00:00+06:00',
      endsAt: '2025-11-07T18:00:00+06:00',
      operationalStatus: 'completed',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777304',
          title: 'National Case Crackers Invitational 2025 [Demo]',
          slug: 'national-case-crackers-2025',
          category: 'Management Strategy',
          description: '[Demo] The 2025 inter-university case challenge.',
          startsAt: '2025-11-05T10:00:00+06:00',
          endsAt: '2025-11-07T16:00:00+06:00',
          registrationMode: 'team',
          capacity: 10,
          teamMinSize: 3,
          teamMaxSize: 4,
          operationalStatus: 'completed',
        },
      ],
      showcases: [
        {
          id: '88888888-8888-8888-8888-888888888301',
          eventId: '77777777-7777-7777-7777-777777777304',
          title: 'Case Crackers Invitational Finals 2025 [Demo]',
          description:
            '[Demo] 12 collegiate teams presented cross-border expansion blueprints for Southeast Asian e-commerce logistics.',
          showcaseType: 'competition',
          occurredOn: '2025-11-07',
          coverImageUrl:
            'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
          sortOrder: 1,
        },
      ],
    },
  },

  // 4. SOCIAL SERVICE CLUB
  {
    id: '22222222-2222-2222-2222-222222222224',
    name: 'Beacon Social Service League [Demo]',
    slug: 'beacon-social-service-league',
    category: 'Social Service',
    tagline: 'Committed to civic action, community welfare, and sustainable impact.',
    description:
      'Beacon Social Service League organizes student-led social development projects, disaster relief drives, blood donation marathons, and educational tutoring programs for underserved communities.',
    logoUrl:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://beaconleague.horizon.edu',
    facebookUrl: null,
    segments: [
      {
        id: '44444444-4444-4444-4444-444444444401',
        title: 'Community Health & Blood Aid',
        description:
          '[Demo] Voluntary blood donation drives, free health screening camps, and mental wellness advocacy.',
        imageUrl:
          'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '44444444-4444-4444-4444-444444444402',
        title: 'Youth Literacy & Mentorship',
        description:
          '[Demo] Tutoring for underprivileged primary school children, book collection drives, and STEM access.',
        imageUrl:
          'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        id: '44444444-4444-4444-4444-444444444403',
        title: 'Environmental Stewardship',
        description:
          '[Demo] Campus recycling initiatives, urban tree planting, and zero-waste community workshops.',
        imageUrl:
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: '55555555-5555-5555-5555-555555555401',
        title: 'National Youth Civic Service Medal 2025 [Demo]',
        description:
          '[Demo] Conferred in recognition of mobilizing 1,200 student volunteers and delivering 5,000 emergency food relief packages.',
        achievedOn: '2025-12-05',
        awardedBy: 'Ministry of Social Welfare',
        imageUrl:
          'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '55555555-5555-5555-5555-555555555402',
        title: 'Green Campus Stewardship Trophy [Demo]',
        description:
          '[Demo] Successfully diverted 15 tons of organic waste from campus kitchens into community composting.',
        achievedOn: '2025-04-22',
        awardedBy: 'Clean Planet Foundation',
        imageUrl:
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
    ],
    gallery: [
      {
        id: '66666666-6666-6666-6666-666666666401',
        imageUrl:
          'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80',
        altText: 'Community Food Relief Packing [Demo]',
        caption: '[Demo] Student volunteers sorting non-perishable goods for the regional distribution center.',
        sortOrder: 1,
      },
      {
        id: '66666666-6666-6666-6666-666666666402',
        imageUrl:
          'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        altText: 'Youth Literacy Weekend Camp [Demo]',
        caption: '[Demo] League mentors helping elementary students solve math and reading exercises.',
        sortOrder: 2,
      },
      {
        id: '66666666-6666-6666-6666-666666666403',
        imageUrl:
          'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        altText: 'Urban Forest Afforestation Day [Demo]',
        caption: '[Demo] Planting 500 indigenous saplings across the river basin ecological reserve.',
        sortOrder: 3,
      },
    ],
    upcomingFest: {
      id: '33333333-3333-3333-3333-333333333401',
      title: 'Compassion Conclave & Action Summit 2026 [Demo]',
      slug: 'compassion-conclave-2026',
      category: 'Civic Service & Sustainability',
      description:
        '[Demo] A three-day civic conference gathering student activists, volunteers, and NGOs for hands-on community service.',
      startsAt: '2026-11-25T09:00:00+06:00',
      endsAt: '2026-11-27T18:00:00+06:00',
      registrationOpensAt: '2026-10-01T00:00:00+06:00',
      registrationClosesAt: '2026-11-23T23:59:59+06:00',
      locationName: 'Horizon Student Union & Civic Quad',
      bannerUrl:
        'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777401',
          title: 'Volunteer Orientation & Field Training [Demo]',
          slug: 'volunteer-orientation',
          category: 'Training',
          description:
            '[Demo] Comprehensive briefing on safety protocols, ethics of civic engagement, and community liaison skills.',
          startsAt: '2026-11-25T10:00:00+06:00',
          endsAt: '2026-11-25T13:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-23T23:59:59+06:00',
          venue: 'Union Multi-Purpose Hall',
          registrationMode: 'individual',
          capacity: 50,
          teamMinSize: null,
          teamMaxSize: null,
          rules:
            '1. Mandatory attendance for all first-time volunteers.\n2. Digital certificate issued upon completion.',
          demoState: 'open_with_capacity',
          confirmedCount: 12, // Leaves 38 available
        },
        {
          id: '77777777-7777-7777-7777-777777777402',
          title: 'Metropolitan Community Service Day [Demo]',
          slug: 'community-service-day',
          category: 'Field Action',
          description:
            '[Demo] Coordinated citywide community clean-up, urban gardening, and shelter refurbishment day.',
          startsAt: '2026-11-26T08:00:00+06:00',
          endsAt: '2026-11-26T16:00:00+06:00',
          registrationOpensAt: '2026-09-15T00:00:00+06:00',
          registrationClosesAt: '2026-10-04T23:59:59+06:00', // Registration window passed on Oct 4!
          venue: 'Departs from Campus Transportation Hub',
          registrationMode: 'team',
          capacity: 10,
          teamMinSize: 2,
          teamMaxSize: 5,
          rules:
            '1. Work gloves and protective gear supplied.\n2. Teams must check in by 07:30 AM on event morning.',
          demoState: 'registration_closed',
          confirmedCount: 5,
        },
        {
          id: '77777777-7777-7777-7777-777777777403',
          title: 'Grassroots Fundraising Workshop [Demo]',
          slug: 'fundraising-workshop',
          category: 'Workshop',
          description:
            '[Demo] Intensive workshop on micro-grant writing, community crowdfunding, and financial transparency.',
          startsAt: '2026-09-28T10:00:00+06:00', // Completed event!
          endsAt: '2026-09-28T16:00:00+06:00',
          registrationOpensAt: '2026-09-01T00:00:00+06:00',
          registrationClosesAt: '2026-09-26T23:59:59+06:00',
          venue: 'Civic Leadership Room 102',
          registrationMode: 'individual',
          capacity: 30,
          teamMinSize: null,
          teamMaxSize: null,
          operationalStatus: 'completed',
          rules: '1. Post-event survey submission required.',
          demoState: 'completed_event',
          confirmedCount: 18,
        },
      ],
    },
    pastFest: {
      id: '33333333-3333-3333-3333-333333333402',
      title: 'Horizon Hope Outreach Gala 2025 [Demo]',
      slug: 'horizon-hope-gala-2025',
      category: 'Social Service',
      description:
        '[Demo] The 2025 community impact exhibition celebrating volunteer achievements and corporate donors.',
      startsAt: '2025-11-28T10:00:00+06:00',
      endsAt: '2025-11-30T18:00:00+06:00',
      operationalStatus: 'completed',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777404',
          title: 'Winter Relief Drive Kickoff 2025 [Demo]',
          slug: 'winter-relief-drive-2025',
          category: 'Relief Drive',
          description: '[Demo] Mobilizing 2,000 blankets and winter clothes.',
          startsAt: '2025-11-28T11:00:00+06:00',
          endsAt: '2025-11-30T16:00:00+06:00',
          registrationMode: 'individual',
          capacity: 50,
          teamMinSize: null,
          teamMaxSize: null,
          operationalStatus: 'completed',
        },
      ],
      showcases: [
        {
          id: '88888888-8888-8888-8888-888888888401',
          eventId: '77777777-7777-7777-7777-777777777404',
          title: 'Winter Clothing Relief Drive Showcase [Demo]',
          description:
            '[Demo] Mobilized over 2,500 winter garments distributed to 12 rural community centers.',
          showcaseType: 'project',
          occurredOn: '2025-11-30',
          coverImageUrl:
            'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=800&q=80',
          sortOrder: 1,
        },
      ],
    },
  },

  // 5. SCIENCE CLUB
  {
    id: '22222222-2222-2222-2222-222222222225',
    name: 'Vertex Science Society [Demo]',
    slug: 'vertex-science-society',
    category: 'Science',
    tagline: 'Advancing scientific curiosity, research inquiry, and discovery.',
    description:
      'Vertex Science Society fosters collegiate research, theoretical science, astrophysics discussions, and inter-collegiate science competitions. We run laboratory poster sessions, science olympiads, and guest colloquia with world-class researchers.',
    logoUrl:
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://vertexscience.horizon.edu',
    facebookUrl: null,
    segments: [
      {
        id: '44444444-4444-4444-4444-444444444501',
        title: 'Theoretical Physics & Astrophysics',
        description:
          '[Demo] General relativity, quantum electrodynamics, observational astronomy, and cosmological modeling.',
        imageUrl:
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '44444444-4444-4444-4444-444444444502',
        title: 'Biochemistry & Molecular Sciences',
        description:
          '[Demo] Genetic sequencing techniques, enzyme kinetics, cellular biology, and green synthesis.',
        imageUrl:
          'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        id: '44444444-4444-4444-4444-444444444503',
        title: 'Collegiate Olympiad Training',
        description:
          '[Demo] Rigorous problem solving in physics, chemistry, and mathematics for national olympiad challenges.',
        imageUrl:
          'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: '55555555-5555-5555-5555-555555555501',
        title: 'Collegiate Science League Overall Champions 2025 [Demo]',
        description:
          '[Demo] Secured 5 Gold and 3 Silver medals across Physics, Chemistry, and Mathematics divisions.',
        achievedOn: '2025-11-15',
        awardedBy: 'National Academy of Sciences',
        imageUrl:
          'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        id: '55555555-5555-5555-5555-555555555502',
        title: 'Pioneering Undergraduate Research Chapter Award [Demo]',
        description:
          '[Demo] Recognized for publishing 8 peer-reviewed student research abstracts in indexed regional journals.',
        achievedOn: '2025-08-30',
        awardedBy: 'Horizon Research Council',
        imageUrl:
          'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
    ],
    gallery: [
      {
        id: '66666666-6666-6666-6666-666666666501',
        imageUrl:
          'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80',
        altText: 'Spectroscopy Laboratory Research [Demo]',
        caption: '[Demo] Undergraduate researchers recording optical emission spectrum data.',
        sortOrder: 1,
      },
      {
        id: '66666666-6666-6666-6666-666666666502',
        imageUrl:
          'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        altText: 'Undergraduate Research Poster Session [Demo]',
        caption: '[Demo] Student presenting nanotechnology findings to university faculty judges.',
        sortOrder: 2,
      },
      {
        id: '66666666-6666-6666-6666-666666666503',
        imageUrl:
          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        altText: 'Astronomy Night Telescope Observation [Demo]',
        caption: '[Demo] Observatory dome viewing session for Jupiter and deep-sky constellations.',
        sortOrder: 3,
      },
    ],
    upcomingFest: {
      id: '33333333-3333-3333-3333-333333333501',
      title: 'Quantum Horizon Science Fest 2026 [Demo]',
      slug: 'quantum-horizon-2026',
      category: 'Science & Discovery',
      description:
        '[Demo] The annual campus celebration of scientific inquiry featuring olympiads, research poster presentations, and interactive science quiz battles.',
      startsAt: '2026-11-28T09:00:00+06:00',
      endsAt: '2026-11-30T19:00:00+06:00',
      registrationOpensAt: '2026-10-01T00:00:00+06:00',
      registrationClosesAt: '2026-11-26T23:59:59+06:00',
      locationName: 'Horizon Science Complex & Planetarium Hall',
      bannerUrl:
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777501',
          title: 'National Collegiate Science Olympiad [Demo]',
          slug: 'science-olympiad',
          category: 'Olympiad',
          description:
            '[Demo] 3-hour rigorous multi-disciplinary examination in Physics, Chemistry, and Advanced Mathematics.',
          startsAt: '2026-11-28T10:00:00+06:00',
          endsAt: '2026-11-28T13:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-26T23:59:59+06:00',
          venue: 'Science Lecture Hall A',
          registrationMode: 'individual',
          capacity: 100,
          teamMinSize: null,
          teamMaxSize: null,
          rules:
            '1. Non-programmable scientific calculators permitted.\n2. Formula reference booklet provided on entry.\n3. Negative marking for incorrect answers.',
          demoState: 'open_with_capacity',
          confirmedCount: 25, // Leaves 75 available units
        },
        {
          id: '77777777-7777-7777-7777-777777777502',
          title: 'Undergraduate Research Poster Exhibition [Demo]',
          slug: 'research-poster-exhibition',
          category: 'Scientific Research',
          description:
            '[Demo] Presentation of original undergraduate research findings across natural, physical, and computational sciences.',
          startsAt: '2026-11-29T14:00:00+06:00',
          endsAt: '2026-11-29T18:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-26T23:59:59+06:00',
          venue: 'Grand Science Concourse',
          registrationMode: 'team',
          capacity: 4, // 4 poster boards
          teamMinSize: 2,
          teamMaxSize: 3,
          waitlistEnabled: true,
          rules:
            '1. Standard A0 size poster format.\n2. 5-minute lightning presentation before rotating faculty panel.',
          demoState: 'full_with_waitlist',
          confirmedCount: 4, // Full capacity!
          waitlistCount: 1,
        },
        {
          id: '77777777-7777-7777-7777-777777777503',
          title: 'Inter-Collegiate Science Quiz Battle [Demo]',
          slug: 'science-quiz',
          category: 'Quiz Competition',
          description:
            '[Demo] Rapid-fire buzzer quiz testing scientific history, breakthrough discoveries, Nobel laureates, and astrophysics.',
          startsAt: '2026-11-29T14:00:00+06:00', // Overlaps with Research Poster session on Nov 29!
          endsAt: '2026-11-29T17:00:00+06:00',
          registrationOpensAt: '2026-10-01T00:00:00+06:00',
          registrationClosesAt: '2026-11-26T23:59:59+06:00',
          venue: 'Planetarium Theater',
          registrationMode: 'team',
          capacity: 12,
          teamMinSize: 2,
          teamMaxSize: 4,
          rules:
            '1. Teams must seat 2 to 4 members.\n2. Electronic buzzer lockout protocol.\n3. Negative points on premature buzz during audio questions.',
          demoState: 'overlapping_schedule',
          confirmedCount: 6,
        },
      ],
    },
    pastFest: {
      id: '33333333-3333-3333-3333-333333333502',
      title: 'Vertex Discovery Symposium 2025 [Demo]',
      slug: 'vertex-discovery-symposium-2025',
      category: 'Science',
      description:
        '[Demo] The 2025 science symposium featuring astrophysics colloquia and chemistry battles.',
      startsAt: '2025-10-20T09:00:00+06:00',
      endsAt: '2025-10-22T18:00:00+06:00',
      operationalStatus: 'completed',
      events: [
        {
          id: '77777777-7777-7777-7777-777777777504',
          title: 'Astrophysics Colloquium 2025 [Demo]',
          slug: 'astrophysics-colloquium-2025',
          category: 'Physics',
          description: '[Demo] Keynote presentations on exoplanet atmosphere spectroscopy.',
          startsAt: '2025-10-20T10:00:00+06:00',
          endsAt: '2025-10-22T16:00:00+06:00',
          registrationMode: 'individual',
          capacity: 40,
          teamMinSize: null,
          teamMaxSize: null,
          operationalStatus: 'completed',
        },
      ],
      showcases: [
        {
          id: '88888888-8888-8888-8888-888888888501',
          eventId: '77777777-7777-7777-7777-777777777504',
          title: 'Astrophysics Colloquium Showcase [Demo]',
          description:
            '[Demo] 15 student research papers presented with keynote from visiting national observatory director.',
          showcaseType: 'event',
          occurredOn: '2025-10-22',
          coverImageUrl:
            'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
          sortOrder: 1,
        },
      ],
    },
  },
]

// ---------------------------------------------------------------------------
// 3. Main Seeder Execution
// ---------------------------------------------------------------------------
async function main() {
  console.log('--- Starting Demo Data Seeding ---')

  // Step 1: Ensure users
  const userMap = await ensureDemoUsers()
  console.log('Users verified:', Array.from(userMap.keys()))

  const mainParticipantId = userMap.get('demo.participant@festivo.org')
  const p1Id = userMap.get('participant1@festivo.org')
  const p2Id = userMap.get('participant2@festivo.org')
  const p3Id = userMap.get('participant3@festivo.org')
  const p4Id = userMap.get('participant4@festivo.org')
  const p5Id = userMap.get('participant5@festivo.org')

  const participantPool = [mainParticipantId, p1Id, p2Id, p3Id, p4Id, p5Id]

  // Step 2: Ensure Institute
  const { error: instErr } = await supabase.from('institutes').upsert(
    {
      id: INSTITUTE_ID,
      name: 'Horizon Institute of Technology',
      slug: 'horizon-institute',
      tagline: 'Leading interdisciplinary campus for science, engineering, and civic leadership.',
      description:
        'Horizon Institute of Technology is a premier collegiate institution fostering innovation, ethical leadership, and active campus communities.',
      location_name: 'Horizon City Central Campus',
      is_active: true,
    },
    { onConflict: 'id' },
  )
  if (instErr) throw instErr
  console.log('Institute verified: Horizon Institute of Technology')

  // Step 3: Upsert Clubs & Memberships
  for (const club of CLUBS) {
    const { error: clubErr } = await supabase.from('organizations').upsert(
      {
        id: club.id,
        name: club.name,
        slug: club.slug,
        category: club.category,
        tagline: club.tagline,
        description: club.description,
        logo_url: club.logoUrl,
        cover_image_url: club.coverImageUrl,
        website_url: club.websiteUrl,
        facebook_url: club.facebookUrl,
        owner_id: MASTER_ADMIN_ID,
        institute_id: INSTITUTE_ID,
        is_active: true,
        is_public_profile: true,
      },
      { onConflict: 'id' },
    )
    if (clubErr) throw clubErr

    // Ensure Master Admin Membership
    await supabase.from('organization_memberships').upsert(
      {
        organization_id: club.id,
        user_id: MASTER_ADMIN_ID,
        role: 'organizer',
        is_active: true,
      },
      { onConflict: 'organization_id, user_id' },
    )

    // Ensure Scoped Organizer & Staff Memberships
    for (const demoUser of DEMO_USERS) {
      if (demoUser.scopedClubs && demoUser.scopedClubs.includes(club.id)) {
        const userId = userMap.get(demoUser.email)
        await supabase.from('organization_memberships').upsert(
          {
            organization_id: club.id,
            user_id: userId,
            role: demoUser.role === 'check_in_staff' ? 'check_in_staff' : 'organizer',
            is_active: true,
          },
          { onConflict: 'organization_id, user_id' },
        )
      }
    }

    // Step 4: Club Segments
    for (const seg of club.segments) {
      const { error: segErr } = await supabase.from('club_segments').upsert(
        {
          id: seg.id,
          organization_id: club.id,
          title: seg.title,
          description: seg.description,
          image_url: seg.imageUrl,
          sort_order: seg.sortOrder,
          is_published: true,
        },
        { onConflict: 'id' },
      )
      if (segErr) throw segErr
    }

    // Step 5: Club Achievements
    for (const ach of club.achievements) {
      const { error: achErr } = await supabase.from('club_achievements').upsert(
        {
          id: ach.id,
          organization_id: club.id,
          title: ach.title,
          description: ach.description,
          achieved_on: ach.achievedOn,
          awarded_by: ach.awardedBy,
          image_url: ach.imageUrl,
          sort_order: ach.sortOrder,
          is_published: true,
        },
        { onConflict: 'id' },
      )
      if (achErr) throw achErr
    }

    // Step 6: Club Gallery Items
    for (const gal of club.gallery) {
      const { error: galErr } = await supabase.from('club_gallery_items').upsert(
        {
          id: gal.id,
          organization_id: club.id,
          image_url: gal.imageUrl,
          alt_text: gal.altText,
          caption: gal.caption,
          taken_at: new Date('2026-09-15T14:30:00Z').toISOString(),
          sort_order: gal.sortOrder,
          is_published: true,
        },
        { onConflict: 'id' },
      )
      if (galErr) throw galErr
    }

    // Step 7: Upcoming Fest & Events
    const upFest = club.upcomingFest
    const { error: upFestErr } = await supabase.from('fests').upsert(
      {
        id: upFest.id,
        organization_id: club.id,
        title: upFest.title,
        slug: upFest.slug,
        category: upFest.category,
        description: upFest.description,
        starts_at: upFest.startsAt,
        ends_at: upFest.endsAt,
        registration_opens_at: upFest.registrationOpensAt,
        registration_closes_at: upFest.registrationClosesAt,
        location_name: upFest.locationName,
        banner_url: upFest.bannerUrl,
        delivery_format: upFest.deliveryFormat,
        operational_status: upFest.operationalStatus,
        status: 'published',
        published_at: new Date('2026-10-01T00:00:00Z').toISOString(),
      },
      { onConflict: 'id' },
    )
    if (upFestErr) throw upFestErr

    // Schedule items for upcoming fest
    const scheduleItems = [
      {
        id: `${upFest.id.slice(0, -3)}901`,
        fest_id: upFest.id,
        title: 'Opening Ceremony & Keynote Address [Demo]',
        description: '[Demo] Formal fest inauguration and welcome remarks by campus dean.',
        starts_at: upFest.startsAt,
        ends_at: new Date(new Date(upFest.startsAt).getTime() + 2 * 3600 * 1000).toISOString(),
        venue: upFest.locationName,
        sort_order: 1,
        is_published: true,
        published_at: new Date('2026-10-01T00:00:00Z').toISOString(),
      },
      {
        id: `${upFest.id.slice(0, -3)}902`,
        fest_id: upFest.id,
        title: 'Exhibition Pavilion Open Hours [Demo]',
        description: '[Demo] Interactive student project booths and sponsor demonstrations.',
        starts_at: new Date(new Date(upFest.startsAt).getTime() + 3 * 3600 * 1000).toISOString(),
        ends_at: new Date(new Date(upFest.startsAt).getTime() + 8 * 3600 * 1000).toISOString(),
        venue: 'Main Exhibition Hall',
        sort_order: 2,
        is_published: true,
        published_at: new Date('2026-10-01T00:00:00Z').toISOString(),
      },
    ]
    for (const item of scheduleItems) {
      await supabase.from('fest_schedule_items').upsert(item, { onConflict: 'id' })
    }

    // Seed Events for Upcoming Fest
    for (const ev of upFest.events) {
      const { error: evErr } = await supabase.from('events').upsert(
        {
          id: ev.id,
          fest_id: upFest.id,
          title: ev.title,
          slug: ev.slug,
          category: ev.category,
          description: ev.description,
          starts_at: ev.startsAt,
          ends_at: ev.endsAt,
          registration_opens_at: ev.registrationOpensAt,
          registration_closes_at: ev.registrationClosesAt,
          venue: ev.venue,
          registration_mode: ev.registrationMode,
          capacity: ev.capacity,
          team_min_size: ev.teamMinSize,
          team_max_size: ev.teamMaxSize,
          waitlist_enabled: ev.waitlistEnabled ?? true,
          rules: ev.rules,
          status: 'published',
          published_at: new Date('2026-10-01T00:00:00Z').toISOString(),
          operational_status: ev.operationalStatus ?? 'scheduled',
          delivery_format: 'in_person',
        },
        { onConflict: 'id' },
      )
      if (evErr) throw evErr

      // Step 8: Seed realistic Registrations for demonstration states
      if (ev.demoState === 'open_with_capacity') {
        // Confirmed registrations under capacity
        for (let i = 0; i < Math.min(ev.confirmedCount, participantPool.length); i++) {
          const participantId = participantPool[i]
          const isMain = participantId === mainParticipantId
          await supabase.from('registrations').upsert(
            {
              id: `${ev.id.slice(0, -3)}80${i}`,
              event_id: ev.id,
              participant_id: participantId,
              status: 'confirmed',
              waitlist_position: null,
              registered_at: new Date('2026-10-02T10:00:00Z').toISOString(),
              confirmed_at: new Date('2026-10-02T10:00:00Z').toISOString(),
              metadata: {
                is_demo: true,
                attendance_status: isMain ? 'verified' : 'unverified',
                checked_in_at: isMain ? new Date('2026-10-08T08:30:00Z').toISOString() : null,
                gate_verified_by: isMain ? 'Staff Scanner #01' : null,
              },
            },
            { onConflict: 'id' },
          )
        }
      } else if (ev.demoState === 'full_with_waitlist') {
        // Confirmed registrations matching capacity
        const teamNames = ['CyberPulse AI', 'Quantum Vortex', 'NexGen Builders', 'Solaria Systems']
        for (let i = 0; i < ev.confirmedCount; i++) {
          const participantId = participantPool[i % participantPool.length]
          const isMain = participantId === mainParticipantId
          await supabase.from('registrations').upsert(
            {
              id: `${ev.id.slice(0, -3)}81${i}`,
              event_id: ev.id,
              participant_id: participantId,
              status: 'confirmed',
              waitlist_position: null,
              registered_at: new Date('2026-10-02T09:00:00Z').toISOString(),
              confirmed_at: new Date('2026-10-02T09:00:00Z').toISOString(),
              metadata: {
                is_demo: true,
                team_name: teamNames[i % teamNames.length],
                team_roster: [
                  { name: 'Alex Rivera [Demo]', email: 'demo.participant@festivo.org', role: 'Captain' },
                  { name: 'Jordan Hayes [Demo]', email: 'participant1@festivo.org', role: 'Lead Architect' },
                  { name: 'Morgan Chen [Demo]', email: 'participant2@festivo.org', role: 'Designer' },
                ],
                attendance_status: isMain ? 'verified' : 'unverified',
                checked_in_at: isMain ? new Date('2026-10-08T08:45:00Z').toISOString() : null,
              },
            },
            { onConflict: 'id' },
          )
        }
        // Waitlist entries
        if (ev.waitlistCount) {
          for (let w = 1; w <= ev.waitlistCount; w++) {
            const wParticipantId = participantPool[(ev.confirmedCount + w) % participantPool.length]
            await supabase.from('registrations').upsert(
              {
                id: `${ev.id.slice(0, -3)}82${w}`,
                event_id: ev.id,
                participant_id: wParticipantId,
                status: 'waitlisted',
                waitlist_position: w,
                registered_at: new Date('2026-10-03T14:00:00Z').toISOString(),
                confirmed_at: null,
                metadata: {
                  is_demo: true,
                  team_name: `Waitlist Team #${w}`,
                  waitlist_requested_at: new Date('2026-10-03T14:00:00Z').toISOString(),
                },
              },
              { onConflict: 'id' },
            )
          }
        }
      } else if (ev.demoState === 'full_event') {
        // Strictly full event without waitlist
        for (let i = 0; i < Math.min(ev.confirmedCount, participantPool.length); i++) {
          const participantId = participantPool[i]
          await supabase.from('registrations').upsert(
            {
              id: `${ev.id.slice(0, -3)}83${i}`,
              event_id: ev.id,
              participant_id: participantId,
              status: 'confirmed',
              waitlist_position: null,
              registered_at: new Date('2026-10-02T11:00:00Z').toISOString(),
              confirmed_at: new Date('2026-10-02T11:00:00Z').toISOString(),
              metadata: { is_demo: true, attendance_status: 'unverified' },
            },
            { onConflict: 'id' },
          )
        }
      } else if (ev.demoState === 'registration_closed') {
        // Closed event with confirmed and a cancelled registration
        await supabase.from('registrations').upsert(
          {
            id: `${ev.id.slice(0, -3)}841`,
            event_id: ev.id,
            participant_id: p1Id,
            status: 'confirmed',
            waitlist_position: null,
            registered_at: new Date('2026-09-20T10:00:00Z').toISOString(),
            confirmed_at: new Date('2026-09-20T10:00:00Z').toISOString(),
            metadata: { is_demo: true },
          },
          { onConflict: 'id' },
        )
        // Also a cancelled registration for demo participant to test cancellations
        await supabase.from('registrations').upsert(
          {
            id: `${ev.id.slice(0, -3)}842`,
            event_id: ev.id,
            participant_id: mainParticipantId,
            status: 'cancelled',
            waitlist_position: null,
            registered_at: new Date('2026-09-18T10:00:00Z').toISOString(),
            confirmed_at: null,
            cancelled_at: new Date('2026-10-05T12:00:00Z').toISOString(),
            cancellation_reason: 'Schedule conflict with mid-term coursework [Demo]',
            metadata: { is_demo: true },
          },
          { onConflict: 'id' },
        )
      } else if (ev.demoState === 'completed_event') {
        // Completed event with verified attendance
        await supabase.from('registrations').upsert(
          {
            id: `${ev.id.slice(0, -3)}851`,
            event_id: ev.id,
            participant_id: mainParticipantId,
            status: 'confirmed',
            waitlist_position: null,
            registered_at: new Date('2026-09-10T10:00:00Z').toISOString(),
            confirmed_at: new Date('2026-09-10T10:00:00Z').toISOString(),
            metadata: {
              is_demo: true,
              attendance_status: 'verified',
              checked_in_at: new Date('2026-09-28T09:45:00Z').toISOString(),
            },
          },
          { onConflict: 'id' },
        )
      } else if (ev.demoState === 'overlapping_schedule') {
        // Overlapping schedule registration
        await supabase.from('registrations').upsert(
          {
            id: `${ev.id.slice(0, -3)}861`,
            event_id: ev.id,
            participant_id: p2Id,
            status: 'confirmed',
            waitlist_position: null,
            registered_at: new Date('2026-10-03T10:00:00Z').toISOString(),
            confirmed_at: new Date('2026-10-03T10:00:00Z').toISOString(),
            metadata: { is_demo: true },
          },
          { onConflict: 'id' },
        )
      }
    }

    // Step 9: Past Fest & Completed Showcases
    const pastFest = club.pastFest
    if (pastFest) {
      const { error: pastFestErr } = await supabase.from('fests').upsert(
        {
          id: pastFest.id,
          organization_id: club.id,
          title: pastFest.title,
          slug: pastFest.slug,
          category: pastFest.category,
          description: pastFest.description,
          starts_at: pastFest.startsAt,
          ends_at: pastFest.endsAt,
          status: 'published',
          operational_status: 'completed',
          published_at: new Date('2025-10-01T00:00:00Z').toISOString(),
        },
        { onConflict: 'id' },
      )
      if (pastFestErr) throw pastFestErr

      for (const ev of pastFest.events) {
        await supabase.from('events').upsert(
          {
            id: ev.id,
            fest_id: pastFest.id,
            title: ev.title,
            slug: ev.slug,
            category: ev.category,
            description: ev.description,
            starts_at: ev.startsAt,
            ends_at: ev.endsAt,
            registration_mode: ev.registrationMode,
            capacity: ev.capacity,
            team_min_size: ev.teamMinSize,
            team_max_size: ev.teamMaxSize,
            status: 'published',
            operational_status: 'completed',
            published_at: new Date('2025-10-01T00:00:00Z').toISOString(),
          },
          { onConflict: 'id' },
        )
      }

      for (const sc of pastFest.showcases) {
        await supabase.from('club_showcases').upsert(
          {
            id: sc.id,
            organization_id: club.id,
            fest_id: pastFest.id,
            event_id: sc.eventId,
            title: sc.title,
            description: sc.description,
            showcase_type: sc.showcaseType,
            occurred_on: sc.occurredOn,
            cover_image_url: sc.coverImageUrl,
            external_url: sc.externalUrl,
            sort_order: sc.sortOrder,
            is_published: true,
          },
          { onConflict: 'id' },
        )
      }
    }

    console.log(`Club seeded successfully: ${club.name}`)
  }

  // Step 10: Seed Operations, Teams, Attendance, Announcements, Help Desk & Passport Rewards
  await seedOperationsAndEngagementData(userMap)

  console.log('--- Seed completed successfully with 0 errors! ---')
}

async function seedOperationsAndEngagementData(userMap) {
  console.log('\n--- Seeding Operations, Teams, Attendance, Announcements & Passport Rewards ---')

  const mainParticipantId = userMap.get('demo.participant@festivo.org')
  const p1Id = userMap.get('participant1@festivo.org')
  const p2Id = userMap.get('participant2@festivo.org')
  const p3Id = userMap.get('participant3@festivo.org')
  const p4Id = userMap.get('participant4@festivo.org')
  const staffId = userMap.get('staff@festivo.org')
  const techOrgId = userMap.get('organizer.tech@festivo.org')
  const apexClubId = '22222222-2222-2222-2222-222222222221'
  const technovaFestId = '33333333-3333-3333-3333-333333333101'
  const teamEventId = '77777777-7777-7777-7777-777777777102' // Full-Stack Web Systems Challenge [Demo]
  const soloEventId = '77777777-7777-7777-7777-777777777101' // Horizon Collegiate Programming Contest [Demo]

  // 1. Teams & Team Rosters
  console.log('Seeding demo teams and roster snapshots...')
  const team1Id = '88888888-8888-8888-8888-888888888101'
  const team2Id = '88888888-8888-8888-8888-888888888102'

  // Confirmed Team: CyberPulse AI
  await supabase.from('event_teams').upsert(
    {
      id: team1Id,
      event_id: teamEventId,
      captain_id: mainParticipantId,
      name: 'CyberPulse AI [Demo Team]',
      status: 'submitted',
    },
    { onConflict: 'id, event_id' },
  )

  const team1Members = [
    { id: '88888888-8888-8888-8888-888888888111', userId: mainParticipantId, isCaptain: true, name: 'Alex Rivera [Demo Participant]', email: 'demo.participant@festivo.org' },
    { id: '88888888-8888-8888-8888-888888888112', userId: p1Id, isCaptain: false, name: 'Jordan Hayes [Demo Participant]', email: 'participant1@festivo.org' },
    { id: '88888888-8888-8888-8888-888888888113', userId: p2Id, isCaptain: false, name: 'Morgan Chen [Demo Participant]', email: 'participant2@festivo.org' },
  ]

  for (const m of team1Members) {
    await supabase.from('event_team_members').upsert(
      {
        id: m.id,
        team_id: team1Id,
        event_id: teamEventId,
        user_id: m.userId,
        is_captain: m.isCaptain,
        status: 'accepted',
        rules_accepted_hash: 'seed_rules_accepted_hash',
        rules_accepted_at: new Date('2026-10-02T09:00:00Z').toISOString(),
      },
      { onConflict: 'team_id, user_id' },
    )
  }

  // Update Confirmed Team Registration
  const teamReg1Id = '77777777-7777-7777-7777-777777777810'
  await supabase.from('registrations').upsert(
    {
      id: teamReg1Id,
      event_id: teamEventId,
      participant_id: mainParticipantId,
      team_id: team1Id,
      status: 'confirmed',
      registered_at: new Date('2026-10-02T09:00:00Z').toISOString(),
      confirmed_at: new Date('2026-10-02T09:00:00Z').toISOString(),
      metadata: { is_demo: true, team_name: 'CyberPulse AI [Demo Team]' },
    },
    { onConflict: 'id' },
  )

  for (const m of team1Members) {
    await supabase.from('team_roster_snapshots').upsert(
      {
        registration_id: teamReg1Id,
        user_id: m.userId,
        full_name: m.name,
        email: m.email,
        is_captain: m.isCaptain,
        rules_accepted_hash: 'seed_rules_accepted_hash',
        accepted_at: new Date('2026-10-02T09:00:00Z').toISOString(),
      },
      { onConflict: 'registration_id, user_id' },
    )
  }

  // Waitlisted Team: Quantum Vortex
  await supabase.from('event_teams').upsert(
    {
      id: team2Id,
      event_id: teamEventId,
      captain_id: p3Id,
      name: 'Quantum Vortex [Demo Team]',
      status: 'submitted',
    },
    { onConflict: 'id, event_id' },
  )

  const team2Members = [
    { id: '88888888-8888-8888-8888-888888888121', userId: p3Id, isCaptain: true, name: 'Taylor Kim [Demo Participant]', email: 'participant3@festivo.org' },
    { id: '88888888-8888-8888-8888-888888888122', userId: p4Id, isCaptain: false, name: 'Samira Khan [Demo Participant]', email: 'participant4@festivo.org' },
  ]

  for (const m of team2Members) {
    await supabase.from('event_team_members').upsert(
      {
        id: m.id,
        team_id: team2Id,
        event_id: teamEventId,
        user_id: m.userId,
        is_captain: m.isCaptain,
        status: 'accepted',
        rules_accepted_hash: 'seed_rules_accepted_hash',
        rules_accepted_at: new Date('2026-10-03T14:00:00Z').toISOString(),
      },
      { onConflict: 'team_id, user_id' },
    )
  }

  const teamReg2Id = '77777777-7777-7777-7777-777777777821'
  await supabase.from('registrations').upsert(
    {
      id: teamReg2Id,
      event_id: teamEventId,
      participant_id: p3Id,
      team_id: team2Id,
      status: 'waitlisted',
      waitlist_position: 1,
      registered_at: new Date('2026-10-03T14:00:00Z').toISOString(),
      confirmed_at: null,
      metadata: { is_demo: true, team_name: 'Quantum Vortex [Demo Team]' },
    },
    { onConflict: 'id' },
  )

  for (const m of team2Members) {
    await supabase.from('team_roster_snapshots').upsert(
      {
        registration_id: teamReg2Id,
        user_id: m.userId,
        full_name: m.name,
        email: m.email,
        is_captain: m.isCaptain,
        rules_accepted_hash: 'seed_rules_accepted_hash',
        accepted_at: new Date('2026-10-03T14:00:00Z').toISOString(),
      },
      { onConflict: 'registration_id, user_id' },
    )
  }

  // 2. Digital Passes and Verified Gate Check-In Attendance
  console.log('Seeding digital passes and verified gate check-in attendance...')
  const pass1Id = '99999999-9999-9999-9999-999999999101'
  const soloRegId = '77777777-7777-7777-7777-777777777800'

  await supabase.from('event_passes').upsert(
    {
      id: pass1Id,
      registration_id: soloRegId,
      user_id: mainParticipantId,
    },
    { onConflict: 'registration_id, user_id' },
  )

  // Record Attendance for Alex Rivera's solo pass
  await supabase.from('event_pass_attendance').upsert(
    {
      pass_id: pass1Id,
      checked_in_by: staffId,
      checked_in_at: new Date('2026-10-08T08:30:00Z').toISOString(),
    },
    { onConflict: 'pass_id' },
  )

  // Ensure Passes for Team 1 Members
  const teamPasses = [
    { id: '99999999-9999-9999-9999-999999999111', regId: teamReg1Id, userId: mainParticipantId },
    { id: '99999999-9999-9999-9999-999999999112', regId: teamReg1Id, userId: p1Id },
    { id: '99999999-9999-9999-9999-999999999113', regId: teamReg1Id, userId: p2Id },
  ]
  for (const tp of teamPasses) {
    await supabase.from('event_passes').upsert(
      {
        id: tp.id,
        registration_id: tp.regId,
        user_id: tp.userId,
      },
      { onConflict: 'registration_id, user_id' },
    )
  }

  // Check in Jordan Hayes on team pass
  await supabase.from('event_pass_attendance').upsert(
    {
      pass_id: '99999999-9999-9999-9999-999999999112',
      checked_in_by: staffId,
      checked_in_at: new Date('2026-10-08T08:45:00Z').toISOString(),
    },
    { onConflict: 'pass_id' },
  )

  // 3. Operational Announcements & In-App Notifications
  console.log('Seeding operational announcements and notifications...')
  const pubAnnId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'
  const privAnnId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02'

  await supabase.from('operational_announcements').upsert(
    {
      id: pubAnnId,
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      audience: 'public',
      title: 'TechNova 2026 Campus Schedule & Venue Map Published',
      body: 'Welcome to TechNova 2026! Gate check-in counters open at 8:30 AM in Engineering Complex Hall 301. Review your digital pass at /my-passes before arrival.',
      created_by: MASTER_ADMIN_ID,
      published_at: new Date('2026-10-07T08:00:00Z').toISOString(),
    },
    { onConflict: 'id' },
  )

  await supabase.from('operational_announcements').upsert(
    {
      id: privAnnId,
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      audience: 'registered',
      title: 'Confirmed Contestant Workstation & Tooling Guidelines',
      body: 'All confirmed participants: Standard C++, Python, and Java compilers are provisioned on workstations. Digital QR passes must be presented at the gate.',
      created_by: MASTER_ADMIN_ID,
      published_at: new Date('2026-10-07T12:00:00Z').toISOString(),
    },
    { onConflict: 'id' },
  )

  // Recipients for registered announcement
  const registeredRecipients = [mainParticipantId, p1Id, p2Id]
  for (const rId of registeredRecipients) {
    await supabase.from('announcement_recipients').upsert(
      {
        announcement_id: privAnnId,
        recipient_id: rId,
      },
      { onConflict: 'announcement_id, recipient_id' },
    )
  }

  // Notifications
  const demoNotifications = [
    {
      id: 'dddddddd-1111-1111-1111-111111111101',
      recipient_id: mainParticipantId,
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      kind: 'announcement',
      title: 'TechNova 2026 Campus Schedule & Venue Map Published',
      body: 'Gate check-in counters open at 8:30 AM in Engineering Complex Hall 301.',
      data: { announcement_id: pubAnnId },
      read_at: new Date('2026-10-08T07:00:00Z').toISOString(),
      created_at: new Date('2026-10-07T08:00:00Z').toISOString(),
    },
    {
      id: 'dddddddd-1111-1111-1111-111111111102',
      recipient_id: mainParticipantId,
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      kind: 'announcement',
      title: 'Confirmed Contestant Workstation & Tooling Guidelines',
      body: 'Standard C++, Python, and Java compilers are provisioned on workstations.',
      data: { announcement_id: privAnnId },
      read_at: null, // Unread to demo badge
      created_at: new Date('2026-10-07T12:00:00Z').toISOString(),
    },
    {
      id: 'dddddddd-1111-1111-1111-111111111103',
      recipient_id: p1Id,
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      kind: 'announcement',
      title: 'Confirmed Contestant Workstation & Tooling Guidelines',
      body: 'Standard C++, Python, and Java compilers are provisioned on workstations.',
      data: { announcement_id: privAnnId },
      read_at: new Date('2026-10-08T08:00:00Z').toISOString(),
      created_at: new Date('2026-10-07T12:00:00Z').toISOString(),
    },
  ]
  for (const n of demoNotifications) {
    await supabase.from('notifications').upsert(n, { onConflict: 'id' })
  }

  // 4. Help Desk Requests
  console.log('Seeding Help Desk queue records...')
  const helpDeskItems = [
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: soloEventId,
      category: 'venue',
      description: 'Need accessible ramp navigation to Computer Science Lab 301 from the main campus gate.',
      venue: 'Building A North Entrance',
      submitter_id: p1Id,
      priority: 'normal',
      assigned_staff_id: staffId,
      status: 'resolved',
      resolved_at: new Date('2026-10-08T09:15:00Z').toISOString(),
      created_at: new Date('2026-10-08T08:30:00Z').toISOString(),
      updated_at: new Date('2026-10-08T09:15:00Z').toISOString(),
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: teamEventId,
      category: 'registration',
      description: 'Roster inquiry: teammate transit delay notification for morning check-in.',
      venue: null,
      submitter_id: p2Id,
      priority: 'high',
      assigned_staff_id: staffId,
      status: 'assigned',
      created_at: new Date('2026-10-08T09:00:00Z').toISOString(),
      updated_at: new Date('2026-10-08T09:10:00Z').toISOString(),
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
      organization_id: apexClubId,
      fest_id: technovaFestId,
      event_id: null,
      category: 'schedule',
      description: 'What time does the robotics exhibition pit open for sensor testing and calibration?',
      venue: 'Main Exhibition Hall',
      submitter_id: p3Id,
      priority: 'normal',
      assigned_staff_id: null,
      status: 'new',
      created_at: new Date('2026-10-08T09:30:00Z').toISOString(),
      updated_at: new Date('2026-10-08T09:30:00Z').toISOString(),
    },
  ]
  for (const h of helpDeskItems) {
    await supabase.from('help_desk_requests').upsert(h, { onConflict: 'id' })
  }

  // 5. Passport Verifications & Rewards Ledger
  console.log('Seeding Club Passport verifications and XP rewards ledger...')
  const ver1Id = 'cccccccc-cccc-cccc-cccc-cccccccccc01'
  const ver2Id = 'cccccccc-cccc-cccc-cccc-cccccccccc02'

  await supabase.from('passport_verifications').upsert(
    {
      id: ver1Id,
      user_id: mainParticipantId,
      organization_id: apexClubId,
      event_id: teamEventId,
      kind: 'workshop',
      title: 'Full-Stack Web Systems Architecture Lab [Demo]',
      verified_by: techOrgId,
      verified_at: new Date('2026-10-05T16:00:00Z').toISOString(),
    },
    { onConflict: 'id' },
  )

  await supabase.from('passport_verifications').upsert(
    {
      id: ver2Id,
      user_id: mainParticipantId,
      organization_id: apexClubId,
      event_id: soloEventId,
      kind: 'achievement',
      title: 'Algorithmic Problem Solving Certificate of Merit [Demo]',
      verified_by: techOrgId,
      verified_at: new Date('2026-10-06T18:00:00Z').toISOString(),
    },
    { onConflict: 'id' },
  )

  const rewardItems = [
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd01',
      user_id: mainParticipantId,
      organization_id: apexClubId,
      source_kind: 'workshop',
      source_id: ver1Id,
      xp: 30,
      label: 'Workshop verified: Full-Stack Web Systems Architecture Lab',
      awarded_by: techOrgId,
      awarded_at: new Date('2026-10-05T16:00:00Z').toISOString(),
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddd02',
      user_id: mainParticipantId,
      organization_id: apexClubId,
      source_kind: 'achievement',
      source_id: ver2Id,
      xp: 50,
      label: 'Achievement verified: Algorithmic Problem Solving Certificate of Merit',
      awarded_by: techOrgId,
      awarded_at: new Date('2026-10-06T18:00:00Z').toISOString(),
    },
  ]
  for (const r of rewardItems) {
    await supabase.from('passport_reward_ledger').upsert(r, { onConflict: 'user_id, source_kind, source_id' })
  }

  console.log('Operations and engagement data successfully seeded!')
}

main().catch((err) => {
  console.error('Fatal seed error:', err)
  process.exit(1)
})
