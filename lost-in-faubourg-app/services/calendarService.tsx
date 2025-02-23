// services/calendarService.ts
export async function getCalendarEvents(token: string) {
  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const data = await res.json();
    return data.items.map((event: any) => ({
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      location: event.location,
    }));
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}