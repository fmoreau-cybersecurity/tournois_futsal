// Variables globales
let currentUser = null;
let isAdmin = false;
let currentPage = 'dashboard';
let liveMatchActive = false;
let liveMatchTimer = null;
let liveMatchSeconds = 0;
let matchPaused = false;
const MATCH_DURATION = 10 * 60;

// Variables pour le stockage des données
let teamsData = [];
let matchesData = [];
let resultsData = [];
let standingsData = [];
let calendarData = {};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Application initialisée');
    
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
    
    // Initialisation de la navigation mobile
    setTimeout(initMobileNav, 100);
});

// Récupération des éléments du DOM
function initializeDOM() {
    console.log('Initialisation des éléments DOM');
    
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
    console.log('Initialisation de l\'authentification');
    
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
        
        console.log('Vérification de l\'authentification sauvegardée:', !!token);
        
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
        console.error('Erreur lors de la vérification de l\'authentification:', e);
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
        
        console.log('Tentative de connexion:', email);
        
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
            
            console.log('Connexion réussie:', currentUser.email, 'Admin:', isAdmin);
            
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
            console.error('Erreur de connexion:', error);
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
        
        console.log('Tentative d\'inscription:', email);
        
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
            
            console.log('Inscription réussie, tentative de connexion automatique');
            
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
            
            console.log('Connexion automatique réussie après inscription');
            
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
            console.error('Erreur lors de l\'inscription:', error);
            alert(error.message || 'Erreur lors de l\'inscription');
        }
    });
}

// Configuration du bouton de déconnexion
function setupLogout() {
    logoutBtn.addEventListener('click', function() {
        console.log('Déconnexion');
        
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
        console.log('Mise à jour UI: utilisateur connecté');
        
        // Cacher l'overlay d'authentification
        hideAuthOverlay();
        
        // Mettre à jour l'affichage du rôle
        userRoleDisplay.textContent = isAdmin ? 'Administrateur' : 'Utilisateur';
        
        // Mettre à jour les éléments d'interface basés sur les droits d'admin
        updateAdminMode();
    } else {
        console.log('Mise à jour UI: utilisateur déconnecté');
        
        // Afficher l'overlay d'authentification
        showAuthOverlay();
    }
}

// Mise à jour des éléments d'interface basés sur les droits d'admin
function updateAdminMode() {
    console.log('Mode admin:', isAdmin);
    
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
    console.log('Affichage overlay authentification');
    
    authOverlay.style.display = 'flex';
    
    // Cacher le contenu principal
    if (mainContent) mainContent.style.visibility = 'hidden';
    if (sidebar) sidebar.style.visibility = 'hidden';
}

// Cacher l'overlay d'authentification
function hideAuthOverlay() {
    console.log('Masquage overlay authentification');
    
    authOverlay.style.display = 'none';
    
    // Afficher le contenu principal
    if (mainContent) mainContent.style.visibility = 'visible';
    if (sidebar) sidebar.style.visibility = 'visible';
}

// Chargement des données depuis l'API
async function loadDataFromAPI() {
    if (!currentUser) {
        console.log('Chargement des données annulé: utilisateur non connecté');
        return;
    }
    
    console.log('Chargement des données depuis l\'API');
    
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
            console.log(`${teamsData.length} équipes chargées`);
        } else {
            console.error('Erreur lors du chargement des équipes:', await teamsResponse.text());
        }
        
        // Chargement des matchs
        const matchesResponse = await fetch(`${window.location.origin}/matchs`, { headers });
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
            console.log(`${matchesData.length} matchs chargés`);
        } else {
            console.error('Erreur lors du chargement des matchs:', await matchesResponse.text());
        }
        
        // Chargement des résultats
        const resultsResponse = await fetch(`${window.location.origin}/resultats`, { headers });
        if (resultsResponse.ok) {
            resultsData = await resultsResponse.json();
            console.log(`${resultsData.length} résultats chargés`);
        } else {
            console.error('Erreur lors du chargement des résultats:', await resultsResponse.text());
        }
        
        // Chargement du classement
        const standingsResponse = await fetch(`${window.location.origin}/classement`, { headers });
        if (standingsResponse.ok) {
            standingsData = await standingsResponse.json();
            console.log(`${standingsData.length} entrées de classement chargées`);
        } else {
            console.error('Erreur lors du chargement du classement:', await standingsResponse.text());
        }
        
        // Chargement du calendrier
        const calendarResponse = await fetch(`${window.location.origin}/calendrier`, { headers });
        if (calendarResponse.ok) {
            calendarData = await calendarResponse.json();
            console.log('Calendrier chargé');
        } else {
            console.error('Erreur lors du chargement du calendrier:', await calendarResponse.text());
        }
        
        // Mise à jour de l'interface
        loadData();
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Load user preferences from localStorage
function loadUserPreferences() {
    console.log('Chargement des préférences utilisateur');
    
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
        try {
            const widgetPreferences = JSON.parse(savedWidgets);
            document.querySelectorAll('.widget-option input').forEach(checkbox => {
                checkbox.checked = widgetPreferences.includes(checkbox.value);
            });
        } catch (e) {
            console.error('Erreur lors du chargement des préférences de widgets:', e);
        }
    }
}

// Set up dashboard widgets based on user preferences
function setupDashboardWidgets() {
    console.log('Configuration des widgets du tableau de bord');
    
    // Vérifier que le tableau de bord existe
    if (!userDashboard) {
        console.error('Élément userDashboard non trouvé');
        return;
    }
    
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
    
    console.log('Widgets sélectionnés:', selectedWidgets);
    
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
    console.log('Ajout des écouteurs d\'événements');
    
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
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveUserPreferences);
    } else {
        console.error('Bouton save-settings non trouvé');
    }
    
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
    const addMatchBtn = document.getElementById('add-match');
    if (addMatchBtn) {
        addMatchBtn.addEventListener('click', function() {
            const modal = document.getElementById('add-match-modal');
            
            // Populate team dropdowns
            const teamASelect = document.getElementById('team-a');
            const teamBSelect = document.getElementById('team-b');
            
            if (teamASelect && teamBSelect) {
                teamASelect.innerHTML = '';
                teamBSelect.innerHTML = '';
                
                teamsData.forEach(team => {
                    teamASelect.innerHTML += `<option value="${team.id}">${team.nom}</option>`;
                    teamBSelect.innerHTML += `<option value="${team.id}">${team.nom}</option>`;
                });
                
                modal.style.display = 'block';
            } else {
                console.error('Éléments de sélection d\'équipe non trouvés');
            }
        });
    }
    
    // Add team button
    const addTeamBtn = document.getElementById('add-team');
    if (addTeamBtn) {
        addTeamBtn.addEventListener('click', function() {
            const modal = document.getElementById('add-team-modal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                console.error('Modal add-team-modal non trouvé');
            }
        });
    }
    
    // Charger le match en direct s'il y en a un
