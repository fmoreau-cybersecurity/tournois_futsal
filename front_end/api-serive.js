// api-service.js
// Ce fichier contient toutes les fonctions pour communiquer avec l'API backend

// URL de base de l'API
const API_BASE_URL = window.location.origin; // Utilise l'URL actuelle (en développement ou production)

/**
 * Service d'authentification
 */
const AuthService = {
    // Connexion utilisateur
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            if (!response.ok) {
                throw new Error('Échec de la connexion');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur de connexion:', error);
            throw error;
        }
    },
    
    // Inscription utilisateur
    register: async (nom, email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nom, email, password }),
            });
            
            if (!response.ok) {
                throw new Error('Échec de l\'inscription');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            throw error;
        }
    }
};

/**
 * Service pour gérer les équipes
 */
const EquipesService = {
    // Récupérer toutes les équipes
    getAll: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/equipes`);
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des équipes');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API équipes:', error);
            throw error;
        }
    },
    
    // Ajouter une nouvelle équipe
    add: async (equipe) => {
        try {
            const response = await fetch(`${API_BASE_URL}/equipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(equipe),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'ajout de l\'équipe');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur ajout équipe:', error);
            throw error;
        }
    },
    
    // Modifier une équipe
    update: async (id, equipe) => {
        try {
            const response = await fetch(`${API_BASE_URL}/equipes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(equipe),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la modification de l\'équipe');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur modification équipe:', error);
            throw error;
        }
    },
    
    // Supprimer une équipe
    delete: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/equipes/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la suppression de l\'équipe');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur suppression équipe:', error);
            throw error;
        }
    }
};

/**
 * Service pour gérer les matchs
 */
const MatchsService = {
    // Récupérer tous les matchs
    getAll: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/matchs`);
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des matchs');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API matchs:', error);
            throw error;
        }
    },
    
    // Récupérer les matchs à venir
    getUpcoming: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/matchs/upcoming`);
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des matchs à venir');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API matchs à venir:', error);
            throw error;
        }
    },
    
    // Ajouter un nouveau match
    add: async (match) => {
        try {
            const response = await fetch(`${API_BASE_URL}/matchs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(match),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'ajout du match');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur ajout match:', error);
            throw error;
        }
    },
    
    // Mettre à jour un match
    update: async (id, match) => {
        try {
            const response = await fetch(`${API_BASE_URL}/matchs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(match),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la modification du match');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur modification match:', error);
            throw error;
        }
    },
    
    // Supprimer un match
    delete: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/matchs/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la suppression du match');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur suppression match:', error);
            throw error;
        }
    }
};

/**
 * Service pour gérer les résultats
 */
const ResultatsService = {
    // Récupérer tous les résultats
    getAll: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/resultats`);
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des résultats');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API résultats:', error);
            throw error;
        }
    },
    
    // Ajouter un nouveau résultat
    add: async (resultat) => {
        try {
            const response = await fetch(`${API_BASE_URL}/resultats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resultat),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de l\'ajout du résultat');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur ajout résultat:', error);
            throw error;
        }
    },
    
    // Mettre à jour un résultat
    update: async (id, resultat) => {
        try {
            const response = await fetch(`${API_BASE_URL}/resultats/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resultat),
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la modification du résultat');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur modification résultat:', error);
            throw error;
        }
    }
};

/**
 * Service pour gérer le classement
 */
const ClassementService = {
    // Récupérer le classement actuel
    get: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/classement`);
            
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération du classement');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur API classement:', error);
            throw error;
        }
    },
    
    // Mettre à jour le classement (généralement fait automatiquement par le backend)
    update: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/classement/update`, {
                method: 'POST',
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors de la mise à jour du classement');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur mise à jour classement:', error);
            throw error;
        }
    }
};

// Exporter tous les services
const ApiService = {
    auth: AuthService,
    equipes: EquipesService,
    matchs: MatchsService,
    resultats: ResultatsService,
    classement: ClassementService
};

// Rendre les services disponibles globalement
window.ApiService = ApiService;