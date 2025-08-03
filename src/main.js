const { app, BrowserWindow, ipcMain, Menu, dialog, globalShortcut, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Define Blocker Constants
const hostsPath = process.platform === 'win32' ? 'C:/Windows/System32/drivers/etc/hosts' : '/etc/hosts';
const redirectIp = '127.0.0.1';
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const analyticsPath = path.join(app.getPath('userData'), 'analytics.json');
let websitesToBlock = [];
let timerDurations = { work: 25, short: 5, long: 15 };
let mainWindow; // Store reference to main window

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Remove the menu bar
  mainWindow.setMenu(null);

  // Load the index.html file
  console.log('Loading main window file:', path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.loadFile('src/index.html');
}

// Settings Management Functions
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      // Load existing settings
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(settingsData);
      websitesToBlock = settings.blocklist || [];
      
      // Load timer durations, set defaults if missing
      if (settings.timers) {
        timerDurations = {
          work: settings.timers.work || 25,
          short: settings.timers.short || 5,
          long: settings.timers.long || 15
        };
      } else {
        timerDurations = { work: 25, short: 5, long: 15 };
      }
      
      console.log('Settings loaded successfully');
    } else {
      // Create default settings
      const defaultBlocklist = [
        'www.youtube.com',
        'youtube.com',
        'www.facebook.com',
        'facebook.com',
        'www.twitter.com',
        'twitter.com',
        'www.instagram.com',
        'instagram.com'
      ];
      
      websitesToBlock = defaultBlocklist;
      timerDurations = { work: 25, short: 5, long: 15 };
      
      // Save default settings to file
      const defaultSettings = { 
        blocklist: defaultBlocklist,
        timers: { work: 25, short: 5, long: 15 }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      console.log('Default settings created and saved');
    }
  } catch (error) {
    console.error('Error loading settings:', error.message);
    // Fallback to default list if there's an error
    websitesToBlock = [
      'www.youtube.com',
      'youtube.com',
      'www.facebook.com',
      'facebook.com',
      'www.twitter.com',
      'twitter.com',
      'www.instagram.com',
      'instagram.com'
    ];
    timerDurations = { work: 25, short: 5, long: 15 };
  }
}

