// Settings page functionality

// Get DOM Elements
const blocklistTextarea = document.getElementById('blocklist-textarea');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const workDurationInput = document.getElementById('work-duration-input');
const shortBreakDurationInput = document.getElementById('short-break-duration-input');
const longBreakDurationInput = document.getElementById('long-break-duration-input');

// Load Settings on Page Load
async function loadSettings() {
    try {
        const currentSettings = await window.electronAPI.invoke('get-settings');
        
        // Populate blocklist textarea
        blocklistTextarea.value = currentSettings.blocklist.join('\n');
        
        // Populate timer duration inputs
        workDurationInput.value = currentSettings.timers.work;
        shortBreakDurationInput.value = currentSettings.timers.short;
        longBreakDurationInput.value = currentSettings.timers.long;
        
        console.log('Settings loaded into UI');
    } catch (error) {
        console.error('Error loading settings:', error);
        // Set default values if loading fails
        blocklistTextarea.value = 'youtube.com\nfacebook.com\ntwitter.com\ninstagram.com';
        workDurationInput.value = 25;
        shortBreakDurationInput.value = 5;
        longBreakDurationInput.value = 15;
    }
}

// Save Settings Function
function saveSettings() {
    try {
        // Get the textarea content
        const textareaContent = blocklistTextarea.value;
        
        // Split into lines and clean up
        const lines = textareaContent.split('\n');
        const cleanedBlocklist = lines
            .map(line => line.trim()) // Remove whitespace
            .filter(line => line.length > 0) // Remove empty lines
            .filter(line => !line.startsWith('#')); // Remove comment lines
        
        // Get timer duration values
        const timerDurations = {
            work: parseInt(workDurationInput.value) || 25,
            short: parseInt(shortBreakDurationInput.value) || 5,
            long: parseInt(longBreakDurationInput.value) || 15
        };
        
        // Construct complete settings object
        const completeSettings = {
            blocklist: cleanedBlocklist,
            timers: timerDurations
        };
        
        // Send the complete settings object to the main process
        window.electronAPI.send('save-settings', completeSettings);
        
        console.log('Settings saved:', completeSettings);
        
        // Provide visual feedback
        saveSettingsBtn.textContent = 'Saved!';
        saveSettingsBtn.style.backgroundColor = '#4CAF50';
        
        // Reset button text after 2 seconds
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Save Settings';
            saveSettingsBtn.style.backgroundColor = '';
        }, 2000);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        
        // Show error feedback
        saveSettingsBtn.textContent = 'Error!';
        saveSettingsBtn.style.backgroundColor = '#f44336';
        
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Save Settings';
            saveSettingsBtn.style.backgroundColor = '';
        }, 2000);
    }
}

// Event Listeners
saveSettingsBtn.addEventListener('click', saveSettings);

// Load settings when the page loads
document.addEventListener('DOMContentLoaded', loadSettings);
