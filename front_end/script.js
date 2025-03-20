
        // Sample data for demonstration
        const sampleData = {
            teams: [
                { id: 1, name: 'Les Aigles', coach: 'Jean Dupont', players: ['Marc', 'Thomas', 'Antoine', 'Pierre', 'Hugo'] },
                { id: 2, name: 'FC Victory', coach: 'Sophie Martin', players: ['Lucas', 'Léo', 'Nathan', 'Mathis', 'Noah'] },
                { id: 3, name: 'Dynamo', coach: 'Michel Bernard', players: ['Raphaël', 'Louis', 'Gabriel', 'Jules', 'Ethan'] },
                { id: 4, name: 'Real Stars', coach: 'Émilie Petit', players: ['Arthur', 'Adam', 'Alexandre', 'Victor', 'Maxime'] }
            ],
            matches: [
                { id: 1, date: '2025-03-25', time: '14:00', teamA: 1, teamB: 2, venue: 'Gymnase Central' },
                { id: 2, date: '2025-03-25', time: '16:00', teamA: 3, teamB: 4, venue: 'Gymnase Central' },
                { id: 3, date: '2025-03-27', time: '15:00', teamA: 1, teamB: 3, venue: 'Complexe Sportif' },
                { id: 4, date: '2025-03-27', time: '17:00', teamA: 2, teamB: 4, venue: 'Complexe Sportif' }
            ],
            results: [
                { id: 1, date: '2025-03-20', teamA: 1, teamB: 4, scoreA: 3, scoreB: 2, details: 'Match serré jusqu\'à la fin' },
                { id: 2, date: '2025-03-20', teamA: 2, teamB: 3, scoreA: 1, scoreB: 4, details: 'Dynamo dominant dès le début' }
            ],
            standings: [
                { id: 3, teamId: 3, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, points: 3 },
                { id: 1, teamId: 1, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 2, points: 3 },
                { id: 4, teamId: 4, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 2, goalsAgainst: 3, points: 0 },
                { id: 2, teamId: 2, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 4, points: 0 }
            ]
        };

        let isAdmin = false;
        let currentPage = 'dashboard';
        let liveMatchActive = false;
        let liveMatchTimer = null;
        let liveMatchSeconds = 0;

        // DOM elements
        const sidebar = document.getElementById('sidebar');
        const menuItems = document.querySelectorAll('.menu-item');
        const pages = document.querySelectorAll('.page');
        const pageTitle = document.getElementById('page-title');
        const userDashboard = document.getElementById('user-dashboard');
        const adminElements = document.querySelectorAll('.admin-only');
        const toggleAdminBtn = document.getElementById('toggle-admin');
        const userRoleDisplay = document.getElementById('user-role');

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
    
    // Add event listeners
    addEventListeners();
    
    // Load initial data
    loadData();
});

// Initialize the application
function initializeApp() {
    // Load user preferences if available
    loadUserPreferences();
    
    // Set up the dashboard widgets
    setupDashboardWidgets();
}

// Load user preferences from localStorage
function loadUserPreferences() {
    const savedColor = localStorage.getItem('themeColor');
    if (savedColor) {
        document.documentElement.style.setProperty('--primary-color', savedColor);
        
        // Update color option selection
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('active');
            if (option.dataset.color === savedColor) {
                option.classList.add('active');
            }
        });
    }
    
    // Load widget preferences
    const savedWidgets = localStorage.getItem('dashboardWidgets');
    if (savedWidgets) {
        const widgetPreferences = JSON.parse(savedWidgets);
        document.querySelectorAll('.widget-option input').forEach(checkbox => {
            checkbox.checked = widgetPreferences.includes(checkbox.value);
        });
    }
}

