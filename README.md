 FocusFlow - A Smart Pomodoro & Website Blocker

## 1. Project Overview

**What is this project?**
FocusFlow is a desktop application designed to help users improve their productivity and focus. It combines the popular Pomodoro Technique with a customizable website blocker. The application will allow users to start work sessions (e.g., 25 minutes) followed by short breaks, and during these work sessions, it will block access to distracting websites.

**Why are we building this?**
In an age of constant digital distractions, maintaining focus is a major challenge. This application aims to provide a simple yet powerful tool to help students, developers, writers, and any professional to manage their time effectively and minimize interruptions, leading to more productive work sessions.

**Who is the target audience?**
The target audience includes students, remote workers, freelancers, programmers, writers, and anyone who works on a computer and struggles with online distractions.

## 2. Key Features & User Stories

**Core Timer Functionality:**
*   As a user, I want to start a 25-minute Pomodoro timer for a focused work session.
*   As a user, I want to be notified with a sound and a desktop notification when my work session ends and a break begins.
*   As a user, I want to be able to start a 5-minute short break timer and a 15-minute long break timer.
*   As a user, I want the application to automatically cycle through Pomodoro sessions and breaks.
*   As a user, I want to be able to pause, reset, and skip the current timer.
*   As a user, I want to be able to customize the duration of work sessions, short breaks, and long breaks from a settings page.

**Website Blocker Functionality:**
*   As a user, I want to have a predefined list of distracting websites (e.g., facebook.com, youtube.com, twitter.com) blocked during my Pomodoro work sessions.
*   As a user, I want to be able to add new websites to the blocklist.
*   As a user, I want to be able to remove websites from the blocklist.
*   As a user, when I try to access a blocked site during a work session, I want to see a simple "This site is blocked by FocusFlow" page.
*   As a user, I want the website blocker to automatically enable during work sessions and disable during breaks.

**Simple Analytics:**
*   As a user, I want to see a simple count of how many Pomodoro sessions I have completed today.

## 3. Technology Stack

*   **Core Framework:** **Electron.js** (This is crucial as it allows us to build a cross-platform desktop app with HTML, CSS, and JavaScript, and package it as an `.exe`).
*   **Frontend:** **HTML5, CSS3, JavaScript (Vanilla JS)**. We will keep it simple without a heavy framework like React to start.
*   **System Interaction:** **Node.js APIs** provided by Electron for file system access (to read/write the blocklist) and desktop notifications.
*   **Packaging:** **Electron Packager** or **Electron Builder** to create the final `.exe` installer.

## 4. Architectural Decisions

*   **Main Process vs. Renderer Process:** We will use Electron's main process (`main.js`) to handle window creation, system-level interactions (like modifying the hosts file for the site blocker), and background tasks. The renderer process (`index.html`, `renderer.js`) will manage the user interface and user interactions.
*   **Data Persistence:** The user's custom settings (timer durations) and the website blocklist will be stored in a simple JSON file in the user's application data directory.
*   **Website Blocking Method:** The application will temporarily modify the system's `hosts` file to block websites. It will redirect the domains in the blocklist to `127.0.0.1`. **Crucially, the app must have a cleanup mechanism to restore the hosts file when the app is closed or crashes.**

## 5. File and Directory Structure

/FocusFlow
├── src/
│ ├── main.js # Electron main process, handles window and system tasks
│ ├── preload.js # Bridges main and renderer processes securely
│ ├── index.html # Main application window (UI)
│ ├── renderer.js # UI logic, event handling
│ └── style.css # All CSS styles
├── assets/
│ └── icons/
│ ├── icon.png # App icon
│ └── sounds/
│ └── notification.mp3 # Sound for timer completion
├── package.json
└── README.md


## 6. Step-by-Step Implementation Plan

1.  **Project Setup:**
    *   Initialize a new Node.js project (`npm init -y`).
    *   Install Electron (`npm install --save-dev electron`).
    *   Create the file and directory structure as specified above.
    *   Configure `package.json` with a start script: `"start": "electron ."`.
2.  **Basic Electron Window:**
    *   In `main.js`, write the code to create and manage a basic browser window.
    *   Load `index.html` into the window.
3.  **UI for Timer:**
    *   In `index.html`, create the visual elements: a timer display (e.g., "25:00"), Start, Pause, and Reset buttons.
    *   In `style.css`, add basic styling for the UI.
4.  **Timer Logic:**
    *   In `renderer.js`, implement the JavaScript logic for the countdown timer. Make the Start, Pause, and Reset buttons functional.
5.  **Website Blocker Logic (Main Process):**
    *   In `main.js`, write functions to:
        *   Find the path to the system's `hosts` file.
        *   Read the `hosts` file.
        *   Append entries to block websites (e.g., `127.0.0.1 facebook.com`).
        *   Remove those entries to unblock websites.
    *   **Implement a robust cleanup function to restore the hosts file on app 'close' event.**
6.  **Connecting UI to Blocker:**
    *   Use Electron's IPC (Inter-Process Communication) to send messages from the renderer process (`renderer.js`) to the main process (`main.js`).
    *   When the user starts a Pomodoro session, send a message to the main process to "activate" the blocker.
    *   When the session ends or is reset, send a message to "deactivate" the blocker.
7.  **Settings & Blocklist Management:**
    *   Create a simple settings UI (can be a separate HTML file or a modal in the main window).
    *   Implement logic to read/write the website list and custom timer durations from a JSON settings file.
8.  **Packaging the Application:**
    *   Install and configure `electron-builder`.
    *   Add a build script to `package.json`.
    *   Run the build script to generate the `.exe` installer.

## 7. Installation and Setup (for Development)

```bash
# Clone the repository (once created)
git clone [your-repo-link]

# Navigate into the project directory
cd FocusFlow

# Install dependencies
npm install

# Run the application in development mode
npm start