// Helper to get YYYY-MM-DD from a Date object in local time
function getLocalDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate Analytics Stats
function calculateStats(analyticsData) {
  let streak = 0;
  let badges = [];
  
  if (analyticsData.length === 0) {
    return { streak: 0, badges: [], focusScore: 0 };
  }
  
  // Calculate streak and daily focus score
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  
  // Group sessions by date and separate completed vs interrupted
  const sessionsByDate = {};
  analyticsData.forEach(session => {
    // Handle both old format (completedAt) and new format (timestamp + status)
    const sessionDate = session.timestamp ? new Date(session.timestamp) : new Date(session.completedAt);
    const dateKey = getLocalDateKey(sessionDate);
    
    if (!sessionsByDate[dateKey]) {
      sessionsByDate[dateKey] = { completed: [], interrupted: [] };
    }
    
    // Determine session type
    if (session.status === 'completed' || session.completedAt) {
      sessionsByDate[dateKey].completed.push(session);
    } else if (session.status === 'interrupted') {
      sessionsByDate[dateKey].interrupted.push(session);
    }
  });
  
  // Calculate current streak (based on completed sessions only)
  let currentDate = new Date(today);
  while (true) {
    const dateKey = getLocalDateKey(currentDate);
    if (sessionsByDate[dateKey] && sessionsByDate[dateKey].completed.length > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // Calculate Daily Focus Score for today
  let focusScore = 0;
  const todayData = sessionsByDate[todayKey];
  if (todayData) {
    const completedToday = todayData.completed.length;
    const interruptedToday = todayData.interrupted.length;
    const totalToday = completedToday + interruptedToday;
    
    if (totalToday > 0) {
      focusScore = Math.round((completedToday / totalToday) * 100);
    }
  }
  
  // Calculate badges (using all completed sessions)
  const badgeSet = new Set();
  const allCompletedSessions = analyticsData.filter(session => 
    session.status === 'completed' || session.completedAt
  );
  
  // Early Bird badge - session completed before 9 AM
  const earlyBirdSessions = allCompletedSessions.filter(session => {
    const sessionTime = session.timestamp ? new Date(session.timestamp) : new Date(session.completedAt);
    return sessionTime.getHours() < 9;
  });
  if (earlyBirdSessions.length > 0) {
    badgeSet.add('Early Bird');
  }
  
  // 5-A-Day badge - at least 5 completed sessions on any single day
  const maxCompletedInDay = Math.max(...Object.values(sessionsByDate).map(day => day.completed.length));
  if (maxCompletedInDay >= 5) {
    badgeSet.add('5-A-Day');
  }
  
  // Marathon Worker badge - 10 completed sessions in a day
  if (maxCompletedInDay >= 10) {
    badgeSet.add('Marathon Worker');
  }
  
  // Consistency King badge - 7 day streak
  if (streak >= 7) {
    badgeSet.add('Consistency King');
  }
  
  // Focus Master badge - 30 total completed sessions
  if (allCompletedSessions.length >= 30) {
    badgeSet.add('Focus Master');
  }
  
  badges = Array.from(badgeSet);
  
  // Generate heatmap data (using completed sessions only)
  const heatmapData = {};
  Object.keys(sessionsByDate).forEach(date => {
    heatmapData[date] = sessionsByDate[date].completed.length;
  });
  
  // Smart Recommendations - Find Power Hour
  const hourCounts = {};
  let totalCompletedSessions = 0;
  
  // Loop through all completed sessions to find most productive hour
  allCompletedSessions.forEach(session => {
    const sessionTime = session.timestamp ? new Date(session.timestamp) : new Date(session.completedAt);
    const hour = sessionTime.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    totalCompletedSessions++;
  });
  
  // Generate recommendation based on data
  let recommendation = "Keep completing sessions to unlock smart recommendations.";
  
  if (totalCompletedSessions >= 5) {
    // Find the hour with the highest count
    let powerHour = 0;
    let maxCount = 0;
    
    Object.keys(hourCounts).forEach(hour => {
      if (hourCounts[hour] > maxCount) {
        maxCount = hourCounts[hour];
        powerHour = parseInt(hour);
      }
    });
    
    // Format hour to AM/PM
    const formatHour = (hour) => {
      if (hour === 0) return "12:00 AM";
      if (hour === 12) return "12:00 PM";
      if (hour < 12) return `${hour}:00 AM`;
      return `${hour - 12}:00 PM`;
    };
    
    recommendation = `Your power hour is around ${formatHour(powerHour)}. Try to schedule important tasks then!`;
  }
  
  return { streak, badges, heatmapData, focusScore, recommendation };
}

// IPC Listeners for Website Blocker
ipcMain.on('activate-blocker', () => {
  try {
    console.log('Activating website blocker...');
    console.log('--- Blocking the following sites: ---');
    console.log(websitesToBlock);
    console.log('------------------------------------');
    
    // Read the current hosts file
    let hostsContent = fs.readFileSync(hostsPath, 'utf8');
    
    // Check if our blocked sites are already in the hosts file
    const sitesToAdd = websitesToBlock.filter(site => 
      !hostsContent.includes(`${redirectIp} ${site}`)
    );
    
    if (sitesToAdd.length > 0) {
      // Add a comment to identify our blocked sites
      hostsContent += '\n# FocusFlow - Blocked websites\n';
      
      // Add each website to the hosts file
      sitesToAdd.forEach(website => {
        hostsContent += `${redirectIp} ${website}\n`;
      });
      
      // Write the updated content back to the hosts file
      fs.writeFileSync(hostsPath, hostsContent);
      console.log('Website blocker activated successfully');
    } else {
      console.log('Website blocker already active');
    }
  } catch (error) {
    console.error('Error activating website blocker:', error.message);
    console.error('Note: You may need to run this application as administrator to modify the hosts file');
  }
});

ipcMain.on('deactivate-blocker', () => {
  console.log('Deactivating website blocker with robust cleanup...');
  try {
    const hostsContent = fs.readFileSync(hostsPath, 'utf-8');
    const lines = hostsContent.split('\n');

    // Filter out ANY line added by our app. This is much safer.
    const cleanedLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('# FocusFlow')) {
        return false; // Remove our comment markers
      }
      if (trimmedLine.startsWith(redirectIp)) {
        // Check if the line contains any of the sites we could have blocked
        const isOurRule = websitesToBlock.some(site => trimmedLine.includes(site));
        return !isOurRule; // Remove the line if it's one of our rules
      }
      return true; // Keep all other lines
    });

    const newHostsContent = cleanedLines.join('\n');
    
    fs.writeFileSync(hostsPath, newHostsContent);
    console.log('Website blocker deactivated successfully. Hosts file cleaned.');

  } catch (error) {
    console.error('CRITICAL ERROR deactivating website blocker:', error);
  }
});