// Set up dashboard widgets based on user preferences
function setupDashboardWidgets() {
    userDashboard.innerHTML = '';
    
    // Get selected widgets
    const selectedWidgets = [];
    document.querySelectorAll('.widget-option input:checked').forEach(checkbox => {
        selectedWidgets.push(checkbox.value);
    });
    
    // If no widgets are selected, select all by default
    if (selectedWidgets.length === 0) {
        document.querySelectorAll('.widget-option input').forEach(checkbox => {
            checkbox.checked = true;
            selectedWidgets.push(checkbox.value);
        });
    }
    
    // Create widgets based on selection
    if (selectedWidgets.includes('upcoming-matches')) {
        createUpcomingMatchesWidget();
    }
    
    if (selectedWidgets.includes('recent-results')) {
        createRecentResultsWidget();
    }
    
    if (selectedWidgets.includes('top-teams')) {
        createTopTeamsWidget();
    }
    
    if (selectedWidgets.includes('live-updates')) {
        createLiveUpdatesWidget();
    }
}

// Create upcoming matches widget
function createUpcomingMatchesWidget() {
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-calendar-alt"></i> Prochains Matchs</h3>
        </div>
        <div class="widget-content">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Heure</th>
                        <th>Match</th>
                        <th>Lieu</th>
                    </tr>
                </thead>
                <tbody id="upcoming-matches-list">
                </tbody>
            </table>
        </div>
    `;
    userDashboard.appendChild(widget);
    
    // Populate upcoming matches
    const upcomingMatchesList = document.getElementById('upcoming-matches-list');
    const today = new Date();
    const upcomingMatches = sampleData.matches.filter(match => {
        const matchDate = new Date(match.date);
        return matchDate >= today;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
    
    upcomingMatches.forEach(match => {
        const teamA = sampleData.teams.find(team => team.id === match.teamA);
        const teamB = sampleData.teams.find(team => team.id === match.teamB);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td>${match.time}</td>
            <td>${teamA.name} vs ${teamB.name}</td>
            <td>${match.venue}</td>
        `;
        upcomingMatchesList.appendChild(row);
    });
}

// Create recent results widget
function createRecentResultsWidget() {
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-trophy"></i> Derniers Résultats</h3>
        </div>
        <div class="widget-content">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Match</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody id="recent-results-list">
                </tbody>
            </table>
        </div>
    `;
    userDashboard.appendChild(widget);
    
    // Populate recent results
    const recentResultsList = document.getElementById('recent-results-list');
    
    sampleData.results.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).forEach(result => {
        const teamA = sampleData.teams.find(team => team.id === result.teamA);
        const teamB = sampleData.teams.find(team => team.id === result.teamB);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(result.date)}</td>
            <td>${teamA.name} vs ${teamB.name}</td>
            <td>${result.scoreA} - ${result.scoreB}</td>
        `;
        recentResultsList.appendChild(row);
    });
}

// Create top teams widget
function createTopTeamsWidget() {
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-medal"></i> Meilleures Équipes</h3>
        </div>
        <div class="widget-content">
            <table>
                <thead>
                    <tr>
                        <th>Position</th>
                        <th>Équipe</th>
                        <th>J</th>
                        <th>Pts</th>
                    </tr>
                </thead>
                <tbody id="top-teams-list">
                </tbody>
            </table>
        </div>
    `;
    userDashboard.appendChild(widget);
    
    // Populate top teams
    const topTeamsList = document.getElementById('top-teams-list');
    
    sampleData.standings.sort((a, b) => b.points - a.points).slice(0, 3).forEach((standing, index) => {
        const team = sampleData.teams.find(team => team.id === standing.teamId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${team.name}</td>
            <td>${standing.played}</td>
            <td>${standing.points}</td>
        `;
        topTeamsList.appendChild(row);
    });
}

// Create live updates widget
function createLiveUpdatesWidget() {
    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.innerHTML = `
        <div class="widget-header">
            <h3 class="widget-title"><i class="fas fa-broadcast-tower"></i> Match en Direct</h3>
        </div>
        <div class="widget-content">
            <div id="dashboard-live-status">
                <div class="text-center mb-20">
                    Aucun match en direct pour le moment
                </div>
            </div>
        </div>
    `;
    userDashboard.appendChild(widget);
}

