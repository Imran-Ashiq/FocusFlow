// Get DOM Elements
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-btn');
const shortBreakBtn = document.getElementById('short-break-btn');
const longBreakBtn = document.getElementById('long-break-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const settingsBtn = document.getElementById('settings-btn');
const helpBtn = document.getElementById('help-btn');
const sessionCountElement = document.getElementById('session-count');
const openAnalyticsBtn = document.getElementById('open-analytics-btn');
const miniModeBtn = document.getElementById('mini-mode-btn');

// Audio for break notifications
const breakSound = new Audio('../assets/sounds/notification.mp3');

// State Variables
let countdown;
let timeInSeconds = 1500; // Default 25 minutes (25 * 60 = 1500 seconds)
let isPaused = true;
let settings; // Store settings from main process
let isMiniMode = false;

// --- The Classmate Easter Egg - Optimized Version ---

// 1. The Data: All names are stored in a Set for fast lookups.
// It's a good practice, even though we will loop.
const secretCodes = new Set([
  'saleem', 'ilyas', 'sami', 'waleed', 'abdulrehman', 'saqib', 'abbasi',
  'ikhlaq', 'misbah', 'hamza', 'arslan', 'zunaira', 'jawad', 'zahida',
  'amna', 'haris', 'laiba', 'hashim', 'khadija', 'awais', 'mahnoor',
  'malaika', 'abbas', 'bilaj', 'aqsa', 'junaid', 'munim', 'tarees',
  'kashaf', 'shanza', 'farhan', 'saba', 'sakhawat', 'fiza', 'ammar',
  'waqar', 'farwa', 'ali', 'nadia', 'mudassar', 'naina', 'faisal',
  'ehsan', 'areesha', 'yasir', 'maahin', 'usman', 'muneeb', 'irsa',
  'hammad', 'afshan', 'shaheen', 'minnahil', 'mushahid', 'basit',
  'zeshan', 'drsajid', 'usama', 'imran'
]);

// 2. The Input Buffer: This will store the last few keypresses.
let keyBuffer = '';

// Load Settings on Startup
window.addEventListener('DOMContentLoaded', async () => {
    try {
        settings = await window.electronAPI.invoke('get-settings');
        // Set initial timer display to default work time
        timeInSeconds = settings.timers.work * 60;
        updateDisplay();
        console.log('Settings loaded:', settings);
        
        // Load analytics data on startup
        updateSessionCount();
    } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to default settings
        settings = {
            timers: { work: 25, short: 5, long: 15 },
            blocklist: []
        };
        timeInSeconds = 25 * 60;
        updateDisplay();
    }

    // Event Listeners
    startBtn.addEventListener('click', () => startNewTimer(settings.timers.work));
    shortBreakBtn.addEventListener('click', () => {
        window.electronAPI.send('deactivate-blocker');
        startNewTimer(settings.timers.short);
    });
    longBreakBtn.addEventListener('click', () => {
        window.electronAPI.send('deactivate-blocker');
        startNewTimer(settings.timers.long);
    });
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    settingsBtn.addEventListener('click', openSettings);
    helpBtn.addEventListener('click', openHelp);
    openAnalyticsBtn.addEventListener('click', openAnalytics);
    
    // Listen for settings updates from main process
    window.electronAPI.on('settings-updated', (newSettings) => {
        console.log('Received settings update from main process.');
        settings = newSettings;
        // Update the display to reflect the new default work time
        if (isPaused) {
            timeInSeconds = settings.timers.work * 60;
            updateDisplay();
        }
    });
    
    // Listen for analytics updates to refresh session count
    window.electronAPI.on('analytics-updated', () => {
        console.log('Analytics updated - refreshing session count...');
        updateSessionCount();
    });

    // 3. The Listener Logic: This code is highly optimized.
    window.addEventListener('keydown', (event) => {
      // Ignore modifier keys to keep the buffer clean
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Add the new key (lowercase) to the end of our buffer string
      keyBuffer += event.key.toLowerCase();

      // Keep the buffer from getting excessively long (e.g., longer than the longest name)
      if (keyBuffer.length > 15) {
        keyBuffer = keyBuffer.substring(keyBuffer.length - 15);
      }

      // --- The Optimized Check ---
      // We check the buffer against our Set of names.
      if (secretCodes.has(keyBuffer)) {
        console.log(`Secret code activated: ${keyBuffer}`);

        // Toggle the theme
        document.body.classList.toggle('dev-mode');

        // IMPORTANT: Clear the buffer immediately after a match
        keyBuffer = '';
      }
    });

    // Mini Mode Toggle
    const miniModeIcon = miniModeBtn.querySelector('i'); // Get the icon element
    miniModeBtn.addEventListener('click', () => {
        isMiniMode = !isMiniMode; // Toggle the state

        // Send the IPC message
        window.electronAPI.send('toggle-mini-mode', isMiniMode);

        // Toggle the CSS class on the body
        document.body.classList.toggle('mini-mode', isMiniMode);

        // --- NEW LOGIC TO SWAP THE ICON ---
        if (isMiniMode) {
            miniModeIcon.classList.remove('fa-compress-alt');
            miniModeIcon.classList.add('fa-expand-alt');
            miniModeBtn.title = 'Exit Mini Mode'; // Update tooltip
        } else {
            miniModeIcon.classList.remove('fa-expand-alt');
            miniModeIcon.classList.add('fa-compress-alt');
            miniModeBtn.title = 'Enter Mini Mode'; // Update tooltip
        }
    });
});

