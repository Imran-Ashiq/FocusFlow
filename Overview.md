# FocusFlow - Technical Implementation Overview

## Project Summary
FocusFlow is a professional desktop productivity application built with Electron.js that combines the Pomodoro Technique with advanced analytics and customizable features. This document provides a technical overview of the advanced features implemented beyond the initial basic timer functionality.

---

## 1. Customizable Timer Durations

### Data Storage Architecture
- **Storage Location**: User preferences are persisted in `settings.json` file located in the application's user data directory
- **Data Structure**: JSON object containing three timer duration properties:
  ```json
  {
    "workDuration": 25,
    "shortBreakDuration": 5,
    "longBreakDuration": 15
  }
  ```

### Implementation Details
- **Settings Management**: The main process (`main.js`) handles all file I/O operations for settings persistence
- **IPC Communication**: Settings are synchronized between main and renderer processes using Electron's IPC system
- **Default Fallback**: If `settings.json` doesn't exist or contains invalid data, the application uses hardcoded defaults (25/5/15 minutes)

### Timer Logic Integration
- **Dynamic Duration Loading**: When a timer button is clicked in `renderer.js`, the application:
  1. Sends IPC request to main process to load current settings
  2. Receives custom duration values via IPC response
  3. Applies the custom duration instead of hardcoded values
  4. Updates the timer display and countdown logic accordingly

- **Settings UI**: Dedicated settings window (`settings.html`) allows real-time modification of timer durations with immediate persistence to `settings.json`

---

## 2. Session and Analytics Data Storage

### Data Architecture
- **Storage Location**: Analytics data is stored in `analytics.json` file in the application's user data directory
- **Data Structure**: Hierarchical JSON structure organized by date:
  ```json
  {
    "2025-01-15": {
      "sessions": 8,
      "totalFocusTime": 200,
      "achievements": ["first-session", "5-a-day"]
    },
    "2025-01-16": {
      "sessions": 12,
      "totalFocusTime": 300,
      "achievements": ["10-a-day", "focus-master"]
    }
  }
  ```

### Session Completion Recording
- **Trigger Event**: Session completion is recorded when a work timer reaches zero (not when manually stopped)
- **Data Recording Process**:
  1. Timer completion triggers IPC message to main process
  2. Main process loads existing `analytics.json` data
  3. Current date is used as the key to update daily statistics
  4. Session count and total focus time are incremented
  5. Achievement conditions are evaluated and updated
  6. Modified data is written back to `analytics.json`

### Data Persistence Strategy
- **Atomic Updates**: All analytics updates are performed atomically to prevent data corruption
- **Error Handling**: File operations include proper error handling with fallback to default data structure
- **Performance**: Data is loaded on-demand rather than kept in memory to reduce application footprint

---

## 3. "Today's Sessions" Counter

### Real-time UI Updates
- **Display Location**: Main timer interface (`index.html`) shows current day's session count
- **Update Mechanism**: 
  1. On application startup, renderer requests today's session count via IPC
  2. After each completed session, the counter is immediately updated without requiring app restart
  3. The UI subscribes to session completion events to maintain real-time accuracy

### Implementation Details
- **Date Handling**: Uses `new Date().toDateString()` for consistent date key formatting across all components
- **IPC Communication**: Dedicated IPC channel (`get-today-sessions`) for retrieving current day's statistics
- **DOM Updates**: Counter element is updated directly in the DOM using `document.getElementById` for immediate visual feedback

---

## 4. Focus Analytics Dashboard Logic

### Data Calculation Engine

#### Current Streak Calculation
- **Algorithm**: Iterates through analytics data in reverse chronological order
- **Logic**: 
  1. Starts from current date and works backward
  2. Counts consecutive days with at least 1 completed session
  3. Stops at the first day with 0 sessions or missing data
  4. Returns the count of consecutive active days

#### Daily Focus Score Calculation
- **Scoring Formula**: Combines multiple productivity metrics:
  ```javascript
  focusScore = (sessions * 10) + (totalFocusTime / 60 * 2) + (streakBonus * 5)
  ```