// Add event listeners
function addEventListeners() {
    // Menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            changePage(pageId);
        });
    });
    
    // Toggle admin mode
    toggleAdminBtn.addEventListener('click', function() {
        isAdmin = !isAdmin;
        updateAdminMode();
    });
    
    // Color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            const color = this.getAttribute('data-color');
            document.documentElement.style.setProperty('--primary-color', color);
        });
    });
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', saveUserPreferences);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Window click to close modals
    window.addEventListener('click', function(e) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Add match button
    document.getElementById('add-match').addEventListener('click', function() {
        const modal = document.getElementById('add-match-modal');
        
        // Populate team dropdowns
        const teamASelect = document.getElementById('team-a');
        const teamBSelect = document.getElementById('team-b');
        teamASelect.innerHTML = '';
        teamBSelect.innerHTML = '';
        
        sampleData.teams.forEach(team => {
            teamASelect.innerHTML += `<option value="${team.id}">${team.name}</option>`;
            teamBSelect.innerHTML += `<option value="${team.id}">${team.name}</option>`;
        });
        
        modal.style.display = 'block';
    });
    
    // Add team button
    document.getElementById('add-team').addEventListener('click', function() {
        const modal = document.getElementById('add-team-modal');
        modal.style.display = 'block';
    });
    
    // Select live match button
    document.getElementById('select-live-match').addEventListener('click', function() {
        const modal = document.getElementById('select-live-match-modal');
        const liveMatchSelect = document.getElementById('live-match-select');
        liveMatchSelect.innerHTML = '';
        
        sampleData.matches.forEach(match => {
            const teamA = sampleData.teams.find(team => team.id === match.teamA);
            const teamB = sampleData.teams.find(team => team.id === match.teamB);
            liveMatchSelect.innerHTML += `<option value="${match.id}">${teamA.name} vs ${teamB.name} (${formatDate(match.date)} ${match.time})</option>`;
        });
        
        modal.style.display = 'block';
    });
    
    // Form submissions
    document.getElementById('add-match-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addMatch();
    });
    
    document.getElementById('add-team-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addTeam();
    });
    
    document.getElementById('select-live-match-form').addEventListener('submit', function(e) {
        e.preventDefault();
        startLiveMatch();
    });
    
    // Add event button in live match
    document.getElementById('add-event').addEventListener('click', function() {
        addLiveEvent();
    });
}

// Change page
function changePage(pageId) {
    currentPage = pageId;
    
    // Update menu items
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    
    // Update page display
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });
    
    // Update page title
    const activeMenuItem = document.querySelector(`.menu-item[data-page="${pageId}"]`);
    pageTitle.textContent = activeMenuItem.querySelector('span').textContent;
}

// Update admin mode
function updateAdminMode() {
    if (isAdmin) {
        adminElements.forEach(el => el.style.display = 'block');
        toggleAdminBtn.textContent = 'Mode Utilisateur';
        userRoleDisplay.textContent = 'Administrateur';
    } else {
        adminElements.forEach(el => el.style.display = 'none');
        toggleAdminBtn.textContent = 'Mode Admin';
        userRoleDisplay.textContent = 'Utilisateur';
    }
}

// Save user preferences
function saveUserPreferences() {
    // Save color preference
    const activeColor = document.querySelector('.color-option.active').dataset.color;
    localStorage.setItem('themeColor', activeColor);
    
    // Save widget preferences
    const selectedWidgets = [];
    document.querySelectorAll('.widget-option input:checked').forEach(checkbox => {
        selectedWidgets.push(checkbox.value);
    });
    localStorage.setItem('dashboardWidgets', JSON.stringify(selectedWidgets));
    
    // Update dashboard
    setupDashboardWidgets();
    
    // Show confirmation
    alert('Préférences enregistrées avec succès !');
}

// Load data
function loadData() {
    // Load teams
    loadTeams();
    
    // Load matches
    loadMatches();
    
    // Load results
    loadResults();
    
    // Load standings
    loadStandings();
}