function loadLiveMatch() {
    console.log('Recherche de match en direct...');
    
    // Rechercher un match avec le statut "en cours"
    const liveMatch = matchesData.find(m => m.statut === 'en cours');
    
    if (!liveMatch) {
        console.log('Aucun match en direct trouvé');
        return;
    }
    
    console.log('Match en direct trouvé:', liveMatch);
    
    // Mettre à jour l'affichage du match en direct
    const noLiveMessage = document.getElementById('no-live-message');
    const liveMatchDetails = document.getElementById('live-match-details');
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    const matchTime = document.getElementById('match-time');
    
    if (!noLiveMessage || !liveMatchDetails || !teamAName || !teamBName || 
        !teamAScore || !teamBScore || !matchTime) {
        console.error('Éléments nécessaires pour le match en direct non trouvés');
        return;
    }
    
    // Afficher les détails du match
    noLiveMessage.style.display = 'none';
    liveMatchDetails.classList.remove('hidden');
    
    teamAName.textContent = liveMatch.equipe1_nom;
    teamBName.textContent = liveMatch.equipe2_nom;
    teamAScore.textContent = liveMatch.score_equipe1 || '0';
    teamBScore.textContent = liveMatch.score_equipe2 || '0';
    
    // Indiquer que le match est en cours
    const matchEvents = document.getElementById('match-events');
    if (matchEvents) {
        matchEvents.innerHTML = `
            <div class="event system">
                <strong>--:--</strong> - Match en cours
            </div>
        `;
    }
    
    // Mettre à jour le tableau de bord pour tous les utilisateurs
    const dashboardLiveStatus = document.getElementById('dashboard-live-status');
    if (dashboardLiveStatus) {
        dashboardLiveStatus.innerHTML = `
            <div class="text-center mb-10">
                <strong><span class="match-live-indicator">⚽ EN DIRECT</span></strong>
            </div>
            <div class="text-center mb-10">
                <strong>${liveMatch.equipe1_nom} 
                ${liveMatch.score_equipe1 || '0'} - 
                ${liveMatch.score_equipe2 || '0'} 
                ${liveMatch.equipe2_nom}</strong>
            </div>
            <div class="text-center">
                <a href="#" class="btn btn-primary watch-live-btn">Regarder le match</a>
            </div>
        `;
        
        // Ajouter un écouteur pour le bouton "Regarder le match"
        const watchLiveBtn = dashboardLiveStatus.querySelector('.watch-live-btn');
        if (watchLiveBtn) {
            watchLiveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                changePage('live-match');
            });
        }
    }
    
    // Ajouter un indicateur dans le menu
    const liveMenuItem = document.querySelector('.menu-item[data-page="live-match"]');
    if (liveMenuItem) {
        // Ajouter un indicateur visuel (point rouge) au menu
        if (!liveMenuItem.querySelector('.live-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'live-indicator';
            indicator.innerHTML = ' 🔴';
            liveMenuItem.appendChild(indicator);
        }
    }
}
// Configuration du monitoring en temps réel des matchs
function setupLiveMatchMonitoring() {
    console.log('Configuration du monitoring des matchs en direct');
    
    // Première vérification immédiate
    checkForLiveMatches();
    
    // Puis vérifier toutes les 30 secondes s'il y a un nouveau match en direct
    setInterval(checkForLiveMatches, 30000);
}