// IPC Listeners for Settings Management
ipcMain.handle('get-settings', () => {
  return {
    blocklist: websitesToBlock,
    timers: timerDurations
  };
});

// IPC Listener for native OS notification
ipcMain.on('timer-finished', (event, notificationData) => {
  // --- Create and show the NATIVE desktop notification ---
  // This will appear as a slide-in banner in the corner of the screen.
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: "Time for a break!",
      body: "Well done on completing a focus session. Step away from the screen and relax.",
      icon: path.join(__dirname, '../assets/icons/icon.png'), // Using the app's main icon
      silent: true // The app is already playing a sound, so the notification itself is silent.
    });

    // Show the notification. This is the key part.
    notification.show();

    // We can also make it so clicking the notification brings the app to the front.
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
      }
    });
  }

  // --- Flash the taskbar icon (this logic is still good) ---
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
});

ipcMain.on('save-settings', (event, newSettings) => {
  // Update the in-memory blocklist and timer durations
  websitesToBlock = newSettings.blocklist || [];
  timerDurations = newSettings.timers || { work: 25, short: 5, long: 15 };
  
  try {
    // Save complete settings to file
    const settings = {
      blocklist: websitesToBlock,
      timers: timerDurations
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    // Broadcast settings update to main window
    mainWindow.webContents.send('settings-updated', settings);
    
    console.log('Settings saved successfully');
    console.log('New blocklist:', websitesToBlock);
    console.log('New timer durations:', timerDurations);
  } catch (error) {
    console.error('Error saving settings:', error.message);
  }
});

// IPC Listeners for Analytics
ipcMain.on('pomodoro-completed', () => {
  try {
    let analyticsData = [];
    
    // Read existing analytics.json file
    if (fs.existsSync(analyticsPath)) {
      const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
      analyticsData = JSON.parse(analyticsContent);
    }
    
    // Add new timestamp for completed session
    analyticsData.push({ 
      timestamp: new Date().toISOString(), 
      status: 'completed' 
    });
    
    // Write updated array back to analytics.json file
    fs.writeFileSync(analyticsPath, JSON.stringify(analyticsData, null, 2));
    
    // Broadcast analytics update to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents) {
        window.webContents.send('analytics-updated');
      }
    });
    
    console.log('Pomodoro session completed and logged');
  } catch (error) {
    console.error('Error saving analytics data:', error.message);
  }
});

ipcMain.on('pomodoro-interrupted', () => {
  try {
    let analyticsData = [];
    
    // Read existing analytics.json file
    if (fs.existsSync(analyticsPath)) {
      const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
      analyticsData = JSON.parse(analyticsContent);
    }
    
    // Add new timestamp for interrupted session
    analyticsData.push({ 
      timestamp: new Date().toISOString(), 
      status: 'interrupted' 
    });
    
    // Write updated array back to analytics.json file
    fs.writeFileSync(analyticsPath, JSON.stringify(analyticsData, null, 2));
    
    // Broadcast analytics update to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents) {
        window.webContents.send('analytics-updated');
      }
    });
    
    console.log('Pomodoro session interrupted and logged');
  } catch (error) {
    console.error('Error saving interrupted session data:', error.message);
  }
});