// Analytics Function - Update Session Count
async function updateSessionCount() {
    try {
        const analyticsResponse = await window.electronAPI.invoke('get-analytics-data');
        const analyticsData = analyticsResponse.sessions;
        
        // Get today's date in YYYY-MM-DD format using local time
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        
        // Filter completed sessions for today
        const todaySessions = analyticsData.filter(session => {
            const sessionDate = new Date(session.timestamp || session.completedAt);
            const sessionYear = sessionDate.getFullYear();
            const sessionMonth = (sessionDate.getMonth() + 1).toString().padStart(2, '0');
            const sessionDay = sessionDate.getDate().toString().padStart(2, '0');
            const sessionDateKey = `${sessionYear}-${sessionMonth}-${sessionDay}`;
            
            return sessionDateKey === todayKey && (session.status === 'completed' || session.completedAt);
        });
        
        // Update the display
        sessionCountElement.textContent = todaySessions.length;
        
        console.log(`Today's completed sessions: ${todaySessions.length}`);
    } catch (error) {
        console.error('Error updating session count:', error);
        sessionCountElement.textContent = '0';
    }
}

// Update Display Function
function updateDisplay() {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    
    // Format with leading zeros
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    
    timerDisplay.textContent = `${formattedMinutes}:${formattedSeconds}`;
}

// Central Timer Function
function startNewTimer(minutes) {
    // Clear any existing timer interval
    clearInterval(countdown);
    
    // Convert minutes to seconds
    timeInSeconds = minutes * 60;
    
    // Update display with new time
    updateDisplay();
    
    // Activate the website blocker
    window.electronAPI.send('activate-blocker');
    
    // Start countdown
    isPaused = false;
    
    countdown = setInterval(() => {
        timeInSeconds--;
        updateDisplay();
        
        // Check if timer has reached zero
        if (timeInSeconds < 0) {
            // Send completion event to main process
            window.electronAPI.send('pomodoro-completed');
            
            // 1. Play the sound first.
            try {
                breakSound.play();
            } catch (error) {
                console.log('Audio notification not available:', error);
            }

            // 2. Tell the main process to show the native OS notification.
            window.electronAPI.send('timer-finished');
            
            // Deactivate blocker when timer finishes
            window.electronAPI.send('deactivate-blocker');
            
            // Clean up timer
            clearInterval(countdown);
            isPaused = true;
            timeInSeconds = 0;
            updateDisplay();
            
            // Update session count display
            updateSessionCount();
            
            console.log('Timer finished!');
        }
    }, 1000);
}

// Pause Timer Function
function pauseTimer() {
    // Send interruption signal to analytics
    window.electronAPI.send('pomodoro-interrupted');
    
    // Deactivate website blocker when timer is paused
    window.electronAPI.send('deactivate-blocker');
    
    isPaused = true;
    clearInterval(countdown);
}

// Reset Timer Function
function resetTimer() {
    // Send interruption signal to analytics
    window.electronAPI.send('pomodoro-interrupted');
    
    // Deactivate website blocker when timer is reset
    window.electronAPI.send('deactivate-blocker');
    
    clearInterval(countdown);
    isPaused = true;
    
    // Reset to default work time from settings
    if (settings && settings.timers) {
        timeInSeconds = settings.timers.work * 60;
    } else {
        timeInSeconds = 25 * 60; // Fallback to 25 minutes
    }
    
    updateDisplay();
}

// Open Settings Function
function openSettings() {
    window.electronAPI.send('open-settings-window');
}

// Open Analytics Function
function openAnalytics() {
    window.electronAPI.send('open-analytics-window');
}

// Open Help Function
function openHelp() {
    window.electronAPI.send('open-help-window');
}

// Listen for global shortcuts
window.electronAPI.onShortcut((action) => {
    console.log(`Shortcut triggered: ${action}`);
    switch (action) {
        case 'start':
            // Assuming startBtn is available and clicking it starts the timer
            if (startBtn) startBtn.click();
            break;
        case 'pause':
            if (pauseBtn) pauseBtn.click();
            break;
        case 'reset':
            if (resetBtn) resetBtn.click();
            break;
    }
});
