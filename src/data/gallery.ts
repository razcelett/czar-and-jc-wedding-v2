/** Gallery strip. Put files in public/assets/images or public/assets/video and list them here.
 *  src: what shows on the card · full: optional larger file for the full-screen view · video: true for clips */
export type GalleryItem = { src: string; cap: string; full?: string; poster?: string; video?: boolean };

export const GALLERY: GalleryItem[] = [
  { src: '/assets/video/g-vid1-card.mp4', full: '/assets/video/g-vid1.mp4', poster: '/assets/images/g-vid1.jpg', cap: 'Our seat on the wreck', video: true },
  { src: '/assets/images/g-together.jpg', full: '/assets/images/g-together-full.jpg', cap: 'Rising together' },
  { src: '/assets/images/g-jacks.jpg', full: '/assets/images/g-jacks-full.jpg', cap: 'Under the jack tornado' },
  { src: '/assets/video/g-vid2-card.mp4', full: '/assets/video/g-vid2.mp4', poster: '/assets/images/g-vid2.jpg', cap: 'Through the sardine run', video: true },
  { src: '/assets/images/g-turtle.jpg', full: '/assets/images/g-turtle-full.jpg', cap: 'Swimming with a turtle' },
  { src: '/assets/images/g-bubble-ring.jpg', full: '/assets/images/g-bubble-ring-full.jpg', cap: 'A ring of breath' },
  { src: '/assets/video/g-vid3-card.mp4', full: '/assets/video/g-vid3.mp4', poster: '/assets/images/g-vid3.jpg', cap: 'Over the coral garden', video: true },
  { src: '/assets/images/g-rose.jpg', full: '/assets/images/g-rose-full.jpg', cap: 'A rose between us' },
  { src: '/assets/images/g-whale-shark.jpg', full: '/assets/images/g-whale-shark-full.jpg', cap: 'Beside the gentle giant' },
  { src: '/assets/video/g-vid4-card.mp4', full: '/assets/video/g-vid4.mp4', poster: '/assets/images/g-vid4.jpg', cap: 'Dancing in the blue', video: true },
  { src: '/assets/images/g-reaching.jpg', full: '/assets/images/g-reaching-full.jpg', cap: 'Reaching for the light' },
  { src: '/assets/images/g-into-school.jpg', full: '/assets/images/g-into-school-full.jpg', cap: 'Into the school' },
  { src: '/assets/video/g-vid5-card.mp4', full: '/assets/video/g-vid5.mp4', poster: '/assets/images/g-vid5.jpg', cap: 'Down the canyon', video: true },
  { src: '/assets/images/g-bride-pool.jpg', full: '/assets/images/g-bride-pool-full.jpg', cap: 'A dress for the deep' },
  { src: '/assets/images/g-weightless.jpg', full: '/assets/images/g-weightless-full.jpg', cap: 'Weightless over the reef' },
  { src: '/assets/images/g-halos.jpg', full: '/assets/images/g-halos-full.jpg', cap: 'Halos of air' },
  { src: '/assets/images/g-duck-dive.jpg', full: '/assets/images/g-duck-dive-full.jpg', cap: 'Duck dive into the blue' },
  { src: '/assets/images/g-rising.jpg', full: '/assets/images/g-rising-full.jpg', cap: 'Rising to meet you' },
  { src: '/assets/images/g-eyes-up.jpg', full: '/assets/images/g-eyes-up-full.jpg', cap: 'Eyes on the surface' },
];
