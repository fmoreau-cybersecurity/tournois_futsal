// Simulation d'une base de données utilisateurs (à remplacer par l'API réelle)
let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';
let liveMatchActive = false;
let liveMatchTimer = null;
let liveMatchSeconds = 0;

// Variables pour le stockage des données
let teamsData = [];
let matchesData = [];
let resultsData = [];
let standingsData = [];

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    // Récupération des éléments du DOM
    initializeDOM();
    
    // Initialisation de l'authentification
    initializeAuth();
    
    // Chargement des préférences utilisateur
    loadUserPreferences();
    
    // Configuration du tableau de bord
    setupDashboardWidgets();
    
    // Ajout des écouteurs d'événements
    addEventListeners();
    
    // Chargement des données initiales depuis l'API
    loadDataFromAPI();
});

// Récupération des éléments du DOM
function initializeDOM() {
    // Éléments d'authentification
    window.authOverlay = document.getElementById('auth-overlay');
    window.loginForm = document.getElementById('login-form');
    window.registerForm = document.getElementById('register-form');
    window.loginTab = document.getElementById('login-tab');
    window.registerTab = document.getElementById('register-tab');
    window.logoutBtn = document.getElementById('logout-btn');
    window.userRoleDisplay = document.getElementById('user-role');
    window.mainContent = document.querySelector('.main-content');
    window.sidebar = document.getElementById('sidebar');
    
    // Éléments de navigation
    window.menuItems = document.querySelectorAll('.menu-item');
    window.pages = document.querySelectorAll('.page');
    window.pageTitle = document.getElementById('page-title');
    window.userDashboard = document.getElementById('user-dashboard');
    window.adminElements = document.querySelectorAll('.admin-only');
}

// Initialisation de l'authentification
function initializeAuth() {
    // Vérifier si l'utilisateur est déjà connecté
    checkSavedAuth();
    
    // Configurer les onglets d'authentification
    setupAuthTabs();
    
    // Configurer les formulaires d'authentification
    setupAuthForms();
    
    // Configurer le bouton de déconnexion
    setupLogout();
}

// Vérifier l'authentification sauvegardée
function checkSavedAuth() {
    try {
        const token = localStorage.getItem('authToken');
        const savedUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (token && savedUser) {
            // Restaurer la session
            currentUser = savedUser;
            isAdmin = savedUser.role === 'admin';
            updateAuthUI();
        } else {
            // Aucun utilisateur sauvegardé, afficher l'écran de connexion
            showAuthOverlay();
        }
    } catch (e) {
        // En cas d'erreur, réinitialiser et afficher l'écran de connexion
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        showAuthOverlay();
    }
}

