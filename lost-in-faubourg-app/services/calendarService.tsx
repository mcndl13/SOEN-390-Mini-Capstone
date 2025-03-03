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
    console.log("Full Calendar API Response:", data);

    if (data.error) {
      console.error("Google Calendar API Error:", data.error);
      return [];
    }

    if (data.items && Array.isArray(data.items)) {
      return data.items.map((event: any) => ({
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        location: event.location || "N/A",
      }));
    } else {
      console.warn("No events found in the calendar.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}
