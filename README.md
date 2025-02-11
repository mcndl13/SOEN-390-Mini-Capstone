# SOEN-390-Mini-Capstone: Campus Guide Mobile App

## Project Overview

The Campus Guide Mobile App is designed to help students, faculty, and visitors navigate the university campus more efficiently. It offers essential features, including real-time location tracking, outdoor and indoor navigation, and easy access to campus facilities and resources. By incorporating advanced mapping technologies and a user-friendly design, the app aims to enhance the overall user experience on campus.

---

## Features

1. **Real-Time Location Tracking**:

   - Displays the user’s current location on the campus map.
   - Allows seamless switching between different campus locations.

2. **Navigation Services**:

   - Outdoor directions between buildings with real-time updates.
   - Indoor navigation for specific rooms with accessibility-aware options.

3. **Facility Finder**:

   - Helps locate nearby facilities such as washrooms, elevators, coffee shops, and more.

4. **Class Schedule Integration**:
   - Syncs with calendars to guide users to their next class based on time and location.

---

## Objective

Create an intuitive and functional guide for navigating the Concordia University campuses (SGW & Loyala).

---

## Installation & Setup

#### 1. Clone the Repository

First, clone the project repository from GitHub to your local machine:

```bash
git clone https://github.com/YOUR-USERNAME/SOEN-390-Mini-Capstone
```

#### 2. Frontend Setup

- Navigate to the map-application directory:

```bash
cd SOEN-390-Mini-Capstone/lost-in-faubourg-app/
```

- Install all required libraries and dependencies:

```bash
npm install
```

- Install @expo/ngrok locally inside your project:

```bash
npm install @expo/ngrok --save-dev
```

#### 3. Start the App

- On home wifi:

```bash
npx expo start
```

- On Concordia Wifi:

```bash
npx expo start --tunnel
```

---

## Technologies Used

- **Front-End**: React Native
- **Mapping**: Google Maps API
- **Back-End**: Firebase
- **Tools**: GitHub, ZenHub
- **Testing**: Jest, Maestro
- **Report**: https://sonarcloud.io/project/overview?id=mcndl13_SOEN-390-Mini-Capstone

---
