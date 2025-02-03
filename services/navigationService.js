// navigationService.js

// Mock function to simulate fetching directions data
export async function getDirections(start, destination) {
    // Replace this mock with actual API call to a navigation service
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          start,
          destination,
          path: 'Mock path between start and destination',
        });
      }, 1000);
    });
  }
  
  // Mock function to simulate fetching indoor map data
  export async function getIndoorMapData() {
    // Replace this mock with actual API call or static indoor map data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            name: 'Floor 1',
            pointsOfInterest: ['Entrance', 'Reception', 'Restroom'],
          },
          {
            name: 'Floor 2',
            pointsOfInterest: ['Conference Room', 'Elevator', 'Break Area'],
          },
        ]);
      }, 1000);
    });
  }
  