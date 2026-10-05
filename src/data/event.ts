/** Wedding date (Philippine time) for the countdown. */
export const WEDDING_DATE = '2027-09-18T14:00:00+08:00';

/** The RSVP form talks to the site's own server route, which passes requests on to Google.
 *  The Google address lives in the RSVP_ENDPOINT environment variable. */
export const RSVP_API = '/api/rsvp';

/** Pre-nup film share link from Google Drive, read from NEXT_PUBLIC_PRENUP_DRIVE_URL. Unset = player hidden. */
export const PRENUP_DRIVE_URL = process.env.NEXT_PUBLIC_PRENUP_DRIVE_URL || '';