// Vérifier s'il y a des matchs en direct
let currentLiveMatchId = null;
async function checkForLiveMatches() {
    if (!currentUser) return; // Ne pas vérifier si l'utilisateur n'est pas connecté
    
    try {
        // Récupérer les matchs depuis l'API
        const matchesResponse = await fetch(`${window.location.origin}/matchs`);
        if (!matchesResponse.ok) {
            throw new Error('Erreur lors de la récupération des matchs');
        }
        
        const updatedMatches = await matchesResponse.json();
        
        // Rechercher un match avec le statut "en cours"
        const liveMatch = updatedMatches.find(m => m.statut === 'en cours');
        
        if (liveMatch) {
            // Si c'est un nouveau match en direct (différent de celui déjà suivi)
            if (currentLiveMatchId !== liveMatch.id) {
                console.log('Nouveau match en direct détecté:', liveMatch.id);
                
                // Stocker l'ID du match en direct actuel
                currentLiveMatchId = liveMatch.id;
                
                // Mettre à jour les données locales
                matchesData = updatedMatches;
                
                // Notification pour tous les utilisateurs
                showNotification(`⚽ MATCH EN DIRECT: ${liveMatch.equipe1_nom} vs ${liveMatch.equipe2_nom}`, 'important');
                
                // Ajouter l'indicateur dans le menu latéral
                addLiveMatchIndicator();
                
                // Mettre à jour le widget sur le tableau de bord
                updateLiveMatchDisplay(liveMatch);
                
                // Si l'utilisateur est sur la page de match en direct, charger automatiquement le match
                if (currentPage === 'live-match') {
                    loadLiveMatchDetails(liveMatch);
                }
            }
        } else {
            // S'il n'y a plus de match en direct mais qu'on en suivait un
            if (currentLiveMatchId !== null) {
                console.log('Match en direct terminé');
                
                // Réinitialiser l'ID du match en direct actuel
                currentLiveMatchId = null;
                
                // Mettre à jour les données locales
                matchesData = updatedMatches;
                
                // Supprimer l'indicateur du menu
                removeLiveMatchIndicator();
                
                // Si on est sur le dashboard, réinitialiser le widget
                resetDashboardLiveWidget();
                
                // Si on est sur la page de match en direct, afficher un message
                if (currentPage === 'live-match') {
                    showNoLiveMatchMessage();
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des matchs en direct:', error);
    }
}

// Ajouter l'indicateur de match en direct dans le menu
function addLiveMatchIndicator() {
    const liveMenuItem = document.querySelector('.menu-item[data-page="live-match"]');
    if (liveMenuItem && !liveMenuItem.querySelector('.live-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'live-indicator';
        indicator.innerHTML = ' 🔴';
        liveMenuItem.appendChild(indicator);
        
        // Faire clignoter l'élément de menu pour attirer l'attention
        liveMenuItem.classList.add('pulsing');
        setTimeout(() => liveMenuItem.classList.remove('pulsing'), 5000);
    }
}

// Supprimer l'indicateur de match en direct du menu
function removeLiveMatchIndicator() {
    const liveIndicator = document.querySelector('.menu-item[data-page="live-match"] .live-indicator');
    if (liveIndicator) {
        liveIndicator.remove();
    }
}

// Mettre à jour l'affichage du match en direct sur le tableau de bord
function updateLiveMatchDisplay(match) {
    const dashboardLiveStatus = document.getElementById('dashboard-live-status');
    if (dashboardLiveStatus) {
        dashboardLiveStatus.innerHTML = `
            <div class="text-center mb-10">
                <strong><span class="match-live-indicator">⚽ EN DIRECT</span></strong>
            </div>
            <div class="text-center mb-10">
                <strong>${match.equipe1_nom} 
                ${match.score_equipe1 || '0'} - 
                ${match.score_equipe2 || '0'} 
                ${match.equipe2_nom}</strong>
            </div>
            <div class="text-center">
                <a href="#" class="btn btn-primary watch-live-btn">Regarder le match</a>
            </div>
        `;
        
        // Ajouter un écouteur pour le bouton "Regarder le match"
        const watchLiveBtn = dashboardLiveStatus.querySelector('.watch-live-btn');
        if (watchLiveBtn) {
            watchLiveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                changePage('live-match');
            });
        }
    }
}

// Réinitialiser le widget de match en direct sur le tableau de bord
function resetDashboardLiveWidget() {
    const dashboardLiveStatus = document.getElementById('dashboard-live-status');
    if (dashboardLiveStatus) {
        dashboardLiveStatus.innerHTML = `
            <div class="text-center mb-20">
                Aucun match en direct pour le moment
            </div>
        `;
    }
}

// Afficher les détails du match en direct dans la page de match en direct
function loadLiveMatchDetails(match) {
    // Vérifier que les éléments nécessaires existent
    const noLiveMessage = document.getElementById('no-live-message');
    const liveMatchDetails = document.getElementById('live-match-details');
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    const matchTime = document.getElementById('match-time');
    const matchEvents = document.getElementById('match-events');
    
    if (!noLiveMessage || !liveMatchDetails || !teamAName || !teamBName || 
        !teamAScore || !teamBScore || !matchTime || !matchEvents) {
        console.error('Éléments nécessaires pour le match en direct non trouvés');
        return;
    }
    
    // Afficher les détails du match
    noLiveMessage.style.display = 'none';
    liveMatchDetails.classList.remove('hidden');
    
    teamAName.textContent = match.equipe1_nom;
    teamBName.textContent = match.equipe2_nom;
    teamAScore.textContent = match.score_equipe1 || '0';
    teamBScore.textContent = match.score_equipe2 || '0';
    matchTime.textContent = 'EN DIRECT';
    
    // Afficher un message dans la liste des événements
    matchEvents.innerHTML = `
        <div class="event system">
            <strong>--:--</strong> - Match en cours, restez à l'écoute pour les mises à jour
        </div>
    `;
    
    // Mettre à jour le titre de la page
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.innerHTML = `<i class="fas fa-broadcast-tower"></i> Match en Direct: ${match.equipe1_nom} vs ${match.equipe2_nom}`;
    }
}

// Afficher un message quand il n'y a pas de match en direct
function showNoLiveMatchMessage() {
    const noLiveMessage = document.getElementById('no-live-message');
    const liveMatchDetails = document.getElementById('live-match-details');
    
    if (noLiveMessage && liveMatchDetails) {
        noLiveMessage.style.display = 'block';
        liveMatchDetails.classList.add('hidden');
    }
}

// Initialiser le système de notification au chargement
document.addEventListener('DOMContentLoaded', function() {
    // Autres initialisations...
    
    // Ajouter cette ligne à la fin de l'initialisation pour démarrer le monitoring
    setTimeout(setupLiveMatchMonitoring, 3000); // Attendre 3 secondes après le chargement
});
    // Select live match button
    const selectLiveMatchBtn = document.getElementById('select-live-match');
    if (selectLiveMatchBtn) {
        selectLiveMatchBtn.addEventListener('click', function() {
            const modal = document.getElementById('select-live-match-modal');
            const liveMatchSelect = document.getElementById('live-match-select');
            
            if (modal && liveMatchSelect) {
                liveMatchSelect.innerHTML = '';
                
                matchesData.filter(match => match.statut === 'à venir').forEach(match => {
                    liveMatchSelect.innerHTML += `<option value="${match.id}">${match.equipe1_nom} vs ${match.equipe2_nom} (${formatDate(match.date_match)} ${match.heure_match})</option>`;
                });
                
                modal.style.display = 'block';
            } else {
                console.error('Éléments pour le match en direct non trouvés');
            }
        });
    }
    
    // Form submissions
    const addMatchForm = document.getElementById('add-match-form');
    if (addMatchForm) {
        addMatchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addMatch();
        });
    }
    
    const addTeamForm = document.getElementById('add-team-form');
    if (addTeamForm) {
        addTeamForm.addEventListener('submit', function(e) {
            e.preventDefault();
            addTeam();
        });
    }
    
    const selectLiveMatchForm = document.getElementById('select-live-match-form');
    if (selectLiveMatchForm) {
        selectLiveMatchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            startLiveMatch();
        });
    }
    
    // Add event button in live match
    const addEventBtn = document.getElementById('add-event');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', function() {
            addLiveEvent();
        });
    }
    
    // Configure les boutons de suppression
    setupDeleteButtons();
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
    if (upcomingMatchesList) {
        const today = new Date();
        const upcomingMatches = matchesData
            .filter(match => {
                const matchDate = new Date(match.date_match);
                return matchDate >= today || match.statut === 'à venir';
            })
            .sort((a, b) => new Date(a.date_match) - new Date(b.date_match))
            .slice(0, 3);
        
        if (upcomingMatches.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="text-center">Aucun match à venir</td>`;
            upcomingMatchesList.appendChild(row);
        } else {
            upcomingMatches.forEach(match => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(match.date_match)}</td>
                    <td>${match.heure_match}</td>
                    <td>${match.equipe1_nom} vs ${match.equipe2_nom}</td>
                    <td>${match.lieu || 'Non spécifié'}</td>
                `;
                upcomingMatchesList.appendChild(row);
            });
        }
    } else {
        console.error('Élément upcoming-matches-list non trouvé');
    }
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
    if (recentResultsList) {
        if (resultsData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="3" class="text-center">Aucun résultat disponible</td>`;
            recentResultsList.appendChild(row);
        } else {
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
    } else {
        console.error('Élément recent-results-list non trouvé');
    }
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
    if (topTeamsList) {
        if (standingsData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" class="text-center">Aucun classement disponible</td>`;
            topTeamsList.appendChild(row);
        } else {
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
    } else {
        console.error('Élément top-teams-list non trouvé');
    }
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
    
    console.log('Changement de page:', pageId);
    
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
    if (activeMenuItem && pageTitle) {
        const titleText = activeMenuItem.querySelector('span');
        if (titleText) {
            pageTitle.textContent = titleText.textContent;
        }
    }
}

