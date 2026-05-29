import { sanityClient, CAROUSEL_PHOTOS_QUERY } from "@/lib/sanity";
import Carousel from "@/components/Carousel";
import type { Photo } from "@/types";

export const revalidate = 60;

export default async function DisplayPage() {
  const carouselPhotos: Photo[] = await sanityClient.fetch(
    CAROUSEL_PHOTOS_QUERY,
  );

  return (
    <div>
      {/* Hero carousel */}
      <Carousel photos={carouselPhotos} />
    </div>
  );
}
