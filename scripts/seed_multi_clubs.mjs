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

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false }
})

const ADMIN_USER_ID = 'e1584813-d097-4078-b2f0-f48c4c8161e0'
const INSTITUTE_ID = '11111111-1111-1111-1111-111111111111'

const CLUBS = [
  {
    id: '22222222-2222-2222-2222-222222222221',
    name: 'Apex Technology Society',
    slug: 'apex-technology-society',
    category: 'Technology',
    tagline: 'Pioneering student software, intelligent robotics, and open systems.',
    description: 'Apex Technology Society is the flagship campus engineering community. We host hackathons, competitive programming leagues, machine learning workshops, and robotics sprints to equip students with practical tech leadership.',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://apextech.horizon.edu',
    facebookUrl: 'https://facebook.com/apextechsociety',
    segments: [
      {
        title: 'Software & Web Systems',
        description: 'Collaborative development of full-stack open-source tools, cloud architectures, and student platform services.',
        imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        title: 'Robotics & Embedded Hardware',
        description: 'Autonomous robotics design, micro-controllers, IoT sensors, and national robotics challenges.',
        imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        title: 'Competitive Programming League',
        description: 'Algorithmic problem solving, data structure mastery, and ICPC collegiate contest preparation.',
        imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    fest: {
      id: '33333333-3333-3333-3333-333333333331',
      title: 'Apex Tech Carnival 2026',
      slug: 'apex-tech-carnival-2026',
      category: 'Technology & Robotics',
      description: 'Horizon Campus premier technology festival bringing together collegiate engineers, coders, and makers for two intense days of competitions.',
      startsAt: '2026-11-12T09:00:00+06:00',
      endsAt: '2026-11-14T18:00:00+06:00',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '44444444-4444-4444-4444-444444444441',
          title: 'Algorithmic Code Sprint',
          slug: 'algorithmic-code-sprint',
          category: 'Programming',
          subcategory: 'Algorithm Contest',
          description: 'A 4-hour high-speed individual programming challenge testing speed, accuracy, and dynamic programming mastery.',
          venue: 'Turing Computer Lab 3',
          capacity: 120,
          startsAt: '2026-11-12T10:00:00+06:00',
          endsAt: '2026-11-12T14:00:00+06:00',
          registrationMode: 'individual',
          deliveryFormat: 'in_person',
        },
        {
          id: '44444444-4444-4444-4444-444444444442',
          title: 'Line Follower Robot Challenge',
          slug: 'line-follower-robot-challenge',
          category: 'Robotics',
          subcategory: 'Autonomous Hardware',
          description: 'Autonomous line-tracking robotics race across custom ramps, chicanes, and speed straightaways.',
          venue: 'Engineering Arena B',
          capacity: 40,
          startsAt: '2026-11-13T10:00:00+06:00',
          endsAt: '2026-11-13T16:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
      ],
    },
    achievements: [
      {
        title: 'National Collegiate Hackathon Champions 2025',
        description: 'First prize at the National University Innovation Hackathon among 140 competing institutions.',
        year: '2025-08-15',
        awardedBy: 'National Tech Commission',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Top Open Source Campus Chapter',
        description: 'Recognized for contributing over 50 public repositories and training 300+ students.',
        year: '2025-12-01',
        awardedBy: 'Horizon Academic Council',
        imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      },
    ],
    showcases: [
      {
        title: 'Apex AI Hackathon 2025',
        description: '36-hour sprint creating multimodal tools for student productivity and accessibility.',
        showcaseType: 'competition',
        date: '2025-10-20',
        imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Autonomous Quadcopter Project Exhibition',
        description: 'Student engineering showcase featuring custom flight controllers and obstacle avoidance systems.',
        showcaseType: 'project',
        date: '2025-05-18',
        imageUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
      },
    ],
    gallery: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80',
        altText: 'Students collaborating on software architecture',
        caption: 'Design sprints during weekly tech labs.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        altText: 'Robotics team testing hardware',
        caption: 'Circuit debugging in the campus prototyping lab.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        altText: 'Keynote session at the annual conference',
        caption: 'Guest lecture on scalable distributed computing.',
      },
    ],
  },

  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Lumina Photography & Media Club',
    slug: 'lumina-photography-club',
    category: 'Photography',
    tagline: 'Framing campus life, visual narratives, and documentary artistry.',
    description: 'Lumina Photography & Media Club is the home for visual storytellers, street photographers, portrait artists, and digital videographers. We curate campus photo exhibitions, darkroom masterclasses, and photojournalism walks.',
    logoUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://lumina.horizon.edu',
    facebookUrl: 'https://facebook.com/luminaphotoclub',
    segments: [
      {
        title: 'Street & Documentary',
        description: 'Capturing candid human moments, architectural geometries, and campus cultural milestones.',
        imageUrl: 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        title: 'Studio Lighting & Portraits',
        description: 'Mastery of light shapers, speedlights, editorial portraiture, and professional post-color grading.',
        imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        title: 'Cinematic Videography',
        description: 'Motion cinematography, short documentaries, event aftermovies, and gimbal camera direction.',
        imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    fest: {
      id: '33333333-3333-3333-3333-333333333332',
      title: 'Lumina Vision Expo 2026',
      slug: 'lumina-vision-expo-2026',
      category: 'Visual Arts & Photography',
      description: 'Annual inter-collegiate photography exhibition and live shoot competition featuring curated prints from across the country.',
      startsAt: '2026-11-20T10:00:00+06:00',
      endsAt: '2026-11-22T19:00:00+06:00',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '44444444-4444-4444-4444-444444444443',
          title: 'Campus Life Photo Sprint',
          slug: 'campus-life-photo-sprint',
          category: 'Photography',
          subcategory: 'Live Photography Contest',
          description: 'A 3-hour on-campus photo scavenger challenge capturing spontaneous student expressions and hidden architecture.',
          venue: 'Art Gallery Quad',
          capacity: 80,
          startsAt: '2026-11-20T11:00:00+06:00',
          endsAt: '2026-11-20T14:00:00+06:00',
          registrationMode: 'individual',
          deliveryFormat: 'in_person',
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          title: 'Short Documentary Premiere',
          slug: 'short-documentary-premiere',
          category: 'Videography',
          subcategory: 'Film Screening & Critique',
          description: 'Screening of top student documentary submissions followed by judging panel critiques.',
          venue: 'Auditorium Hall C',
          capacity: 150,
          startsAt: '2026-11-21T15:00:00+06:00',
          endsAt: '2026-11-21T18:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
      ],
    },
    achievements: [
      {
        title: 'Best Collegiate Photography Exhibition 2025',
        description: 'Awarded by the National Art Federation for "Perspectives of Urban Youth".',
        year: '2025-09-10',
        awardedBy: 'National Art Federation',
        imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Editorial Photojournalism Honors',
        description: 'Published in two national weekend magazines documenting regional heritage.',
        year: '2025-11-18',
        awardedBy: 'Campus Press Association',
        imageUrl: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
      },
    ],
    showcases: [
      {
        title: 'Monochrome Expressions Gallery',
        description: 'Exhibition of 60 fine-art black-and-white portraits captured on campus grounds.',
        showcaseType: 'event',
        date: '2025-06-12',
        imageUrl: 'https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Heritage Street Photowalk',
        description: 'A 15km historical city walk documenting historic trade quarters and street life.',
        showcaseType: 'recap',
        date: '2025-03-05',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80',
      },
    ],
    gallery: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80',
        altText: 'Vintage SLR cameras array',
        caption: 'Hands-on manual photography workshop.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        altText: 'Photographer setting up framing',
        caption: 'Outdoor portrait sessions during golden hour.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=800&q=80',
        altText: 'Sunset landscape exposure',
        caption: 'Capturing dynamic range and shadow gradients.',
      },
    ],
  },

  {
    id: '22222222-2222-2222-2222-222222222223',
    name: 'Nexus Business & Career Guild',
    slug: 'nexus-business-career-guild',
    category: 'Business and Career',
    tagline: 'Accelerating strategy, corporate case cracking, and executive mentorship.',
    description: 'Nexus Business & Career Guild bridges academic talent with high-impact corporate careers. Members compete in national case championships, master financial modeling, and build leadership networks with industry executives.',
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://nexus.horizon.edu',
    facebookUrl: 'https://facebook.com/nexusbusinessguild',
    segments: [
      {
        title: 'Business Strategy & Case Solving',
        description: 'Structured framework analysis, market sizing, profit trees, and pitch deck refinement.',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        title: 'Financial Analysis & Investment',
        description: 'Valuation models, corporate finance fundamentals, equity pitch contests, and market simulation.',
        imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        title: 'Career Acceleration & Mentorship',
        description: 'Mock behavioral interviews, CV clinics, and one-on-one sessions with alumni management consultants.',
        imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    fest: {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Nexus Business Odyssey 2026',
      slug: 'nexus-business-odyssey-2026',
      category: 'Business Strategy & Finance',
      description: 'The flagship business festival uniting over 50 campus delegations in case cracking, marketing pitches, and startup venture showcases.',
      startsAt: '2026-11-25T09:00:00+06:00',
      endsAt: '2026-11-27T18:00:00+06:00',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '44444444-4444-4444-4444-444444444445',
          title: 'Strategic Case Championship',
          slug: 'strategic-case-championship',
          category: 'Strategy',
          subcategory: 'Live Case Competition',
          description: 'A 24-hour business turnaround case challenge judged by top industry corporate directors.',
          venue: 'Executive Seminar Hall',
          capacity: 50,
          startsAt: '2026-11-25T10:00:00+06:00',
          endsAt: '2026-11-26T16:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
        {
          id: '44444444-4444-4444-4444-444444444446',
          title: 'Brand Battle: Product Launch',
          slug: 'brand-battle-product-launch',
          category: 'Marketing',
          subcategory: 'Creative Pitch',
          description: 'Develop a go-to-market marketing campaign, billboard creatives, and financial viability model for a disruptive green consumer product.',
          venue: 'Commerce Hall 101',
          capacity: 60,
          startsAt: '2026-11-27T10:00:00+06:00',
          endsAt: '2026-11-27T15:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
      ],
    },
    achievements: [
      {
        title: 'National Case Masters Runners-Up 2025',
        description: 'Podium placement in the prestigious National Corporate Strategy Cup.',
        year: '2025-07-22',
        awardedBy: 'Management Consultants Guild',
        imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Excellence in Corporate Placement',
        description: 'Facilitated over 70 premier summer internships for student members in 2025.',
        year: '2025-12-15',
        awardedBy: 'Horizon Career Services',
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
      },
    ],
    showcases: [
      {
        title: 'Consulting 101 Boot Camp',
        description: 'Comprehensive 4-week weekend workshop series covering hypothesis-driven consulting problem solving.',
        showcaseType: 'event',
        date: '2025-04-10',
        imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Horizon Venture Seed Showcase',
        description: 'Student startup demo day with 8 venture teams pitching to local angel investors.',
        showcaseType: 'project',
        date: '2025-09-28',
        imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=800&q=80',
      },
    ],
    gallery: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
        altText: 'Boardroom pitch session',
        caption: 'Final round presentations to industry executives.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
        altText: 'Students networking with corporate guests',
        caption: 'Alumni networking mixer at the annual gala.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
        altText: 'Case analysis team working with sticky notes',
        caption: 'Breakout room brainstorming during case competitions.',
      },
    ],
  },

  {
    id: '22222222-2222-2222-2222-222222222224',
    name: 'Beacon Social Service League',
    slug: 'beacon-social-service-league',
    category: 'Social Service',
    tagline: 'Mobilizing campus empathy through humanitarian outreach and welfare drives.',
    description: 'Beacon Social Service League mobilizes students for community emergency relief, literacy drives for underprivileged youth, campus blood donation campaigns, and environmental sustainability action.',
    logoUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://beacon.horizon.edu',
    facebookUrl: 'https://facebook.com/beaconsocialservice',
    segments: [
      {
        title: 'Community Literacy & Tutoring',
        description: 'Volunteer teaching sessions and textbook donation camps for neighboring underserved primary schools.',
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        title: 'Emergency Relief & Health Drives',
        description: 'Seasonal winter warmth distribution, disaster relief funds, and regular campus blood drives.',
        imageUrl: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        title: 'Environmental Sustainability Action',
        description: 'Campus tree plantation drives, plastic-free cafeteria campaigns, and e-waste recycling drives.',
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    fest: {
      id: '33333333-3333-3333-3333-333333333334',
      title: 'Beacon Impact Week 2026',
      slug: 'beacon-impact-week-2026',
      category: 'Social Action & Community Welfare',
      description: 'Campus-wide festival celebrating youth civic responsibility, community empowerment, and environmental consciousness.',
      startsAt: '2026-12-01T09:00:00+06:00',
      endsAt: '2026-12-04T17:00:00+06:00',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '44444444-4444-4444-4444-444444444447',
          title: 'Campus Blood Donation Drive',
          slug: 'campus-blood-donation-drive',
          category: 'Health & Welfare',
          subcategory: 'Volunteer Action',
          description: 'Annual certified blood donation camp in collaboration with the Red Crescent Society.',
          venue: 'Student Activity Center Gymnasium',
          capacity: 300,
          startsAt: '2026-12-01T10:00:00+06:00',
          endsAt: '2026-12-01T17:00:00+06:00',
          registrationMode: 'individual',
          deliveryFormat: 'in_person',
        },
        {
          id: '44444444-4444-4444-4444-444444444448',
          title: 'Social Innovation Pitch',
          slug: 'social-innovation-pitch',
          category: 'Innovation',
          subcategory: 'Social Venture Contest',
          description: 'Pitch low-cost community solutions for clean water, waste recycling, or rural healthcare access.',
          venue: 'Auditorium Hall B',
          capacity: 50,
          startsAt: '2026-12-03T11:00:00+06:00',
          endsAt: '2026-12-03T16:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
      ],
    },
    achievements: [
      {
        title: 'National Humanitarian Youth Award 2025',
        description: 'Recognized for collecting over 1,200 bags of voluntary blood and rehabilitating flood-affected schools.',
        year: '2025-11-05',
        awardedBy: 'Red Crescent Youth Bureau',
        imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Green Campus Stewardship Award',
        description: 'Planted 2,500 indigenous saplings across suburban campus green belts.',
        year: '2025-06-05',
        awardedBy: 'National Forestry Council',
        imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      },
    ],
    showcases: [
      {
        title: 'Winter Warmth Outreach 2024',
        description: 'Distributed 1,800 thermal blankets and winter essentials to remote northern districts.',
        showcaseType: 'event',
        date: '2024-12-28',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Underprivileged Children Literacy Camp',
        description: '6-week weekend experiential science and language teaching camp for 120 children.',
        showcaseType: 'project',
        date: '2025-05-15',
        imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
      },
    ],
    gallery: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
        altText: 'Volunteers distributing study packs',
        caption: 'Distributing books and learning kits to primary students.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80',
        altText: 'Volunteer team standing together',
        caption: 'Core organizers at the relief collection hub.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        altText: 'Students planting young trees',
        caption: 'Campus green drive on World Environment Day.',
      },
    ],
  },

  {
    id: '22222222-2222-2222-2222-222222222225',
    name: 'Vertex Science Society',
    slug: 'vertex-science-society',
    category: 'Science',
    tagline: 'Unfolding discoveries in astrophysics, biotechnology, and pure sciences.',
    description: 'Vertex Science Society inspires curious minds to investigate fundamental natural laws and cutting-edge discoveries. We host science olympiads, research presentations, lab workshops, and stargazing telescope sessions.',
    logoUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=200&h=200&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    websiteUrl: 'https://vertex.horizon.edu',
    facebookUrl: 'https://facebook.com/vertexsciencesociety',
    segments: [
      {
        title: 'Physics & Astrophysics Wing',
        description: 'Theoretical physics seminars, cosmic ray measurements, and high-powered optical telescope observation sessions.',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        sortOrder: 1,
      },
      {
        title: 'Biotechnology & Genetics Lab',
        description: 'Microbiology workshops, CRISPR-Cas technology reviews, bioinformatics, and DNA extraction demonstrations.',
        imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
        sortOrder: 2,
      },
      {
        title: 'Science Olympiad & Quiz Team',
        description: 'Comprehensive training in mathematics, chemistry, biology, and astrophysics for inter-university olympiads.',
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
        sortOrder: 3,
      },
    ],
    fest: {
      id: '33333333-3333-3333-3333-333333333335',
      title: 'Vertex Science Festival 2026',
      slug: 'vertex-science-festival-2026',
      category: 'Pure & Applied Sciences',
      description: 'The inter-collegiate celebration of scientific inquiry featuring olympiads, research poster symposiums, and live scientific project displays.',
      startsAt: '2026-12-10T09:00:00+06:00',
      endsAt: '2026-12-12T18:00:00+06:00',
      deliveryFormat: 'in_person',
      operationalStatus: 'scheduled',
      events: [
        {
          id: '44444444-4444-4444-4444-444444444449',
          title: 'All-Campus Science Olympiad',
          slug: 'all-campus-science-olympiad',
          category: 'Olympiad',
          subcategory: 'Multi-Discipline Test',
          description: 'A 2-hour competitive paper covering physics, chemistry, biology, and astronomy challenges.',
          venue: 'Science Complex Hall 202',
          capacity: 150,
          startsAt: '2026-12-10T10:00:00+06:00',
          endsAt: '2026-12-10T12:30:00+06:00',
          registrationMode: 'individual',
          deliveryFormat: 'in_person',
        },
        {
          id: '44444444-4444-4444-4444-444444444450',
          title: 'Scientific Project Display & Exhibition',
          slug: 'scientific-project-display',
          category: 'Project Showcase',
          subcategory: 'Live Prototype Demo',
          description: 'Exhibition of working student apparatus, renewable energy setups, and biological models.',
          venue: 'Science Quad Marquee',
          capacity: 60,
          startsAt: '2026-12-11T10:00:00+06:00',
          endsAt: '2026-12-11T16:00:00+06:00',
          registrationMode: 'team',
          deliveryFormat: 'in_person',
        },
      ],
    },
    achievements: [
      {
        title: 'National Astronomy Olympiad Champions',
        description: 'First and third individual rankings in the National Collegiate Astronomy Olympiad 2025.',
        year: '2025-05-12',
        awardedBy: 'National Astronomical Association',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Best Student Research Paper 2025',
        description: 'Published in the Asian Undergraduate Research Journal on solar photovoltaic cell efficiency.',
        year: '2025-10-30',
        awardedBy: 'Institute of Physics',
        imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
      },
    ],
    showcases: [
      {
        title: 'Celestial Stargazing Camp',
        description: 'Overnight observation session tracking Saturnian rings, Jupiter moons, and the Orion Nebula.',
        showcaseType: 'event',
        date: '2025-01-20',
        imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80',
      },
      {
        title: 'Microbial Fuel Cell Demonstration',
        description: 'Student prototype generating electricity using soil bacteria and biological waste.',
        showcaseType: 'project',
        date: '2025-04-18',
        imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
      },
    ],
    gallery: [
      {
        imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
        altText: 'Laboratory glassware and chemistry demonstration',
        caption: 'Spectroscopy and chemistry experiments in the main laboratory.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
        altText: 'Telescope under the night sky',
        caption: 'Astronomy observation nights with student telescope setups.',
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        altText: 'Researcher studying microscopic slides',
        caption: 'Microscopy investigations in cellular biotechnology.',
      },
    ],
  },
]