// Save user preferences
function saveUserPreferences() {
    console.log('Enregistrement des préférences');
    
    // Save color preference
    const activeColorOption = document.querySelector('.color-option.active');
    if (activeColorOption) {
        const activeColor = activeColorOption.dataset.color;
        localStorage.setItem('themeColor', activeColor);
    }
    
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
// Load data
function loadData() {
    console.log('Chargement des données dans l\'interface');
    
    // Load teams
    loadTeams();
    
    // Load matches
    loadMatches();
    
    // Load results
    loadResults();
    
    // Add result button
    addResultButton();
    
    // Load standings
    loadStandings();
    
    // Load calendar if needed
    if (typeof loadCalendar === 'function') {
        loadCalendar();
    }
    
    // IMPORTANT: Charger le match en direct s'il y en a un
    loadLiveMatch();
    
    // Configure les boutons de suppression
    setupDeleteButtons();
}

// Load teams
function loadTeams() {
    console.log('Chargement des équipes dans l\'interface');
    
    const teamsTable = document.getElementById('teams-table');
    if (!teamsTable) {
        console.error('Élément teams-table non trouvé');
        return;
    }
    
    teamsTable.innerHTML = '';
    
    if (teamsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="text-center">Aucune équipe disponible</td>`;
        teamsTable.appendChild(row);
        return;
    }
    
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
    
    // Mise à jour de l'affichage des boutons admin
    updateAdminMode();
    
    // Ajouter des écouteurs d'événements pour les boutons
    setupDeleteButtons();
}

// Load matches
function loadMatches() {
    console.log('Chargement des matchs dans l\'interface');
    
    const matchesTable = document.getElementById('matches-table');
    if (!matchesTable) {
        console.error('Élément matches-table non trouvé');
        return;
    }
    
    matchesTable.innerHTML = '';
    
    if (matchesData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center">Aucun match disponible</td>`;
        matchesTable.appendChild(row);
        return;
    }
    
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
    
    // Mise à jour de l'affichage des boutons admin
    updateAdminMode();
    
    // Ajouter des écouteurs d'événements pour les boutons
    setupDeleteButtons();
}

// Load results
function loadResults() {
    console.log('Chargement des résultats dans l\'interface');
    
    const resultsTable = document.getElementById('results-table');
    if (!resultsTable) {
        console.error('Élément results-table non trouvé');
        return;
    }
    
    resultsTable.innerHTML = '';
    
    if (resultsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" class="text-center">Aucun résultat disponible</td>`;
        resultsTable.appendChild(row);
        return;
    }
    
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
    console.log('Chargement du classement dans l\'interface');
    
    const standingsTable = document.getElementById('standings-table');
    if (!standingsTable) {
        console.error('Élément standings-table non trouvé');
        return;
    }
    
    standingsTable.innerHTML = '';
    
    if (standingsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="10" class="text-center">Aucun classement disponible</td>`;
        standingsTable.appendChild(row);
        return;
    }
    
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
    
    console.log('Ajout match:', { date, time, teamA, teamB, venue });
    
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
        console.error('Erreur lors de l\'ajout du match:', error);
        alert(error.message || 'Erreur lors de l\'ajout du match');
    }
}

// Add team
async function addTeam() {
    const name = document.getElementById('team-name').value;
    const coach = document.getElementById('team-coach').value;
    const playersText = document.getElementById('team-players').value;
    
    console.log('Ajout équipe:', { name, coach });
    
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
        console.error('Erreur lors de l\'ajout de l\'équipe:', error);
        alert(error.message || 'Erreur lors de l\'ajout de l\'équipe');
    }
}

// Edit team function
function editTeam(teamId) {
    // Cette fonction peut être implémentée pour ouvrir un modal d'édition d'équipe
    console.log('Édition équipe:', teamId);
    alert('Fonctionnalité d\'édition à venir pour l\'équipe ' + teamId);
}

// Edit match function
function editMatch(matchId) {
    // Cette fonction peut être implémentée pour ouvrir un modal d'édition de match
    console.log('Édition match:', matchId);
    alert('Fonctionnalité d\'édition à venir pour le match ' + matchId);
}

// View result details function
function viewResultDetails(resultId) {
    const result = resultsData.find(r => r.id == resultId);
    if (!result) {
        alert('Résultat non trouvé');
        return;
    }
    
    console.log('Affichage détails résultat:', resultId);
    
    alert(`Détails du match:\n
Date: ${formatDate(result.date_match)}\n
${result.equipe1_nom} ${result.score_equipe1} - ${result.score_equipe2} ${result.equipe2_nom}\n
${result.details || 'Aucun détail supplémentaire'}`);
}

async function startLiveMatch() {
    const liveMatchSelect = document.getElementById('live-match-select');
    if (!liveMatchSelect) {
        console.error('Élément live-match-select non trouvé');
        return;
    }
    
    const matchId = parseInt(liveMatchSelect.value);
    const match = matchesData.find(m => m.id === matchId);
    
    console.log('Démarrage match en direct:', matchId);
    
    if (!match) {
        alert('Match non trouvé');
        return;
    }
    
    try {
        // IMPORTANT: Mettre à jour le statut du match à "en cours" dans la base de données
        const authToken = localStorage.getItem('authToken');
        const updateResponse = await fetch(`${window.location.origin}/matchs/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                statut: 'en cours'
            })
        });
        
        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut du match');
        }
        
        console.log('Statut du match mis à jour à "en cours" dans la base de données');
        
        // Mettre à jour l'objet match local
        match.statut = 'en cours';
        
        // Recharger les données des matchs pour tout le monde
        const matchesResponse = await fetch(`${window.location.origin}/matchs`);
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut du match:', error);
        alert('Erreur lors de la mise à jour du statut du match. Veuillez réessayer.');
        return;
    }
    
    // Vérifier que les éléments nécessaires existent
    const noLiveMessage = document.getElementById('no-live-message');
    const liveMatchDetails = document.getElementById('live-match-details');
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    const matchTime = document.getElementById('match-time');
    const matchEvents = document.getElementById('match-events');
    
    if (!noLiveMessage || !liveMatchDetails || !teamAName || !teamBName || 
        !teamAScore || !teamBScore || !matchTime || !matchEvents) {
        console.error('Éléments nécessaires pour le match en direct non trouvés');
        return;
    }
    
    // Update live match display
    noLiveMessage.style.display = 'none';
    liveMatchDetails.classList.remove('hidden');
    
    teamAName.textContent = match.equipe1_nom;
    teamBName.textContent = match.equipe2_nom;
    teamAScore.textContent = match.score_equipe1 || '0';
    teamBScore.textContent = match.score_equipe2 || '0';
    matchTime.textContent = '00:00';
    matchEvents.innerHTML = '';
    
    // Réinitialiser le chronomètre
    liveMatchActive = true;
    liveMatchSeconds = 0;
    matchPaused = false;
    
    if (liveMatchTimer) {
        clearInterval(liveMatchTimer);
    }
    
    // Créer les contrôles de gestion du temps
    createTimeControls();
    
    // Démarrer le chronomètre
    liveMatchTimer = setInterval(updateMatchTime, 1000);
    
    // Mettre à jour les boutons de contrôle du temps
    updateTimeControlButtons();
    
    // Close modal
    const modal = document.getElementById('select-live-match-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Add initial event
    addMatchEvent('Coup d\'envoi', 'system');
    
    console.log("Match démarré:", liveMatchActive, "Timer ID:", liveMatchTimer);
    
    // Notifier tous les utilisateurs
    notifyAllUsers('Match en direct commencé: ' + match.equipe1_nom + ' vs ' + match.equipe2_nom);
}

