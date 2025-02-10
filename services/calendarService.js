// calendarService.js

// Mock function to simulate fetching calendar events
export async function getCalendarEvents() {
  // Replace this mock with actual integration with Google Calendar API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          summary: 'Math Class',
          start: '2025-01-20T09:00:00',
          location: 'Building A, Room 101',
        },
        {
          summary: 'Physics Lab',
          start: '2025-01-20T11:00:00',
          location: 'Building B, Room 202',
        },
        {
          summary: 'Meeting with Advisor',
          start: '2025-01-20T14:00:00',
          location: 'Building C, Office 303',
        },
      ])
    }, 1000)
  })
}
