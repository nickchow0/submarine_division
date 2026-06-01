import {
  sanityClient,
  ALL_PHOTOS_QUERY,
  SITE_SETTINGS_QUERY,
} from "@/lib/sanity";
import Portfolio from "@/components/Portfolio";
import { type Photo, type SiteSettings, DEFAULT_SETTINGS } from "@/types";

export const revalidate = 60;

export default async function PortfolioPage() {
  const [photos, settings] = await Promise.all([
    sanityClient.fetch<Photo[]>(ALL_PHOTOS_QUERY),
    sanityClient.fetch<SiteSettings | null>(SITE_SETTINGS_QUERY),
  ]);

  const { showCaptions, screensaverEnabled } = settings ?? DEFAULT_SETTINGS;

  const shuffled = [...photos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // eslint-disable-next-line react-hooks/purity
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return <Portfolio photos={shuffled} showCaptions={showCaptions} screensaverEnabled={screensaverEnabled} />;
}