// Notifier tous les utilisateurs d'un événement
function notifyAllUsers(message) {
    // Afficher une notification
    showNotification(message, 'info');
    
    // Mettre à jour le widget "Match en direct" sur le tableau de bord
    updateLiveMatchWidget();
}

// Mettre à jour le widget de match en direct sur le tableau de bord
function updateLiveMatchWidget() {
    if (!liveMatchActive) return;
    
    const dashboardLiveStatus = document.getElementById('dashboard-live-status');
    if (dashboardLiveStatus) {
        const teamAName = document.getElementById('team-a-name');
        const teamBName = document.getElementById('team-b-name');
        const teamAScore = document.getElementById('team-a-score');
        const teamBScore = document.getElementById('team-b-score');
        
        if (teamAName && teamBName && teamAScore && teamBScore) {
            const minutes = Math.floor(liveMatchSeconds / 60);
            const seconds = liveMatchSeconds % 60;
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            dashboardLiveStatus.innerHTML = `
                <div class="text-center mb-10">
                    <strong><span class="match-live-indicator">⚽ EN DIRECT</span></strong>
                </div>
                <div class="text-center mb-10">
                    <strong>${teamAName.textContent} 
                    ${teamAScore.textContent} - 
                    ${teamBScore.textContent} 
                    ${teamBName.textContent}</strong>
                    <p>${timeStr}</p>
                </div>
                <div class="text-center">
                    <a href="#" class="btn btn-primary watch-live-btn">Regarder le match</a>
                </div>
            `;
            
            // Ajouter un écouteur pour le bouton "Regarder le match"
            const watchLiveBtn = dashboardLiveStatus.querySelector('.watch-live-btn');
            if (watchLiveBtn) {
                watchLiveBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    changePage('live-match');
                });
            }
        }
    }
}

// Update match time
function updateMatchTime() {
    if (!liveMatchActive) {
        console.log("Match inactif, timer ne s'exécute pas");
        return;
    }

    if (matchPaused) {
        console.log("Match en pause, timer en pause");
        return;
    }

    liveMatchSeconds++;
    
    // Vérifier si le match est terminé (10 minutes)
    if (liveMatchSeconds >= MATCH_DURATION) {
        console.log("Match terminé automatiquement");
        clearInterval(liveMatchTimer);
        liveMatchActive = false;
        addMatchEvent('Fin du match', 'system');
        
        // Mettre à jour l'affichage et les boutons
        updateTimeControlButtons();
    }
    
    // Afficher le temps écoulé
    const minutes = Math.floor(liveMatchSeconds / 60);
    const seconds = liveMatchSeconds % 60;
    
    const matchTime = document.getElementById('match-time');
    if (matchTime) {
        matchTime.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
        
    // Afficher le temps restant
    const remainingSeconds = MATCH_DURATION - liveMatchSeconds;
    if (remainingSeconds >= 0) {
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        const remainingSecs = remainingSeconds % 60;
        
        const timeRemaining = document.getElementById('time-remaining');
        if (timeRemaining) {
            timeRemaining.textContent = 
                `Temps restant: ${remainingMinutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
        }
    }
}

function createTimeControls() {
    console.log('Création des contrôles de temps');
    
    let timeControls = document.querySelector('.time-controls');
    
    // Si les contrôles existent déjà, les supprimer pour éviter les doublons
    if (timeControls) {
        timeControls.remove();
    }
    
    // Créer les nouveaux contrôles
    const controlsContainer = document.createElement('div');
    // Changement important: supprimer la classe admin-only du conteneur principal
    controlsContainer.className = 'time-controls';
    
    // Ajouter les boutons de contrôle du temps
    controlsContainer.innerHTML = `
        <div class="time-display">
            <div id="time-remaining" class="time-remaining">Temps restant: 10:00</div>
        </div>
        <div class="time-buttons admin-only">
            <button id="pause-match" class="btn btn-secondary">Pause</button>
            <button id="resume-match" class="btn btn-secondary" style="display: none;">Reprendre</button>
            <button id="stop-match" class="btn btn-danger">Arrêter le Match</button>
        </div>
    `;
    
    // Trouver l'endroit où insérer les contrôles
    const liveMatchDetails = document.getElementById('live-match-details');
    if (liveMatchDetails) {
        // Insérer les contrôles après le score
        const scoreDisplay = liveMatchDetails.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.insertAdjacentElement('afterend', controlsContainer);
        } else {
            liveMatchDetails.prepend(controlsContainer);
        }
        
        // Ajouter les écouteurs d'événements avec une vérification supplémentaire
        const pauseBtn = document.getElementById('pause-match');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function() {
                console.log("Pause clicked");
                pauseMatch();
            });
        }
        
        const resumeBtn = document.getElementById('resume-match');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', function() {
                console.log("Resume clicked");
                resumeMatch();
            });
        }
        
        const stopBtn = document.getElementById('stop-match');
        if (stopBtn) {
            stopBtn.addEventListener('click', function() {
                console.log("Stop clicked");
                stopMatch();
            });
        }
    }
    
    // Mettre à jour l'affichage selon le statut de l'utilisateur
    if (isAdmin) {
        document.querySelectorAll('.time-buttons').forEach(control => {
            control.style.display = 'block';
        });
    } else {
        document.querySelectorAll('.time-buttons').forEach(control => {
            control.style.display = 'none';
        });
    }
}

function updateTimeControlButtons() {
    const pauseButton = document.getElementById('pause-match');
    const resumeButton = document.getElementById('resume-match');
    
    if (pauseButton && resumeButton) {
        if (matchPaused) {
            pauseButton.style.display = 'none';
            resumeButton.style.display = 'inline-block';
        } else {
            pauseButton.style.display = 'inline-block';
            resumeButton.style.display = 'none';
        }
        
        // Désactiver les boutons si le match n'est pas actif
        if (!liveMatchActive) {
            pauseButton.disabled = true;
            resumeButton.disabled = true;
            const stopButton = document.getElementById('stop-match');
            if (stopButton) {
                stopButton.disabled = true;
            }
        } else {
            pauseButton.disabled = false;
            resumeButton.disabled = false;
            const stopButton = document.getElementById('stop-match');
            if (stopButton) {
                stopButton.disabled = false;
            }
        }
    }
}

function pauseMatch() {
    if (liveMatchActive) {
        console.log('Match mis en pause');
        matchPaused = true;
        updateTimeControlButtons();
        addMatchEvent('Match en pause', 'system');
    }
}

function resumeMatch() {
    if (liveMatchActive) {
        console.log('Reprise du match');
        matchPaused = false;
        updateTimeControlButtons();
        addMatchEvent('Reprise du match', 'system');
    }
}

async function stopMatch() {
    if (confirm('Êtes-vous sûr de vouloir arrêter le match?')) {
        console.log('Arrêt du match');
        clearInterval(liveMatchTimer);
        liveMatchActive = false;
        addMatchEvent('Match arrêté', 'system');
        
        // Obtenir l'ID du match en cours
        const liveMatchSelect = document.getElementById('live-match-select');
        if (liveMatchSelect) {
            const matchId = parseInt(liveMatchSelect.value);
            
            try {
                // IMPORTANT: Mettre à jour le statut du match à "terminé" dans la base de données
                const authToken = localStorage.getItem('authToken');
                const teamAScore = document.getElementById('team-a-score').textContent;
                const teamBScore = document.getElementById('team-b-score').textContent;
                
                const updateResponse = await fetch(`${window.location.origin}/matchs/${matchId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        statut: 'terminé',
                        score_equipe1: parseInt(teamAScore),
                        score_equipe2: parseInt(teamBScore)
                    })
                });
                
                if (!updateResponse.ok) {
                    const errorData = await updateResponse.json();
                    throw new Error(errorData.message || 'Erreur lors de la mise à jour du statut du match');
                }
                
                console.log('Statut du match mis à jour à "terminé" dans la base de données');
                
                // Recharger les données des matchs
                const matchesResponse = await fetch(`${window.location.origin}/matchs`);
                if (matchesResponse.ok) {
                    matchesData = await matchesResponse.json();
                }
            } catch (error) {
                console.error('Erreur lors de la mise à jour du statut du match:', error);
                // Continuer malgré l'erreur
            }
        }
        
        updateTimeControlButtons();
        
        // Proposer d'enregistrer le résultat
        if (isAdmin && confirm('Voulez-vous enregistrer ce résultat?')) {
            const teamAScore = document.getElementById('team-a-score').textContent;
            const teamBScore = document.getElementById('team-b-score').textContent;
            
            // Identifier le match et les équipes
            const match = matchesData.find(m => m.id === parseInt(liveMatchSelect.value));
            
            if (match) {
                // Créer une fonction pour enregistrer ce résultat
                saveMatchResult(match.id, match.equipe1_id, match.equipe2_id, parseInt(teamAScore), parseInt(teamBScore));
            }
        }
        
        // Notifier tous les utilisateurs
        notifyAllUsers('Match terminé');
    }
}

