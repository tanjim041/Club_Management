import { HeroSection } from './components/hero-section'
import { ClubDiscoverySection } from './components/club-discovery-section'
import { FeaturedEventsSection } from './components/featured-events-section'
import { ClubAchievementsSection } from './components/club-achievements-section'
import { PastEventsSection } from './components/past-events-section'
import { HowItWorksSection } from './components/how-it-works-section'
import { CtaBannerSection } from './components/cta-banner-section'

export function LandingPage() {
  return (
    <div className="content-container space-y-14 sm:space-y-16 lg:space-y-24 py-6 sm:py-10 lg:py-14 pb-20 sm:pb-24 lg:pb-32">
      {/* 1. Open Two-Column Editorial Hero */}
      <HeroSection />

      {/* 2. Campus Club Communities */}
      <ClubDiscoverySection />

      {/* 3. Editorial Row List of Upcoming Events */}
      <FeaturedEventsSection />

      {/* 4. Published Club Achievements (omitted if empty) */}
      <ClubAchievementsSection isPublicHomepage={true} />

      {/* 5. Previous Event Highlights (omitted if empty) */}
      <PastEventsSection isPublicHomepage={true} />

      {/* 6. Compact Numbered Workflow (01 Discover, 02 Register, 03 Participate) */}
      <HowItWorksSection />

      {/* 7. Action Banner */}
      <CtaBannerSection />
    </div>
  )
}
