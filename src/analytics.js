// Analytics Dashboard Logic

// Get DOM Elements
const streakCountElement = document.getElementById('streak-count');
const focusScoreElement = document.getElementById('focus-score');
const badgesContainer = document.getElementById('badges-container');
const heatmapContainer = document.getElementById('heatmap-container');
const recommendationElement = document.getElementById('recommendation-text');

// Function to render productivity heatmap
function renderHeatmap(heatmapData) {
    // Clear existing heatmap
    heatmapContainer.innerHTML = '';
    
    // Generate last 35 days (5 weeks)
    const today = new Date();
    const daysToShow = 35;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        
        // Get date key in local YYYY-MM-DD format
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        // Get session count for this date
        const sessionCount = heatmapData[dateKey] || 0;
        
        // Create day element
        const dayElement = document.createElement('div');
        dayElement.className = 'heatmap-day';
        
        // Determine productivity level and apply appropriate class
        let productivityClass = 'productivity-none';
        if (sessionCount === 1 || sessionCount === 2) {
            productivityClass = 'productivity-low';
        } else if (sessionCount === 3 || sessionCount === 4) {
            productivityClass = 'productivity-medium';
        } else if (sessionCount === 5 || sessionCount === 6) {
            productivityClass = 'productivity-high';
        } else if (sessionCount >= 7) {
            productivityClass = 'productivity-very-high';
        }
        
        dayElement.classList.add(productivityClass);
        
        // Add tooltip with date and session count
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        dayElement.title = `${formattedDate}: ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
        
        // Add day number for current month
        if (date.getMonth() === today.getMonth()) {
            dayElement.textContent = date.getDate();
        }
        
        heatmapContainer.appendChild(dayElement);
    }
}

// Load Analytics Data on Page Load
async function loadAnalyticsData() {
    try {
        const analyticsResponse = await window.electronAPI.invoke('get-analytics-data');
        const stats = analyticsResponse.stats;
        
        // Update streak count
        streakCountElement.textContent = stats.streak;
        
        // Update daily focus score with dynamic coloring
        const focusScore = stats.focusScore || 0;
        focusScoreElement.textContent = focusScore;
        
        // Apply dynamic color classes based on score
        focusScoreElement.className = ''; // Reset classes
        if (focusScore >= 90) {
            focusScoreElement.classList.add('focus-score-excellent');
        } else if (focusScore >= 70) {
            focusScoreElement.classList.add('focus-score-good');
        } else if (focusScore >= 50) {
            focusScoreElement.classList.add('focus-score-average');
        } else if (focusScore > 0) {
            focusScoreElement.classList.add('focus-score-poor');
        }
        
        // Clear existing badges
        badgesContainer.innerHTML = '';
        
        // Display badges
        if (stats.badges.length === 0) {
            badgesContainer.innerHTML = '<p class="no-badges">No achievements yet. Keep focusing!</p>';
        } else {
            stats.badges.forEach(badge => {
                const badgeElement = document.createElement('div');
                badgeElement.className = 'badge';
                badgeElement.textContent = badge;
                badgesContainer.appendChild(badgeElement);
            });
        }
        
        // Render productivity heatmap
        renderHeatmap(stats.heatmapData);
        
        // Update smart recommendation
        recommendationElement.textContent = stats.recommendation || "Keep completing sessions to unlock smart recommendations.";
        
        console.log('Analytics data loaded:', stats);
    } catch (error) {
        console.error('Error loading analytics data:', error);
        streakCountElement.textContent = '0';
        badgesContainer.innerHTML = '<p class="error">Error loading achievements</p>';
        heatmapContainer.innerHTML = '<p class="error">Error loading heatmap</p>';
        recommendationElement.textContent = 'Unable to load recommendations at this time.';
    }
}

// Load analytics data when the page loads
document.addEventListener('DOMContentLoaded', loadAnalyticsData);

// Listen for real-time analytics updates
window.electronAPI.on('analytics-updated', () => {
    console.log('Analytics updated - refreshing data...');
    loadAnalyticsData();
});