async function saveMatchResult(matchId, equipe1Id, equipe2Id, score1, score2) {
    console.log('Enregistrement du résultat:', { matchId, equipe1Id, equipe2Id, score1, score2 });
    
    try {
        const authToken = localStorage.getItem('authToken');
        
        // Mettre à jour le match pour changer son statut et ajouter les scores
        const updateMatchResponse = await fetch(`${window.location.origin}/matchs/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                score_equipe1: score1,
                score_equipe2: score2,
                statut: 'terminé'
            })
        });
        
        if (!updateMatchResponse.ok) {
            const errorData = await updateMatchResponse.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour du match');
        }
        
        // Ajouter le résultat
        const addResultResponse = await fetch(`${window.location.origin}/resultats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                match_id: matchId,
                equipe1_id: equipe1Id,
                equipe2_id: equipe2Id,
                score_equipe1: score1,
                score_equipe2: score2,
                date_match: new Date().toISOString().split('T')[0]
            })
        });
        
        if (!addResultResponse.ok) {
            const errorData = await addResultResponse.json();
            throw new Error(errorData.message || 'Erreur lors de l\'ajout du résultat');
        }
        
        // Recharger les données
        await loadDataFromAPI();
        
        alert('Résultat enregistré avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du résultat:', error);
        alert(error.message || 'Erreur lors de l\'enregistrement du résultat');
    }
}

// Add live event
function addLiveEvent() {
    const eventType = document.getElementById('event-type').value;
    const eventTeam = document.getElementById('event-team').value;
    const eventDetails = document.getElementById('event-details').value;
    
    console.log('Ajout événement:', { eventType, eventTeam, eventDetails });
    
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    
    if (!teamAName || !teamBName) {
        console.error('Noms des équipes non trouvés');
        return;
    }
    
    const teamName = eventTeam === 'team-a' ? 
        teamAName.textContent : 
        teamBName.textContent;
    
    let eventText = '';
    
    switch (eventType) {
        case 'goal':
            eventText = `BUT ! ${teamName} - ${eventDetails}`;
            // Update score
            const scoreElem = document.getElementById(`${eventTeam}-score`);
            if (scoreElem) {
                scoreElem.textContent = (parseInt(scoreElem.textContent) + 1).toString();
            }
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
    const eventDetailsInput = document.getElementById('event-details');
    if (eventDetailsInput) {
        eventDetailsInput.value = '';
    }
}

// Add match event to log
function addMatchEvent(text, type = 'system') {
    console.log('Ajout événement match:', { text, type });
    
    const eventsLog = document.getElementById('match-events');
    if (!eventsLog) {
        console.error('Élément match-events non trouvé');
        return;
    }
    
    const eventElement = document.createElement('div');
    eventElement.className = `event ${type}`;
    
    const minutes = Math.floor(liveMatchSeconds / 60);
    const seconds = liveMatchSeconds % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    eventElement.innerHTML = `<strong>${timeStr}</strong> - ${text}`;
    eventsLog.prepend(eventElement);
    
    // Mettre à jour le widget du match en direct sur toutes les pages
    updateLiveWidgets(text, timeStr);
    
    // Afficher une notification si c'est un événement important (but, carton)
    if (type === 'goal' || type === 'card') {
        showNotification(text, 'important');
    }
}

// Nouvelle fonction pour mettre à jour tous les widgets de match en direct
function updateLiveWidgets(text, timeStr) {
    // Récupérer les informations du match
    const teamAName = document.getElementById('team-a-name');
    const teamBName = document.getElementById('team-b-name');
    const teamAScore = document.getElementById('team-a-score');
    const teamBScore = document.getElementById('team-b-score');
    
    if (!teamAName || !teamBName || !teamAScore || !teamBScore) {
        console.error('Éléments du match en direct non trouvés');
        return;
    }
    
    // 1. Mettre à jour le widget sur le tableau de bord
    const dashboardLiveStatus = document.getElementById('dashboard-live-status');
    if (dashboardLiveStatus) {
        dashboardLiveStatus.innerHTML = `
            <div class="text-center mb-10">
                <strong><span class="match-live-indicator">⚽ EN DIRECT</span></strong>
            </div>
            <div class="text-center mb-10">
                <strong>${teamAName.textContent} 
                ${teamAScore.textContent} - 
                ${teamBScore.textContent} 
                ${teamBName.textContent}</strong>
                <p>${timeStr}</p>
            </div>
            <div class="text-center mb-10">
                <p class="latest-event">${text}</p>
            </div>
            <div class="text-center">
                <a href="#" class="btn btn-primary watch-live-btn">Voir le match</a>
            </div>
        `;
        
        // Ajouter l'écouteur d'événement pour le bouton "Voir le match"
        const watchLiveBtn = dashboardLiveStatus.querySelector('.watch-live-btn');
        if (watchLiveBtn) {
            watchLiveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                changePage('live-match');
            });
        }
    }
    
    // 2. Mettre à jour l'indicateur de match en direct dans la barre latérale
    const liveMenuItem = document.querySelector('.menu-item[data-page="live-match"]');
    if (liveMenuItem) {
        // Ajouter un indicateur visuel (point rouge) au menu
        if (!liveMenuItem.querySelector('.live-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'live-indicator';
            indicator.innerHTML = ' 🔴';
            liveMenuItem.appendChild(indicator);
        }
    }
    
    // 3. Mettre à jour le titre de la page si on est sur la page de match en direct
    if (currentPage === 'live-match') {
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.innerHTML = `<i class="fas fa-broadcast-tower"></i> Match en Direct: ${teamAName.textContent} vs ${teamBName.textContent}`;
        }
    }
}