// Configuration des onglets d'authentification
function setupAuthTabs() {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

// Configuration des formulaires d'authentification
function setupAuthForms() {
    // Formulaire de connexion
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch(`${window.location.origin}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de la connexion');
            }
            
            const data = await response.json();
            
            // Connexion réussie
            currentUser = data.user;
            isAdmin = currentUser.role === 'admin';
            
            // Sauvegarder dans localStorage pour persistance
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Mettre à jour l'interface
            updateAuthUI();
            
            // Réinitialiser le formulaire
            loginForm.reset();
            
            // Charger les données
            loadDataFromAPI();
        } catch (error) {
            alert(error.message || 'Email ou mot de passe incorrect');
        }
    });
    
    // Formulaire d'inscription
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nom = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        // Vérification que les mots de passe correspondent
        if (password !== confirm) {
            alert('Les mots de passe ne correspondent pas');
            return;
        }
        
        try {
            const response = await fetch(`${window.location.origin}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nom, email, password }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de l\'inscription');
            }
            
            // Inscription réussie, maintenant on connecte
            const loginResponse = await fetch(`${window.location.origin}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            if (!loginResponse.ok) {
                throw new Error('Inscription réussie, mais erreur lors de la connexion automatique');
            }
            
            const loginData = await loginResponse.json();
            
            // Connexion réussie
            currentUser = loginData.user;
            isAdmin = currentUser.role === 'admin';
            
            // Sauvegarder dans localStorage pour persistance
            localStorage.setItem('authToken', loginData.token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Mettre à jour l'interface
            updateAuthUI();
            
            // Réinitialiser le formulaire
            registerForm.reset();
            
            // Charger les données
            loadDataFromAPI();
        } catch (error) {
            alert(error.message || 'Erreur lors de l\'inscription');
        }
    });
}

// Configuration du bouton de déconnexion
function setupLogout() {
    logoutBtn.addEventListener('click', function() {
        // Réinitialiser l'utilisateur courant
        currentUser = null;
        isAdmin = false;
        
        // Supprimer les données de localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        // Afficher l'écran de connexion
        showAuthOverlay();
        
        // Réinitialiser les formulaires
        loginForm.reset();
        registerForm.reset();
    });
}

// Mise à jour de l'interface après authentification
function updateAuthUI() {
    if (currentUser) {
        // Cacher l'overlay d'authentification
        hideAuthOverlay();
        
        // Mettre à jour l'affichage du rôle
        userRoleDisplay.textContent = isAdmin ? 'Administrateur' : 'Utilisateur';
        
        // Mettre à jour les éléments d'interface basés sur les droits d'admin
        updateAdminMode();
    } else {
        // Afficher l'overlay d'authentification
        showAuthOverlay();
    }
}

// Mise à jour des éléments d'interface basés sur les droits d'admin
function updateAdminMode() {
    if (isAdmin) {
        adminElements.forEach(el => el.style.display = 'block');
        userRoleDisplay.textContent = 'Administrateur';
    } else {
        adminElements.forEach(el => el.style.display = 'none');
        userRoleDisplay.textContent = 'Utilisateur';
    }
}

// Afficher l'overlay d'authentification
function showAuthOverlay() {
    authOverlay.style.display = 'flex';
    
    // Cacher le contenu principal
    if (mainContent) mainContent.style.visibility = 'hidden';
    if (sidebar) sidebar.style.visibility = 'hidden';
}

// Cacher l'overlay d'authentification
function hideAuthOverlay() {
    authOverlay.style.display = 'none';
    
    // Afficher le contenu principal
    if (mainContent) mainContent.style.visibility = 'visible';
    if (sidebar) sidebar.style.visibility = 'visible';
}

// Chargement des données depuis l'API
async function loadDataFromAPI() {
    if (!currentUser) return;
    
    const authToken = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        // Chargement des équipes
        const teamsResponse = await fetch(`${window.location.origin}/equipes`, { headers });
        if (teamsResponse.ok) {
            teamsData = await teamsResponse.json();
        }
        
        // Chargement des matchs
        const matchesResponse = await fetch(`${window.location.origin}/matchs`, { headers });
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
        }
        
        // Chargement des résultats
        const resultsResponse = await fetch(`${window.location.origin}/resultats`, { headers });
        if (resultsResponse.ok) {
            resultsData = await resultsResponse.json();
        }
        
        // Chargement du classement
        const standingsResponse = await fetch(`${window.location.origin}/classement`, { headers });
        if (standingsResponse.ok) {
            standingsData = await standingsResponse.json();
        }
        
        // Mise à jour de l'interface
        loadData();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
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
        
        teamsData.forEach(team => {
            teamASelect.innerHTML += `<option value="${team.id}">${team.nom}</option>`;
            teamBSelect.innerHTML += `<option value="${team.id}">${team.nom}</option>`;
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
        
        matchesData.filter(match => match.statut === 'à venir').forEach(match => {
            liveMatchSelect.innerHTML += `<option value="${match.id}">${match.equipe1_nom} vs ${match.equipe2_nom} (${formatDate(match.date_match)} ${match.heure_match})</option>`;
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
    const upcomingMatches = matchesData
        .filter(match => {
            const matchDate = new Date(match.date_match);
            return matchDate >= today || match.statut === 'à venir';
        })
        .sort((a, b) => new Date(a.date_match) - new Date(b.date_match))
        .slice(0, 3);
    
    upcomingMatches.forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(match.date_match)}</td>
            <td>${match.heure_match}</td>
            <td>${match.equipe1_nom} vs ${match.equipe2_nom}</td>
            <td>${match.lieu}</td>
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
    
    resultsData.sort((a, b) => new Date(b.date_match) - new Date(a.date_match))
              .slice(0, 3)
              .forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(result.date_match)}</td>
            <td>${result.equipe1_nom} vs ${result.equipe2_nom}</td>
            <td>${result.score_equipe1} - ${result.score_equipe2}</td>
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
    
    standingsData.sort((a, b) => b.points - a.points)
               .slice(0, 3)
               .forEach((standing, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${standing.equipe_nom}</td>
            <td>${standing.victoires + standing.nuls + standing.defaites}</td>
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
    
    teamsData.forEach(team => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${team.nom}</td>
            <td>${team.coach || 'Non spécifié'}</td>
            <td>${team.players ? team.players.length : 'N/A'}</td>
            <td class="admin-only" style="display: none;">
                <button class="btn btn-secondary btn-sm edit-team" data-id="${team.id}">Modifier</button>
                <button class="btn btn-secondary btn-sm delete-team" data-id="${team.id}">Supprimer</button>
            </td>
        `;
        teamsTable.appendChild(row);
    });
    
    // Ajouter des écouteurs d'événements pour les boutons de modification et de suppression
    document.querySelectorAll('.edit-team').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            editTeam(teamId);
        });
    });
    
    document.querySelectorAll('.delete-team').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            deleteTeam(teamId);
        });
    });
}