ipcMain.handle('get-analytics-data', () => {
  try {
    // This part is the existing code that works for existing users
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    const analyticsData = JSON.parse(analyticsContent);
    
    // Calculate stats
    const stats = calculateStats(analyticsData);
    
    return {
      sessions: analyticsData,
      stats: stats
    };
  } catch (error) {
    // --- THIS IS THE NEW "NEW USER" LOGIC ---
    // This block runs if the file doesn't exist or is corrupt.
    console.log('Analytics file not found. Returning default new user data.');

    // Instead of returning an error, we return a perfect, empty state object.
    return {
      sessions: [],
      stats: {
        streak: 0,
        badges: [],
        heatmapData: {},
        focusScore: 0,
        recommendation: "Keep completing sessions to unlock smart recommendations."
      }
    };
  }
});

// IPC Listener for Settings Window
ipcMain.on('open-settings-window', () => {
  // Create the settings window
  const settingsWindow = new BrowserWindow({
    width: 500,
    height: 800,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    resizable: false,
    minimizable: false,
    maximizable: false
  });

  // Remove the menu bar
  settingsWindow.setMenu(null);

  // Load the settings.html file
  console.log('Loading settings window file:', path.join(__dirname, '..', 'src', 'settings.html'));
  settingsWindow.loadFile('src/settings.html');
});

// IPC Listener for Analytics Window
ipcMain.on('open-analytics-window', () => {
  // Create the analytics window
  const analyticsWindow = new BrowserWindow({
    width: 650,
    height: 1050,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    resizable: false,
    minimizable: false,
    maximizable: false
  });

  // Remove the menu bar
  analyticsWindow.setMenu(null);

  // Load the analytics.html file
  console.log('Loading analytics window file:', path.join(__dirname, '..', 'src', 'analytics.html'));
  analyticsWindow.loadFile('src/analytics.html');
});

// IPC Listener for Help Window
ipcMain.on('open-help-window', () => {
  // Create the help window
  const helpWindow = new BrowserWindow({
    width: 950,
    height: 750,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    resizable: true,
    minimizable: true,
    maximizable: true
  });

  // Remove the menu bar
  helpWindow.setMenu(null);

  // Load the manual.html file
  console.log('Loading help window file:', path.join(__dirname, '..', 'src', 'manual.html'));
  helpWindow.loadFile('src/manual.html');
});

// IPC Listener for Mini Mode
ipcMain.on('toggle-mini-mode', (event, isEnteringMiniMode) => {
    if (mainWindow) {
        if (isEnteringMiniMode) {
            mainWindow.setAlwaysOnTop(true);
            mainWindow.setSize(250, 150, true);
            // mainWindow.setResizable(false); // Allow resizing in mini mode
        } else {
            mainWindow.setAlwaysOnTop(false);
            mainWindow.setSize(1200, 800, true);
            mainWindow.setResizable(true);
        }
    }
});

// Critical Safety Cleanup - Restore hosts file when app closes
app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();

  console.log('Application is quitting - ensuring hosts file is cleaned up...');
  // Directly call the cleanup logic here to guarantee it runs.
  try {
    const hostsContent = fs.readFileSync(hostsPath, 'utf-8');
    const lines = hostsContent.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('# FocusFlow')) return false;
      if (trimmedLine.startsWith(redirectIp)) {
        const isOurRule = websitesToBlock.some(site => trimmedLine.includes(site));
        return !isOurRule;
      }
      return true;
    });
    fs.writeFileSync(hostsPath, cleanedLines.join('\n'));
    console.log('Hosts file cleanup on quit completed successfully.');
  } catch (error) {
    console.error('Error during cleanup on quit:', error);
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  console.log('USER DATA PATH:', app.getPath('userData'));
  console.log('CURRENT WORKING DIRECTORY:', process.cwd());
  console.log('__dirname:', __dirname);
  loadSettings();
  createWindow();

  // Register global shortcuts
  globalShortcut.register('Ctrl+Alt+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-triggered', 'start');
    }
  });

  globalShortcut.register('Ctrl+Alt+P', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-triggered', 'pause');
    }
  });

  globalShortcut.register('Ctrl+Alt+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-triggered', 'reset');
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