- **Components**:
  - Session count weighted heavily (10 points per session)
  - Total focus time provides granular scoring (2 points per minute)
  - Current streak adds bonus multiplier (5 points per streak day)

### Achievements System

#### Achievement Definitions
- **Data Structure**: Array of achievement objects with conditions and metadata:
  ```javascript
  {
    id: "5-a-day",
    name: "5-A-Day",
    description: "Complete 5 sessions in a single day",
    condition: (dayData) => dayData.sessions >= 5,
    icon: "🏆"
  }
  ```

#### Achievement Evaluation Logic
- **Trigger Points**: Achievements are checked after each session completion and when loading analytics dashboard
- **Evaluation Process**:
  1. Iterates through all defined achievements
  2. Applies condition function to current day's data
  3. Marks achievement as earned if condition returns true
  4. Prevents duplicate achievement awards using achievement history tracking

#### Achievement Categories
- **Session-based**: Daily session count milestones (5, 10, 20 sessions)
- **Streak-based**: Consecutive day achievements (3, 7, 30 days)
- **Time-based**: Total focus time milestones (100, 500, 1000 minutes)
- **Special**: Unique combinations (Perfect Week, Focus Master)

### Productivity Heatmap

#### Data Generation Process
- **Date Range**: Generates data for the last 365 days to create annual heatmap view
- **Data Transformation**:
  1. Creates array of date objects covering the past year
  2. Maps each date to corresponding analytics data (if available)
  3. Calculates intensity values based on session count and focus time
  4. Formats data for Chart.js heatmap visualization

#### Visualization Implementation
- **Chart Library**: Uses Chart.js with custom heatmap configuration
- **Color Mapping**: 
  - 0 sessions: Light gray (#ebedf0)
  - 1-3 sessions: Light green (#c6e48b)
  - 4-6 sessions: Medium green (#7bc96f)
  - 7+ sessions: Dark green (#239a3b)

#### Data Structure for Heatmap
```javascript
heatmapData = [
  { date: "2025-01-15", value: 8, sessions: 8, focusTime: 200 },
  { date: "2025-01-16", value: 12, sessions: 12, focusTime: 300 }
]
```

---

## Technical Architecture Highlights

### File Structure
- **Main Process**: `src/main.js` - Handles file I/O, window management, and IPC coordination
- **Renderer Process**: `src/renderer.js` - Timer logic and main UI interactions
- **Analytics Dashboard**: `src/analytics.js` - Data visualization and analytics calculations
- **Settings Management**: `src/settings.js` - User preference handling
- **Data Storage**: JSON files in user data directory for cross-session persistence

### IPC Communication Channels
- `save-settings` / `load-settings`: Settings persistence
- `save-analytics` / `get-analytics`: Analytics data management
- `get-today-sessions`: Real-time session counter
- `session-completed`: Session completion notifications

### Error Handling Strategy
- **File Operations**: Comprehensive try-catch blocks with fallback to default data
- **Data Validation**: Input validation for all user-configurable values
- **Graceful Degradation**: Application continues functioning even if analytics data is corrupted

### Performance Considerations
- **Lazy Loading**: Analytics data is loaded only when analytics dashboard is opened
- **Efficient Updates**: Only modified data is written to disk, not entire datasets
- **Memory Management**: Large datasets are processed in chunks to prevent memory issues

---

## Future Enhancement Opportunities

### Scalability Improvements
- **Database Migration**: Consider SQLite for better performance with large datasets
- **Data Compression**: Implement data compression for reduced storage footprint
- **Cloud Sync**: Add optional cloud synchronization for multi-device usage

### Advanced Analytics
- **Trend Analysis**: Week-over-week and month-over-month performance comparisons
- **Productivity Insights**: AI-powered recommendations based on usage patterns
- **Export Functionality**: CSV/PDF export for external analysis

### User Experience Enhancements
- **Customizable Achievements**: User-defined achievement goals and conditions
- **Advanced Theming**: Dark mode and custom color schemes
- **Notification Customization**: Granular control over notification types and timing

---

*This technical overview documents the advanced features implemented in FocusFlow v1.0.0, showcasing the evolution from a basic Pomodoro timer to a comprehensive productivity analytics platform.*