// Load matches
function loadMatches() {
    const matchesTable = document.getElementById('matches-table');
    matchesTable.innerHTML = '';
    
    matchesData.sort((a, b) => new Date(a.date_match) - new Date(b.date_match))
              .forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(match.date_match)}</td>
            <td>${match.heure_match}</td>
            <td>${match.equipe1_nom}</td>
            <td>${match.equipe2_nom}</td>
            <td>${match.lieu || 'Non spécifié'}</td>
            <td class="admin-only" style="display: none;">
                <button class="btn btn-secondary btn-sm edit-match" data-id="${match.id}">Modifier</button>
                <button class="btn btn-secondary btn-sm delete-match" data-id="${match.id}">Supprimer</button>
            </td>
        `;
        matchesTable.appendChild(row);
    });
    
    // Ajouter des écouteurs d'événements pour les boutons de modification et de suppression
    document.querySelectorAll('.edit-match').forEach(button => {
        button.addEventListener('click', function() {
            const matchId = this.getAttribute('data-id');
            editMatch(matchId);
        });
    });
    
    document.querySelectorAll('.delete-match').forEach(button => {
        button.addEventListener('click', function() {
            const matchId = this.getAttribute('data-id');
            deleteMatch(matchId);
        });
    });
}

// Load results
function loadResults() {
    const resultsTable = document.getElementById('results-table');
    resultsTable.innerHTML = '';
    
    resultsData.sort((a, b) => new Date(b.date_match) - new Date(a.date_match))
              .forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(result.date_match)}</td>
            <td>${result.equipe1_nom}</td>
            <td>${result.score_equipe1} - ${result.score_equipe2}</td>
            <td>${result.equipe2_nom}</td>
            <td>
                <button class="btn btn-secondary btn-sm view-details" data-id="${result.id}">Détails</button>
            </td>
        `;
        resultsTable.appendChild(row);
    });
    
    // Ajouter des écouteurs d'événements pour les boutons de détails
    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const resultId = this.getAttribute('data-id');
            viewResultDetails(resultId);
        });
    });
}

// Load standings
function loadStandings() {
    const standingsTable = document.getElementById('standings-table');
    standingsTable.innerHTML = '';
    
    standingsData.sort((a, b) => b.points - a.points || (b.buts_pour - b.buts_contre) - (a.buts_pour - a.buts_contre))
                .forEach((standing, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${standing.equipe_nom}</td>
            <td>${standing.victoires + standing.nuls + standing.defaites}</td>
            <td>${standing.victoires}</td>
            <td>${standing.nuls}</td>
            <td>${standing.defaites}</td>
            <td>${standing.buts_pour}</td>
            <td>${standing.buts_contre}</td>
            <td>${standing.buts_pour - standing.buts_contre}</td>
            <td>${standing.points}</td>
        `;
        standingsTable.appendChild(row);
    });
}

// Add match
async function addMatch() {
    const date = document.getElementById('match-date').value;
    const time = document.getElementById('match-time-input').value;
    const teamA = parseInt(document.getElementById('team-a').value);
    const teamB = parseInt(document.getElementById('team-b').value);
    const venue = document.getElementById('match-venue').value;
    
    if (teamA === teamB) {
        alert('Les deux équipes ne peuvent pas être identiques');
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${window.location.origin}/matchs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                equipe1_id: teamA,
                equipe2_id: teamB,
                date_match: date,
                heure_match: time,
                lieu: venue
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de l\'ajout du match');
        }
        
        // Recharger les données des matchs
        const matchesResponse = await fetch(`${window.location.origin}/matchs`);
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
            loadMatches();
        }
        
        // Fermer le modal
        document.getElementById('add-match-modal').style.display = 'none';
        
        // Réinitialiser le formulaire
        document.getElementById('add-match-form').reset();
        
        alert('Match ajouté avec succès');
    } catch (error) {
        alert(error.message || 'Erreur lors de l\'ajout du match');
    }
}

// Add team
async function addTeam() {
    const name = document.getElementById('team-name').value;
    const coach = document.getElementById('team-coach').value;
    const playersText = document.getElementById('team-players').value;
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${window.location.origin}/equipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                nom: name,
                coach: coach,
                // Note: Cette partie dépend de la manière dont votre API gère l'ajout des joueurs
                // Vous devrez peut-être ajuster cette partie selon votre implémentation côté serveur
                players: playersText.split('\n').filter(player => player.trim() !== '')
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de l\'ajout de l\'équipe');
        }
        
        // Recharger les données des équipes
        const teamsResponse = await fetch(`${window.location.origin}/equipes`);
        if (teamsResponse.ok) {
            teamsData = await teamsResponse.json();
            loadTeams();
        }
        
        // Fermer le modal
        document.getElementById('add-team-modal').style.display = 'none';
        
        // Réinitialiser le formulaire
        document.getElementById('add-team-form').reset();
        
        alert('Équipe ajoutée avec succès');
    } catch (error) {
        alert(error.message || 'Erreur lors de l\'ajout de l\'équipe');
    }
}

// Edit team function
function editTeam(teamId) {
    // Cette fonction peut être implémentée pour ouvrir un modal d'édition d'équipe
    alert('Fonctionnalité d\'édition à venir pour l\'équipe ' + teamId);
}

// Delete team function
async function deleteTeam(teamId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${window.location.origin}/equipes/${teamId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la suppression de l\'équipe');
        }
        
        // Recharger les données des équipes
        const teamsResponse = await fetch(`${window.location.origin}/equipes`);
        if (teamsResponse.ok) {
            teamsData = await teamsResponse.json();
            loadTeams();
        }
        
        alert('Équipe supprimée avec succès');
    } catch (error) {
        alert(error.message || 'Erreur lors de la suppression de l\'équipe');
    }
}

// Edit match function
function editMatch(matchId) {
    // Cette fonction peut être implémentée pour ouvrir un modal d'édition de match
    alert('Fonctionnalité d\'édition à venir pour le match ' + matchId);
}

// Delete match function
async function deleteMatch(matchId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`${window.location.origin}/matchs/${matchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erreur lors de la suppression du match');
        }
        
        // Recharger les données des matchs
        const matchesResponse = await fetch(`${window.location.origin}/matchs`);
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
            loadMatches();
        }
        
        alert('Match supprimé avec succès');
    } catch (error) {
        alert(error.message || 'Erreur lors de la suppression du match');
    }
}