// Format date
function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Fonction pour initialiser la navigation mobile
function initMobileNav() {
    console.log('Initialisation de la navigation mobile');
    
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error('Élément sidebar non trouvé');
        return;
    }
    
    const sidebarHeader = sidebar.querySelector('.sidebar-header');
    if (!sidebarHeader) {
        console.error('Élément sidebar-header non trouvé');
        return;
    }
    
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

// Fonction pour supprimer un match
async function deleteMatch(matchId) {
    console.log("Tentative de suppression du match:", matchId);

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        console.log("Auth token présent:", !!authToken);

        const response = await fetch(`${window.location.origin}/matchs/${matchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log("Réponse de suppression:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur détaillée:", errorData);
            throw new Error(errorData.message || 'Erreur lors de la suppression du match');
        }
        
        // Recharger les données des matchs
        const matchesResponse = await fetch(`${window.location.origin}/matchs`);
        if (matchesResponse.ok) {
            matchesData = await matchesResponse.json();
            loadMatches();
        }
        
        // Recharger aussi le calendrier si nécessaire
        const calendarResponse = await fetch(`${window.location.origin}/calendrier`);
        if (calendarResponse.ok) {
            calendarData = await calendarResponse.json();
            // Mettre à jour l'affichage du calendrier
            if (typeof loadCalendar === 'function') {
                loadCalendar();
            }
        }
        
        alert('Match supprimé avec succès');
    } catch (error) {
        console.error("Erreur complète:", error);
        alert(error.message || 'Erreur lors de la suppression du match');
    }
}

// Fonction pour supprimer une équipe
async function deleteTeam(teamId) {
    console.log("Tentative de suppression de l'équipe:", teamId);
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ? Tous les matchs associés seront également supprimés.')) {
        return;
    }
    
    try {
        const authToken = localStorage.getItem('authToken');
        console.log("Auth token présent:", !!authToken);
        const response = await fetch(`${window.location.origin}/equipes/${teamId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log("Réponse de suppression:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erreur détaillée:", errorData);
            throw new Error(errorData.message || 'Erreur lors de la suppression de l\'équipe');
        }
        
        // Recharger toutes les données
        await loadDataFromAPI();
        
        alert('Équipe supprimée avec succès');
    } catch (error) {
        console.error("Erreur complète:", error);
        alert(error.message || 'Erreur lors de la suppression de l\'équipe');
    }
}

// Configure les boutons de suppression
function setupDeleteButtons() {
    // Boutons de suppression d'équipe
    document.querySelectorAll('.delete-team').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            const teamId = this.getAttribute('data-id');
            deleteTeam(teamId);
        });
    });
    
    // Boutons de suppression de match
    document.querySelectorAll('.delete-match').forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            const matchId = this.getAttribute('data-id');
            deleteMatch(matchId);
        });
    });
    
    // Boutons d'édition
    document.querySelectorAll('.edit-team').forEach(button => {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-id');
            editTeam(teamId);
        });
    });
    
    document.querySelectorAll('.edit-match').forEach(button => {
        button.addEventListener('click', function() {
            const matchId = this.getAttribute('data-id');
            editMatch(matchId);
        });
    });
}

