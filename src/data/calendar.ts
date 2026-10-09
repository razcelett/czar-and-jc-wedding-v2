/** "Add to calendar" details, shared by the hero button and the RSVP thank-you.
 *  Times are in UTC: 2:00 PM to 11:00 PM in the Philippines (UTC+8) is 06:00 to 15:00 UTC.
 *  If anything changes, also update public/czar-jc-wedding.ics (Apple / Outlook). */
export const CALENDAR = {
  title: "Czar & JC's Wedding",
  start: '20270918T060000Z',
  end: '20270918T150000Z',
  location: 'San Miguel Arkanghel Parish, Bgy. San Miguel, Puerto Princesa City, Palawan',
  details:
    'Ceremony 2:00 PM at San Miguel Arkanghel Parish (please be seated by 1:45 PM).\n' +
    'Cocktails 4:00 PM, reception 6:00 PM and after party 9:00 PM at Citystate Asturias Hotel Palawan, South National Highway, Tiniguban.\n' +
    'Dress code: formal / semi-formal in our Colours of the Deep. See you at depth!',
};

export const ICS_PATH = '/czar-jc-wedding.ics';

export function googleCalendarUrl(): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: CALENDAR.title,
    dates: `${CALENDAR.start}/${CALENDAR.end}`,
    details: CALENDAR.details,
    location: CALENDAR.location,
    ctz: 'Asia/Manila',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