// View result details function
function viewResultDetails(resultId) {
    const result = resultsData.find(r => r.id == resultId);
    if (!result) {
        alert('Résultat non trouvé');
        return;
    }
    
    alert(`Détails du match:\n
Date: ${formatDate(result.date_match)}\n
${result.equipe1_nom} ${result.score_equipe1} - ${result.score_equipe2} ${result.equipe2_nom}\n
${result.details || 'Aucun détail supplémentaire'}`);
}

// Start live match
function startLiveMatch() {
    const matchId = parseInt(document.getElementById('live-match-select').value);
    const match = matchesData.find(m => m.id === matchId);
    
    if (!match) {
        alert('Match non trouvé');
        return;
    }
    
    // Update live match display
    document.getElementById('no-live-message').style.display = 'none';
    document.getElementById('live-match-details').classList.remove('hidden');
    
    document.getElementById('team-a-name').textContent = match.equipe1_nom;
    document.getElementById('team-b-name').textContent = match.equipe2_nom;
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

// Fonction pour initialiser la navigation mobile
function initMobileNav() {
    const sidebar = document.getElementById('sidebar');
    const sidebarHeader = sidebar.querySelector('.sidebar-header');
    
    // Créer le bouton hamburger s'il n'existe pas déjà
    if (!document.getElementById('sidebar-toggle')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'sidebar-toggle';
        toggleButton.className = 'sidebar-toggle';
        toggleButton.innerHTML = '<i class="fas fa-bars"></i>';
        toggleButton.setAttribute('aria-label', 'Menu');
        
        // Ajouter le bouton à l'en-tête de la sidebar
        sidebarHeader.appendChild(toggleButton);
        
        // Réduire la sidebar par défaut sur mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.add('sidebar-collapsed');
        }
        
        // Ajouter l'événement pour ouvrir/fermer le menu
        toggleButton.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-collapsed');
        });
        
        // Fermer le menu après avoir cliqué sur un élément
        const menuItems = sidebar.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('sidebar-collapsed');
                }
            });
        });
    }
}

// Appeler cette fonction au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Cette ligne doit être appelée après que tous les autres éléments DOM sont initialisés
    setTimeout(initMobileNav, 100);
});

// Gérer le redimensionnement de la fenêtre
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (window.innerWidth <= 768) {
            if (!sidebar.classList.contains('sidebar-collapsed')) {
                sidebar.classList.add('sidebar-collapsed');
            }
        } else {
            sidebar.classList.remove('sidebar-collapsed');
        }
    }
});