// Load teams
function loadTeams() {
    const teamsTable = document.getElementById('teams-table');
    teamsTable.innerHTML = '';
    
    sampleData.teams.forEach(team => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${team.name}</td>
            <td>${team.coach}</td>
            <td>${team.players.length}</td>
            <td class="admin-only" style="display: none;">
                <button class="btn btn-secondary btn-sm edit-team" data-id="${team.id}">Modifier</button>
                <button class="btn btn-secondary btn-sm delete-team" data-id="${team.id}">Supprimer</button>
            </td>
        `;
        teamsTable.appendChild(row);
    });
}

// Load matches
function loadMatches() {
    const matchesTable = document.getElementById('matches-table');
    matchesTable.innerHTML = '';
    
    sampleData.matches.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(match => {
        const teamA = sampleData.teams.find(team => team.id === match.teamA);
        const teamB = sampleData.teams.find(team => team.id === match.teamB);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td>${match.time}</td>
            <td>${teamA.name}</td>
            <td>${teamB.name}</td>
            <td>${match.venue}</td>
            <td class="admin-only" style="display: none;">
                <button class="btn btn-secondary btn-sm edit-match" data-id="${match.id}">Modifier</button>
                <button class="btn btn-secondary btn-sm delete-match" data-id="${match.id}">Supprimer</button>
            </td>
        `;
        matchesTable.appendChild(row);
    });
}

// Load results
function loadResults() {
    const resultsTable = document.getElementById('results-table');
    resultsTable.innerHTML = '';
    
    sampleData.results.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(result => {
        const teamA = sampleData.teams.find(team => team.id === result.teamA);
        const teamB = sampleData.teams.find(team => team.id === result.teamB);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(result.date)}</td>
            <td>${teamA.name}</td>
            <td>${result.scoreA} - ${result.scoreB}</td>
            <td>${teamB.name}</td>
            <td>
                <button class="btn btn-secondary btn-sm view-details" data-id="${result.id}">Détails</button>
            </td>
        `;
        resultsTable.appendChild(row);
    });
}

// Load standings
function loadStandings() {
    const standingsTable = document.getElementById('standings-table');
    standingsTable.innerHTML = '';
    
    sampleData.standings.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)).forEach((standing, index) => {
        const team = sampleData.teams.find(team => team.id === standing.teamId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${team.name}</td>
            <td>${standing.played}</td>
            <td>${standing.won}</td>
            <td>${standing.drawn}</td>
            <td>${standing.lost}</td>
            <td>${standing.goalsFor}</td>
            <td>${standing.goalsAgainst}</td>
            <td>${standing.goalsFor - standing.goalsAgainst}</td>
            <td>${standing.points}</td>
        `;
        standingsTable.appendChild(row);
    });
}

// Add match
function addMatch() {
    const date = document.getElementById('match-date').value;
    const time = document.getElementById('match-time-input').value;
    const teamA = parseInt(document.getElementById('team-a').value);
    const teamB = parseInt(document.getElementById('team-b').value);
    const venue = document.getElementById('match-venue').value;
    
    if (teamA === teamB) {
        alert('Les deux équipes ne peuvent pas être identiques');
        return;
    }
    
    const newMatch = {
        id: sampleData.matches.length + 1,
        date,
        time,
        teamA,
        teamB,
        venue
    };
    
    sampleData.matches.push(newMatch);
    loadMatches();
    
    // Close modal
    document.getElementById('add-match-modal').style.display = 'none';
    
    // Reset form
    document.getElementById('add-match-form').reset();
}

// Add team
function addTeam() {
    const name = document.getElementById('team-name').value;
    const coach = document.getElementById('team-coach').value;
    const playersText = document.getElementById('team-players').value;
    const players = playersText.split('\n').filter(player => player.trim() !== '');
    
    const newTeam = {
        id: sampleData.teams.length + 1,
        name,
        coach,
        players
    };
    
    sampleData.teams.push(newTeam);
    loadTeams();
    
    // Add to standings
    const newStanding = {
        id: sampleData.standings.length + 1,
        teamId: newTeam.id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
    };
    
    sampleData.standings.push(newStanding);
    loadStandings();
    
    // Close modal
    document.getElementById('add-team-modal').style.display = 'none';
    
    // Reset form
    document.getElementById('add-team-form').reset();
}