async function seed() {
  console.log('--- Seeding Institute & 5 Fictional Clubs ---')

  // 1. Seed Institute
  const { error: instErr } = await supabase
    .from('institutes')
    .upsert(
      {
        id: INSTITUTE_ID,
        name: 'Horizon Institute of Technology',
        slug: 'horizon-institute',
        tagline: 'A premier campus for innovation, creative arts, and leadership.',
        description: 'Horizon Institute of Technology is an internationally recognized collegiate campus fostering student leadership, engineering excellence, creative expression, and scientific research.',
        logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=400&q=80',
        banner_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80',
        website_url: 'https://horizon.edu',
        facebook_url: 'https://facebook.com/horizon.institute',
        location_name: 'Main Campus, Academic Square',
        is_active: true,
      },
      { onConflict: 'id' }
    )

  if (instErr) {
    console.error('Error seeding institute:', instErr)
    process.exit(1)
  }
  console.log('✓ Institute "Horizon Institute of Technology" seeded.')

  // 2. Seed Clubs (Organizations)
  for (const club of CLUBS) {
    const { error: orgErr } = await supabase
      .from('organizations')
      .upsert(
        {
          id: club.id,
          institute_id: INSTITUTE_ID,
          name: club.name,
          slug: club.slug,
          category: club.category,
          tagline: club.tagline,
          description: club.description,
          logo_url: club.logoUrl,
          cover_image_url: club.coverImageUrl,
          website_url: club.websiteUrl,
          facebook_url: club.facebookUrl,
          is_public_profile: true,
          is_active: true,
          owner_id: ADMIN_USER_ID,
        },
        { onConflict: 'id' }
      )

    if (orgErr) {
      console.error(`Error seeding club ${club.name}:`, orgErr)
      continue
    }

    // 3. Grant active organizer membership to admin user
    const { error: memErr } = await supabase
      .from('organization_memberships')
      .upsert(
        {
          organization_id: club.id,
          user_id: ADMIN_USER_ID,
          role: 'organizer',
          is_active: true,
          granted_by: ADMIN_USER_ID,
        },
        { onConflict: 'organization_id,user_id' }
      )

    if (memErr) {
      console.error(`Error granting membership for ${club.name}:`, memErr)
    }

    // 4. Seed Segments
    for (const seg of club.segments) {
      const { error: segErr } = await supabase
        .from('club_segments')
        .upsert(
          {
            organization_id: club.id,
            title: seg.title,
            description: seg.description,
            image_url: seg.imageUrl,
            sort_order: seg.sortOrder,
            is_published: true,
            created_by: ADMIN_USER_ID,
          },
          { onConflict: 'organization_id,title' }
        )
      if (segErr && !segErr.message.includes('duplicate key')) {
        // Fallback insert if no unique constraint on (organization_id, title)
        await supabase.from('club_segments').insert({
          organization_id: club.id,
          title: seg.title,
          description: seg.description,
          image_url: seg.imageUrl,
          sort_order: seg.sortOrder,
          is_published: true,
          created_by: ADMIN_USER_ID,
        })
      }
    }

    // 5. Seed Fest & Events
    if (club.fest) {
      const { error: festErr } = await supabase
        .from('fests')
        .upsert(
          {
            id: club.fest.id,
            organization_id: club.id,
            title: club.fest.title,
            slug: club.fest.slug,
            category: club.fest.category,
            description: club.fest.description,
            starts_at: club.fest.startsAt,
            ends_at: club.fest.endsAt,
            timezone: 'Asia/Dhaka',
            status: 'published',
            published_at: new Date().toISOString(),
            delivery_format: club.fest.deliveryFormat,
            operational_status: club.fest.operationalStatus,
            created_by: ADMIN_USER_ID,
            banner_url: club.fest.bannerUrl || club.coverImageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
          },
          { onConflict: 'id' }
        )

      if (festErr) {
        console.error(`Error seeding fest for ${club.name}:`, festErr)
      } else {
        for (const ev of club.fest.events) {
          const { error: evErr } = await supabase
            .from('events')
            .upsert(
              {
                id: ev.id,
                fest_id: club.fest.id,
                title: ev.title,
                slug: ev.slug,
                category: ev.category,
                subcategory: ev.subcategory,
                description: ev.description,
                venue: ev.venue,
                capacity: ev.capacity,
                starts_at: ev.startsAt,
                ends_at: ev.endsAt,
                registration_mode: ev.registrationMode,
                team_min_size: ev.registrationMode === 'team' ? 2 : null,
                team_max_size: ev.registrationMode === 'team' ? 4 : null,
                delivery_format: ev.deliveryFormat,
                operational_status: 'scheduled',
                waitlist_enabled: true,
                status: 'published',
                published_at: new Date().toISOString(),
                created_by: ADMIN_USER_ID,
                cover_image_url: ev.coverImageUrl || (club.category === 'Photography' ? 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80' : club.category === 'Technology' ? 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80' : club.category === 'Business' ? 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80' : club.category === 'Social Service' ? 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80'),
              },
              { onConflict: 'id' }
            )
          if (evErr) console.error(`Error seeding event ${ev.title}:`, evErr)
        }
      }
    }

    // 6. Seed Achievements
    for (const ach of club.achievements) {
      await supabase.from('club_achievements').insert({
        organization_id: club.id,
        title: ach.title,
        description: ach.description,
        achieved_on: ach.year,
        awarded_by: ach.awardedBy,
        image_url: ach.imageUrl,
        is_published: true,
        created_by: ADMIN_USER_ID,
      })
    }

    // 7. Seed Showcases
    for (const show of club.showcases) {
      await supabase.from('club_showcases').insert({
        organization_id: club.id,
        title: show.title,
        description: show.description,
        showcase_type: show.showcaseType,
        occurred_on: show.date,
        cover_image_url: show.imageUrl,
        is_published: true,
        created_by: ADMIN_USER_ID,
      })
    }

    // 8. Seed Gallery Items
    for (const gal of club.gallery) {
      await supabase.from('club_gallery_items').insert({
        organization_id: club.id,
        image_url: gal.imageUrl,
        alt_text: gal.altText,
        caption: gal.caption,
        is_published: true,
        created_by: ADMIN_USER_ID,
      })
    }

    console.log(`✓ Club "${club.name}" and all records seeded.`)
  }

  console.log('\n--- Seed complete successfully! ---')
}

seed()