// Créer un modal pour ajouter un résultat
function createAddResultModal() {
    console.log('Création du modal pour ajouter un résultat');
    
    // Vérifier si le modal existe déjà
    if (document.getElementById('add-result-modal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'add-result-modal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Ajouter un Résultat</h3>
                <span class="close">&times;</span>
            </div>
            <form id="add-result-form">
                <div class="form-group">
                    <label>Match</label>
                    <select class="form-control" id="result-match" required>
                        <!-- Les matchs seront ajoutés dynamiquement -->
                    </select>
                </div>
                <div class="form-group">
                    <label>Score Équipe A</label>
                    <input type="number" min="0" class="form-control" id="score-team-a" required>
                </div>
                <div class="form-group">
                    <label>Score Équipe B</label>
                    <input type="number" min="0" class="form-control" id="score-team-b" required>
                </div>
                <div class="form-group">
                    <label>Détails (optionnel)</label>
                    <textarea class="form-control" id="result-details" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Enregistrer le Résultat</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Ajouter le gestionnaire d'événements pour fermer le modal
    modal.querySelector('.close').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Ajouter le gestionnaire d'événements pour le formulaire
    document.getElementById('add-result-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addResult();
    });
}

// Afficher le modal pour ajouter un résultat
function showAddResultModal() {
    console.log('Affichage du modal pour ajouter un résultat');
    
    createAddResultModal();
    
    const modal = document.getElementById('add-result-modal');
    const matchSelect = document.getElementById('result-match');
    
    if (!modal || !matchSelect) {
        console.error('Éléments pour ajouter un résultat non trouvés');
        return;
    }
    
    // Vider la liste des matchs
    matchSelect.innerHTML = '';
    
    // Ajouter uniquement les matchs qui n'ont pas encore de résultat
    const matchesWithoutResults = matchesData.filter(match => match.statut !== 'terminé');
    
    if (matchesWithoutResults.length === 0) {
        matchSelect.innerHTML = '<option value="">Aucun match disponible</option>';
    } else {
        matchesWithoutResults.forEach(match => {
            const option = document.createElement('option');
            option.value = match.id;
            option.textContent = `${match.equipe1_nom} vs ${match.equipe2_nom} (${formatDate(match.date_match)})`;
            option.dataset.team1Id = match.equipe1_id;
            option.dataset.team2Id = match.equipe2_id;
            matchSelect.appendChild(option);
        });
    }
    
    // Afficher le modal
    modal.style.display = 'block';
}

// Fonction pour ajouter un résultat
async function addResult() {
    const matchSelect = document.getElementById('result-match');
    const scoreTeamA = document.getElementById('score-team-a').value;
    const scoreTeamB = document.getElementById('score-team-b').value;
    const details = document.getElementById('result-details').value;
    
    if (!matchSelect) {
        console.error('Élément result-match non trouvé');
        return;
    }
    
    const matchId = matchSelect.value;
    const selectedOption = matchSelect.options[matchSelect.selectedIndex];
    
    if (!selectedOption) {
        alert('Veuillez sélectionner un match');
        return;
    }
    
    const equipe1Id = selectedOption.dataset.team1Id;
    const equipe2Id = selectedOption.dataset.team2Id;
    
    console.log('Ajout résultat:', { matchId, equipe1Id, equipe2Id, scoreTeamA, scoreTeamB });
    
    try {
        const authToken = localStorage.getItem('authToken');
        
        // Mettre à jour le match pour changer son statut et ajouter les scores
        const updateMatchResponse = await fetch(`${window.location.origin}/matchs/${matchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                score_equipe1: scoreTeamA,
                score_equipe2: scoreTeamB,
                statut: 'terminé'
            })
        });
        
        if (!updateMatchResponse.ok) {
            const errorData = await updateMatchResponse.json();
            throw new Error(errorData.message || 'Erreur lors de la mise à jour du match');
        }
        
        if (!addResultResponse.ok) {
            const errorData = await addResultResponse.json();
            throw new Error(errorData.message || 'Erreur lors de l\'ajout du résultat');
        }
        
        // Recharger les données
        await loadDataFromAPI();
        
        // Fermer le modal
        document.getElementById('add-result-modal').style.display = 'none';
        
        // Réinitialiser le formulaire
        document.getElementById('add-result-form').reset();
        
        alert('Résultat ajouté avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'ajout du résultat:', error);
        alert(error.message || 'Erreur lors de l\'ajout du résultat');
    }
}

// Ajouter un bouton pour ajouter un résultat
function addResultButton() {
    console.log('Ajout du bouton pour ajouter un résultat');
    
    // Trouver le bon endroit pour ajouter le bouton (par exemple, dans l'en-tête de la page des résultats)
    const resultsWidgetHeader = document.querySelector('#results .widget-header');
    
    if (resultsWidgetHeader && !document.getElementById('add-result-btn') && isAdmin) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'widget-actions admin-only';
        
        const addButton = document.createElement('button');
        addButton.id = 'add-result-btn';
        addButton.className = 'btn btn-primary';
        addButton.textContent = 'Ajouter un Résultat';
        addButton.addEventListener('click', showAddResultModal);
        
        actionsDiv.appendChild(addButton);
        resultsWidgetHeader.appendChild(actionsDiv);
        
        // Mettre à jour l'affichage selon le statut de l'utilisateur
        updateAdminMode();
    }
}

// Fonction pour charger le calendrier
function loadCalendar() {
    console.log('Chargement du calendrier');
    
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) {
        // Créer un conteneur si nécessaire
        const calendarPage = document.getElementById('calendar');
        if (calendarPage) {
            const calendarWidget = calendarPage.querySelector('.widget-content');
            if (calendarWidget) {
                const container = document.createElement('div');
                container.id = 'calendar-container';
                calendarWidget.appendChild(container);
                calendarContainer = container;
            } else {
                console.error('Élément widget-content dans calendar non trouvé');
                return;
            }
        } else {
            console.error('Élément calendar non trouvé');
            return;
        }
    }
    
    // Vider le conteneur
    calendarContainer.innerHTML = '';
    
    // Vérifier si des données de calendrier existent
    if (Object.keys(calendarData).length === 0) {
        calendarContainer.innerHTML = '<div class="text-center">Aucun match planifié</div>';
        return;
    }
    
    // Trier les dates
    const sortedDates = Object.keys(calendarData).sort();
    
    // Créer un élément pour chaque date
    sortedDates.forEach(date => {
        const dateMatches = calendarData[date];
        
        // Créer un conteneur pour la date
        const dateSection = document.createElement('div');
        dateSection.className = 'calendar-date';
        
        // Ajouter l'en-tête de date
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'calendar-date-header';
        dateHeader.textContent = formatDate(date);
        dateSection.appendChild(dateHeader);
        
        // Ajouter les matchs de cette date
        const matchesList = document.createElement('div');
        matchesList.className = 'calendar-matches';
        
        dateMatches.forEach(match => {
            const matchItem = document.createElement('div');
            matchItem.className = 'calendar-match';
            
            let statusClass = '';
            let statusText = '';
            
            switch(match.statut) {
                case 'terminé':
                    statusClass = 'match-completed';
                    statusText = `Terminé: ${match.score_equipe1 || 0} - ${match.score_equipe2 || 0}`;
                    break;
                case 'en cours':
                    statusClass = 'match-live';
                    statusText = 'En direct';
                    break;
                default:
                    statusClass = 'match-upcoming';
                    statusText = match.heure_match;
            }
            
            matchItem.classList.add(statusClass);
            
            matchItem.innerHTML = `
                <div class="match-time">${match.heure_match}</div>
                <div class="match-teams">
                    <div class="team team-a">${match.equipe1_nom}</div>
                    <div class="match-status">${statusText}</div>
                    <div class="team team-b">${match.equipe2_nom}</div>
                </div>
                <div class="match-venue">${match.lieu || 'Non spécifié'}</div>
            `;
            
            matchesList.appendChild(matchItem);
        });
        
        dateSection.appendChild(matchesList);
        calendarContainer.appendChild(dateSection);
    });
}

// Fonction pour vérifier la disponibilité du serveur
async function checkServerStatus() {
    try {
        const response = await fetch(`${window.location.origin}/equipes`, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Erreur lors de la vérification du serveur:', error);
        return false;
    }
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Créer un conteneur de notification s'il n'existe pas
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Ajouter la notification au conteneur
    notificationContainer.appendChild(notification);
    
    // Configurer le bouton de fermeture
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.classList.add('notification-closing');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    // Supprimer automatiquement après un délai
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('notification-closing');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Fonction pour créer un filtre de recherche pour les tables
function setupTableFilters() {
    console.log('Configuration des filtres de table');
    
    document.querySelectorAll('.table-filter-input').forEach(input => {
        const targetTableId = input.getAttribute('data-target');
        const targetTable = document.getElementById(targetTableId);
        
        if (!targetTable) {
            console.error(`Table cible ${targetTableId} non trouvée`);
            return;
        }
        
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = targetTable.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                let matchFound = false;
                const textCells = row.querySelectorAll('td:not(:last-child)');
                
                textCells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(searchTerm)) {
                        matchFound = true;
                    }
                });
                
                row.style.display = matchFound ? '' : 'none';
            });
        });
    });
}

// Initialisation des filtres de table
document.addEventListener('DOMContentLoaded', function() {
    // Créer des filtres de recherche pour les tables principales
    const tables = ['teams-table', 'matches-table', 'results-table', 'standings-table'];
    
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            const tableContainer = table.parentElement;
            if (tableContainer) {
                const filterContainer = document.createElement('div');
                filterContainer.className = 'filter-container';
                filterContainer.innerHTML = `
                    <input type="text" class="form-control table-filter-input" 
                           data-target="${tableId}" 
                           placeholder="Rechercher...">
                `;
                
                tableContainer.insertBefore(filterContainer, table);
            }
        }
    });
    
    // Configurer les filtres
    setupTableFilters();
});