// Start live match
function startLiveMatch() {
    const matchId = parseInt(document.getElementById('live-match-select').value);
    const match = sampleData.matches.find(m => m.id === matchId);
    
    if (!match) {
        alert('Match non trouvé');
        return;
    }
    
    const teamA = sampleData.teams.find(team => team.id === match.teamA);
    const teamB = sampleData.teams.find(team => team.id === match.teamB);
    
    // Update live match display
    document.getElementById('no-live-message').style.display = 'none';
    document.getElementById('live-match-details').classList.remove('hidden');
    
    document.getElementById('team-a-name').textContent = teamA.name;
    document.getElementById('team-b-name').textContent = teamB.name;
    document.getElementById('team-a-score').textContent = '0';
    document.getElementById('team-b-score').textContent = '0';
    document.getElementById('match-time').textContent = '00:00';
    document.getElementById('match-events').innerHTML = '';
    
    // Start timer
    liveMatchActive = true;
    liveMatchSeconds = 0;
    if (liveMatchTimer) {
        clearInterval(liveMatchTimer);
    }
    
    liveMatchTimer = setInterval(updateMatchTime, 1000);
    
    // Close modal
    document.getElementById('select-live-match-modal').style.display = 'none';
    
    // Add initial event
    addMatchEvent('Coup d\'envoi', 'system');
}

// Update match time
function updateMatchTime() {
    if (!liveMatchActive) return;
    
    liveMatchSeconds++;
    const minutes = Math.floor(liveMatchSeconds / 60);
    const seconds = liveMatchSeconds % 60;
    
    document.getElementById('match-time').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Add live event
function addLiveEvent() {
    const eventType = document.getElementById('event-type').value;
    const eventTeam = document.getElementById('event-team').value;
    const eventDetails = document.getElementById('event-details').value;
    
    const teamName = eventTeam === 'team-a' ? 
        document.getElementById('team-a-name').textContent : 
        document.getElementById('team-b-name').textContent;
    
    let eventText = '';
    
    switch (eventType) {
        case 'goal':
            eventText = `BUT ! ${teamName} - ${eventDetails}`;
            // Update score
            const scoreElem = document.getElementById(`${eventTeam}-score`);
            scoreElem.textContent = (parseInt(scoreElem.textContent) + 1).toString();
            break;
        case 'foul':
            eventText = `Faute de ${teamName} - ${eventDetails}`;
            break;
        case 'card':
            eventText = `Carton pour ${teamName} - ${eventDetails}`;
            break;
        case 'substitution':
            eventText = `Remplacement pour ${teamName} - ${eventDetails}`;
            break;
    }
    
    addMatchEvent(eventText, eventType);
    
    // Reset details field
    document.getElementById('event-details').value = '';
}

// Add match event to log
function addMatchEvent(text, type = 'system') {
    const eventsLog = document.getElementById('match-events');
    const eventElement = document.createElement('div');
    eventElement.className = `event ${type}`;
    
    const minutes = Math.floor(liveMatchSeconds / 60);
    const seconds = liveMatchSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    eventElement.innerHTML = `<strong>${timeStr}</strong> - ${text}`;
    eventsLog.prepend(eventElement);
    
    // Also update the dashboard widget if on dashboard page
    if (currentPage === 'dashboard') {
        const dashboardLiveStatus = document.getElementById('dashboard-live-status');
        dashboardLiveStatus.innerHTML = `
            <div class="text-center mb-10">
                <strong>${document.getElementById('team-a-name').textContent} 
                ${document.getElementById('team-a-score').textContent} - 
                ${document.getElementById('team-b-score').textContent} 
                ${document.getElementById('team-b-name').textContent}</strong>
                <p>${timeStr}</p>
            </div>
            <div class="text-center">
                <p>${text}</p>
            </div>
        `;
    }
}

// Format date
function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}