import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY)

const FEST_BANNERS = {
  'Apex Tech Carnival 2026': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'Lumina Vision Expo 2026': 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1200&q=80',
  'Nexus Business Odyssey 2026': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  'Beacon Impact Week 2026': 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80',
  'Vertex Science Festival 2026': 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
  'Aperture Retrospective 2025 [Demo]': 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
  'Nexus Enterprise Forum 2025 [Demo]': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
  'Horizon Hope Outreach Gala 2025 [Demo]': 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
  'Apex InnoTech Summit 2025 [Demo]': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  'Vertex Discovery Symposium 2025 [Demo]': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
}

const EVENT_COVERS = {
  'Algorithmic Code Sprint': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
  'Line Follower Robot Challenge': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
  'Campus Life Photo Sprint': 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
  'Short Documentary Premiere': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
  'Strategic Case Championship': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  'Brand Battle: Product Launch': 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
  'Campus Blood Donation Drive': 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
  'Social Innovation Pitch': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  'All-Campus Science Olympiad': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80',
  'Scientific Project Display & Exhibition': 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
  'Autonomous Robotics Showcase & Battle [Demo]': 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80',
  'National Collegiate Hackathon 2025 [Demo]': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  'Campus Architecture Photo Walk [Demo]': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  'RAW Color Grading & Editing Workshop [Demo]': 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&w=800&q=80',
  'Curated Annual Photo Exhibition [Demo]': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80',
  'Moments in Monochrome Exhibition 2025 [Demo]': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
  'Collegiate Venture Pitch Challenge [Demo]': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
  'RoboMaze Navigation Challenge 2025 [Demo]': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'Full-Stack Web Systems Challenge [Demo]': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  'Business Case Competition 2026 [Demo]': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  'National Case Crackers Invitational 2025 [Demo]': 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
  'Volunteer Orientation & Field Training [Demo]': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  'Undergraduate Research Poster Exhibition [Demo]': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
  'Astrophysics Colloquium 2025 [Demo]': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'Horizon Collegiate Programming Contest [Demo]': 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
  'Executive Career & Networking Workshop [Demo]': 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80',
  'Winter Relief Drive Kickoff 2025 [Demo]': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80',
  'National Collegiate Science Olympiad [Demo]': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
  'Metropolitan Community Service Day [Demo]': 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80',
  'Grassroots Fundraising Workshop [Demo]': 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80',
  'Inter-Collegiate Science Quiz Battle [Demo]': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
}

async function run() {
  console.log('Enriching fests banner_url...')
  for (const [title, bannerUrl] of Object.entries(FEST_BANNERS)) {
    const { error } = await supabase.from('fests').update({ banner_url: bannerUrl }).eq('title', title)
    if (error) console.error(`Failed to update fest "${title}":`, error.message)
    else console.log(`✓ Fest "${title}" banner updated.`)
  }

  console.log('\nEnriching events cover_image_url...')
  for (const [title, coverUrl] of Object.entries(EVENT_COVERS)) {
    const { error } = await supabase.from('events').update({ cover_image_url: coverUrl }).eq('title', title)
    if (error) console.error(`Failed to update event "${title}":`, error.message)
    else console.log(`✓ Event "${title}" cover updated.`)
  }

  console.log('\nEnrichment complete.')
}

run()
