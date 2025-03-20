// Importation des modules
const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Chargement des variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'front_end')));

// Secret pour JWT
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète_par_défaut';

// Connexion à la base de données
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tournoi_futsal',
});

// Vérification de la connexion à la base de données
db.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err.stack);
    return;
  }
  console.log('Connexion à la base de données réussie.');
});

// Middleware pour vérifier l'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('Vérification token:', !!token);
  
  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Erreur de vérification du token:', err);
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = user;
    console.log('Utilisateur authentifié:', user);
    next();
  });
};

// Middleware pour vérifier les droits d'administrateur
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Droits d\'administrateur requis.' });
  }
};

// Routes d'authentification
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Tentative de connexion:', email);
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }
  
  db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Erreur de requête login:', err);
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    const user = results[0];
    
    try {
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }
      
      // Générer un JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Ne pas renvoyer le mot de passe
      const { password: userPassword, ...userWithoutPassword } = user;
      
      console.log('Connexion réussie pour:', email);
      
      res.json({
        message: 'Connexion réussie',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Erreur bcrypt:', error);
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  });
});

app.post('/auth/register', async (req, res) => {
  const { nom, email, password } = req.body;
  
  console.log('Tentative d\'inscription:', email);
  
  if (!nom || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }
  
  try {
    // Vérifier si l'utilisateur existe déjà
    db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error('Erreur vérification utilisateur:', err);
        return res.status(500).json({ message: 'Erreur serveur', error: err.message });
      }
      
      if (results.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      }
      
      try {
        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Nouvel utilisateur (par défaut: rôle 'user')
        db.query(
          'INSERT INTO utilisateurs (nom, email, password, role, date_inscription) VALUES (?, ?, ?, ?, NOW())',
          [nom, email, hashedPassword, 'user'],
          (err, results) => {
            if (err) {
              console.error('Erreur insertion utilisateur:', err);
              return res.status(500).json({ message: 'Erreur lors de l\'inscription', error: err.message });
            }
            
            console.log('Inscription réussie pour:', email);
            
            res.status(201).json({
              message: 'Utilisateur créé avec succès',
              userId: results.insertId
            });
          }
        );
      } catch (hashError) {
        console.error('Erreur hachage mot de passe:', hashError);
        return res.status(500).json({ message: 'Erreur serveur', error: hashError.message });
      }
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Routes pour les équipes
app.get('/equipes', (req, res) => {
  console.log('Récupération des équipes');
  
  db.query('SELECT * FROM equipes', (err, results) => {
    if (err) {
      console.error('Erreur récupération équipes:', err);
      return res.status(500).json({ message: 'Erreur de récupération des équipes', error: err.message });
    }
    
    console.log(`${results.length} équipes récupérées`);
    res.json(results);
  });
});

app.get('/equipes/:id', (req, res) => {
  const id = req.params.id;
  console.log('Récupération équipe:', id);
  
  db.query('SELECT * FROM equipes WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erreur récupération équipe:', err);
      return res.status(500).json({ message: 'Erreur de récupération de l\'équipe', error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    res.json(results[0]);
  });
});

app.post('/equipes', authenticateToken, isAdmin, (req, res) => {
  const { nom, coach, players } = req.body;
  
  console.log('Ajout équipe:', nom);
  
  if (!nom) {
    return res.status(400).json({ message: 'Nom de l\'équipe requis' });
  }
  
  db.query(
    'INSERT INTO equipes (nom, coach) VALUES (?, ?)',
    [nom, coach || null],
    (err, results) => {
      if (err) {
        console.error('Erreur ajout équipe:', err);
        return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'équipe', error: err.message });
      }
      
      const equipeId = results.insertId;
      
      // Si des joueurs sont fournis, les ajouter
      if (players && Array.isArray(players) && players.length > 0) {
        const playerPromises = players.map(playerName => {
          return new Promise((resolve, reject) => {
            db.query(
              'INSERT INTO joueurs (nom, equipe_id) VALUES (?, ?)',
              [playerName, equipeId],
              (err) => {
                if (err) {
                  console.error('Erreur ajout joueur:', err);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
        });
        
        Promise.all(playerPromises)
          .then(() => {
            console.log('Équipe et joueurs ajoutés avec succès');
            res.status(201).json({
              message: 'Équipe ajoutée avec succès',
              equipeId: equipeId
            });
          })
          .catch(error => {
            console.error('Erreur lors de l\'ajout des joueurs:', error);
            res.status(201).json({
              message: 'Équipe ajoutée, mais erreurs lors de l\'ajout des joueurs',
              equipeId: equipeId,
              error: error.message
            });
          });
      } else {
        console.log('Équipe ajoutée avec succès (sans joueurs)');
        res.status(201).json({
          message: 'Équipe ajoutée avec succès',
          equipeId: equipeId
        });
      }
    }
  );
});

app.put('/equipes/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  const { nom, coach } = req.body;
  
  console.log('Modification équipe:', id);
  
  db.query(
    'UPDATE equipes SET nom = ?, coach = ? WHERE id = ?',
    [nom, coach, id],
    (err, results) => {
      if (err) {
        console.error('Erreur modification équipe:', err);
        return res.status(500).json({ message: 'Erreur lors de la modification de l\'équipe', error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Équipe non trouvée' });
      }
      
      console.log('Équipe modifiée avec succès');
      res.json({ message: 'Équipe modifiée avec succès' });
    }
  );
});

app.delete('/equipes/:id', authenticateToken, isAdmin, (req, res) => {
  const teamId = req.params.id;
  
  console.log('Suppression équipe:', teamId);
  
  // Vérifier que l'équipe existe
  db.query('SELECT * FROM equipes WHERE id = ?', [teamId], (err, results) => {
    if (err) {
      console.error('Erreur vérification équipe:', err);
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    
    // Supprimer d'abord les matchs associés
    db.query('DELETE FROM matchs WHERE equipe1_id = ? OR equipe2_id = ?', [teamId, teamId], (err) => {
      if (err) {
        console.error('Erreur suppression matchs associés:', err);
        return res.status(500).json({ message: 'Erreur lors de la suppression des matchs associés', error: err.message });
      }
      
      // Supprimer les résultats associés
      db.query('DELETE FROM resultats WHERE equipe1_id = ? OR equipe2_id = ?', [teamId, teamId], (err) => {
        if (err) {
          console.error('Erreur suppression résultats associés:', err);
          console.log('Continuation malgré l\'erreur...');
        }
        
        // Supprimer du classement
        db.query('DELETE FROM classement WHERE equipe_id = ?', [teamId], (err) => {
          if (err) {
            console.error('Erreur suppression classement associé:', err);
            console.log('Continuation malgré l\'erreur...');
          }
          
          // Supprimer les joueurs associés
          db.query('DELETE FROM joueurs WHERE equipe_id = ?', [teamId], (err) => {
            if (err) {
              console.error('Erreur suppression joueurs associés:', err);
              console.log('Continuation malgré l\'erreur...');
            }
            
            // Enfin, supprimer l'équipe
            db.query('DELETE FROM equipes WHERE id = ?', [teamId], (err, results) => {
              if (err) {
                console.error('Erreur suppression équipe:', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression de l\'équipe', error: err.message });
              }
              
              console.log('Équipe et toutes ses associations supprimées avec succès');
              res.json({ message: 'Équipe et toutes ses associations supprimées avec succès' });
            });
          });
        });
      });
    });
  });
});

// Routes pour les matchs
app.get('/matchs', (req, res) => {
  console.log('Récupération des matchs');
  
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     ORDER BY m.date_match, m.heure_match`,
    (err, results) => {
      if (err) {
        console.error('Erreur récupération matchs:', err);
        return res.status(500).json({ message: 'Erreur de récupération des matchs', error: err.message });
      }
      
      console.log(`${results.length} matchs récupérés`);
      res.json(results);
    }
  );
});

app.get('/matchs/upcoming', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('Récupération des matchs à venir');
  
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     WHERE m.date_match >= ? OR (m.date_match = ? AND m.statut = 'à venir')
     ORDER BY m.date_match, m.heure_match 
     LIMIT 10`,
    [today, today],
    (err, results) => {
      if (err) {
        console.error('Erreur récupération matchs à venir:', err);
        return res.status(500).json({ message: 'Erreur de récupération des matchs à venir', error: err.message });
      }
      
      console.log(`${results.length} matchs à venir récupérés`);
      res.json(results);
    }
  );
});

app.get('/matchs/:id', (req, res) => {
  const id = req.params.id;
  
  console.log('Récupération match:', id);
  
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     WHERE m.id = ?`,
    [id],
    (err, results) => {
      if (err) {
        console.error('Erreur récupération match:', err);
        return res.status(500).json({ message: 'Erreur de récupération du match', error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'Match non trouvé' });
      }
      res.json(results[0]);
    }
  );
});

app.post('/matchs', authenticateToken, isAdmin, (req, res) => {
  const { equipe1_id, equipe2_id, date_match, heure_match, lieu } = req.body;
  
  console.log('Ajout match:', { equipe1_id, equipe2_id, date_match });
  
  if (!equipe1_id || !equipe2_id || !date_match || !heure_match) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
  }
  
  if (equipe1_id === equipe2_id) {
    return res.status(400).json({ message: 'Les deux équipes ne peuvent pas être identiques' });
  }
  
  // Vérifier si les équipes existent
  db.query(
    'SELECT id FROM equipes WHERE id IN (?, ?)',
    [equipe1_id, equipe2_id],
    (err, results) => {
      if (err) {
        console.error('Erreur vérification équipes:', err);
        return res.status(500).json({ message: 'Erreur serveur', error: err.message });
      }
      
      if (results.length !== 2) {
        return res.status(404).json({ message: 'Une ou plusieurs équipes n\'existent pas' });
      }
      
      // Ajouter le match
      db.query(
        'INSERT INTO matchs (equipe1_id, equipe2_id, date_match, heure_match, lieu, statut) VALUES (?, ?, ?, ?, ?, ?)',
        [equipe1_id, equipe2_id, date_match, heure_match, lieu, 'à venir'],
        (err, results) => {
          if (err) {
            console.error('Erreur ajout match:', err);
            return res.status(500).json({ message: 'Erreur lors de l\'ajout du match', error: err.message });
          }
          
          console.log('Match ajouté avec succès');
          res.status(201).json({
            message: 'Match ajouté avec succès',
            matchId: results.insertId
          });
        }
      );
    }
  );
});

app.put('/matchs/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  const { equipe1_id, equipe2_id, date_match, heure_match, lieu, statut, score_equipe1, score_equipe2 } = req.body;
  
  console.log('Modification match:', id);
  
  let query = 'UPDATE matchs SET ';
  const updateFields = [];
  const values = [];
  
  if (equipe1_id !== undefined) {
    updateFields.push('equipe1_id = ?');
    values.push(equipe1_id);
  }
  
  if (equipe2_id !== undefined) {
    updateFields.push('equipe2_id = ?');
    values.push(equipe2_id);
  }
  
  if (date_match !== undefined) {
    updateFields.push('date_match = ?');
    values.push(date_match);
  }
  
  if (heure_match !== undefined) {
    updateFields.push('heure_match = ?');
    values.push(heure_match);
  }
  
  if (lieu !== undefined) {
    updateFields.push('lieu = ?');
    values.push(lieu);
  }
  
  if (statut !== undefined) {
    updateFields.push('statut = ?');
    values.push(statut);
  }
  
  if (score_equipe1 !== undefined) {
    updateFields.push('score_equipe1 = ?');
    values.push(score_equipe1);
  }
  
  if (score_equipe2 !== undefined) {
    updateFields.push('score_equipe2 = ?');
    values.push(score_equipe2);
  }
  
  if (updateFields.length === 0) {
    return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
  }
  
  query += updateFields.join(', ') + ' WHERE id = ?';
  values.push(id);
  
  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Erreur modification match:', err);
      return res.status(500).json({ message: 'Erreur lors de la modification du match', error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }
    
    // Si le match est terminé, mettre à jour les résultats et le classement
    if (statut === 'terminé' && score_equipe1 !== undefined && score_equipe2 !== undefined) {
      // Obtenir les IDs des équipes
      db.query('SELECT equipe1_id, equipe2_id FROM matchs WHERE id = ?', [id], (err, matchResults) => {
        if (err || matchResults.length === 0) {
          console.error('Erreur récupération équipes pour résultat:', err);
          return res.status(500).json({ message: 'Erreur lors de la mise à jour du résultat', error: err ? err.message : 'Match non trouvé' });
        }
        
        const match = matchResults[0];
        updateResultsAndStandings(id, match.equipe1_id, match.equipe2_id, score_equipe1, score_equipe2);
      });
    }
    
    console.log('Match modifié avec succès');
    res.json({ message: 'Match modifié avec succès' });
  });
});

app.delete('/matchs/:id', authenticateToken, isAdmin, (req, res) => {
  const matchId = req.params.id;
  
  console.log('Suppression match:', matchId);
  
  // Vérifier que le match existe
  db.query('SELECT * FROM matchs WHERE id = ?', [matchId], (err, results) => {
    if (err) {
      console.error('Erreur vérification match:', err);
      return res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }
    
    // Supprimer le match
    db.query('DELETE FROM matchs WHERE id = ?', [matchId], (err, results) => {
      if (err) {
        console.error('Erreur suppression match:', err);
        return res.status(500).json({ message: 'Erreur lors de la suppression du match', error: err.message });
      }
      
      // Supprimer également tout résultat associé
      db.query('DELETE FROM resultats WHERE match_id = ?', [matchId], (err) => {
        if (err) {
          console.error('Erreur suppression résultats associés:', err);
          console.log('Continuation malgré l\'erreur...');
        }
        
        console.log('Match supprimé avec succès');
        res.json({ message: 'Match supprimé avec succès' });
      });
    });
  });
});

// Routes pour les résultats
app.get('/resultats', (req, res) => {
  console.log('Récupération des résultats');
  
  db.query(
    `SELECT r.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM resultats r 
     JOIN equipes e1 ON r.equipe1_id = e1.id 
     JOIN equipes e2 ON r.equipe2_id = e2.id 
     ORDER BY r.date_match DESC`,
    (err, results) => {
      if (err) {
        console.error('Erreur récupération résultats:', err);
        return res.status(500).json({ message: 'Erreur de récupération des résultats', error: err.message });
      }
      
      console.log(`${results.length} résultats récupérés`);
      res.json(results);
    }
  );
});

app.post('/resultats', authenticateToken, isAdmin, (req, res) => {
  const { match_id, equipe1_id, equipe2_id, score_equipe1, score_equipe2, details, date_match } = req.body;
  
  console.log('Ajout résultat:', { match_id, equipe1_id, equipe2_id, score_equipe1, score_equipe2 });
  
  // Validation des données
  if (!equipe1_id || !equipe2_id || score_equipe1 === undefined || score_equipe2 === undefined || !date_match) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis' });
  }
  
  // Préparation de la requête SQL selon si un match_id est fourni
  let query, params;
  if (match_id) {
    query = 'INSERT INTO resultats (match_id, equipe1_id, equipe2_id, score_equipe1, score_equipe2, details, date_match) VALUES (?, ?, ?, ?, ?, ?, ?)';
    params = [match_id, equipe1_id, equipe2_id, score_equipe1, score_equipe2, details || null, date_match];
  } else {
    query = 'INSERT INTO resultats (equipe1_id, equipe2_id, score_equipe1, score_equipe2, details, date_match) VALUES (?, ?, ?, ?, ?, ?)';
    params = [equipe1_id, equipe2_id, score_equipe1, score_equipe2, details || null, date_match];
  }
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Erreur ajout résultat:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout du résultat', error: err.message });
    }
    
    // Mettre à jour le classement
    updateClassement(equipe1_id, equipe2_id, score_equipe1, score_equipe2);
    
    console.log('Résultat ajouté avec succès');
    res.status(201).json({
      message: 'Résultat ajouté avec succès',
      resultatId: results.insertId
    });
  });
});

// Route pour le classement
app.get('/classement', (req, res) => {
  console.log('Récupération du classement');
  
  db.query(
    `SELECT c.*, e.nom as equipe_nom 
     FROM classement c 
     JOIN equipes e ON c.equipe_id = e.id 
     ORDER BY c.points DESC, (c.buts_pour - c.buts_contre) DESC, c.buts_pour DESC`,
    (err, results) => {
      if (err) {
        console.error('Erreur récupération classement:', err);
        return res.status(500).json({ message: 'Erreur de récupération du classement', error: err.message });
      }
      
      console.log(`${results.length} entrées de classement récupérées`);
      res.json(results);
    }
  );
});

// Fonction pour mettre à jour les résultats et le classement
function updateResultsAndStandings(matchId, equipe1Id, equipe2Id, score1, score2) {
  console.log('Mise à jour résultats et classement:', { matchId, equipe1Id, equipe2Id, score1, score2 });
  
  // Obtenir la date du match
  db.query('SELECT date_match FROM matchs WHERE id = ?', [matchId], (err, results) => {
    if (err || results.length === 0) {
      console.error('Erreur récupération date du match:', err);
      return;
    }
    
    const dateMatch = results[0].date_match;
    
    // Vérifier si un résultat existe déjà pour ce match
    db.query('SELECT id FROM resultats WHERE match_id = ?', [matchId], (err, results) => {
      if (err) {
        console.error('Erreur vérification résultat existant:', err);
        return;
      }
      
      if (results.length > 0) {
        // Mettre à jour le résultat existant
        console.log('Mise à jour du résultat existant');
        db.query(
          'UPDATE resultats SET score_equipe1 = ?, score_equipe2 = ? WHERE match_id = ?',
          [score1, score2, matchId],
          (err) => {
            if (err) {
              console.error('Erreur mise à jour résultat:', err);
            } else {
              console.log('Résultat mis à jour avec succès');
            }
          }
        );
      } else {
        // Créer un nouveau résultat
        console.log('Création d\'un nouveau résultat');
        db.query(
          'INSERT INTO resultats (match_id, equipe1_id, equipe2_id, score_equipe1, score_equipe2, date_match) VALUES (?, ?, ?, ?, ?, ?)',
          [matchId, equipe1Id, equipe2Id, score1, score2, dateMatch],
          (err) => {
            if (err) {
              console.error('Erreur ajout résultat:', err);
            } else {
              console.log('Résultat ajouté avec succès');
            }
          }
        );
      }
      
      // Mettre à jour le classement
      updateClassement(equipe1Id, equipe2Id, score1, score2);
    });
  });
}

// Fonction pour mettre à jour le classement
function updateClassement(equipe1Id, equipe2Id, score1, score2) {
  console.log('Mise à jour classement:', { equipe1Id, equipe2Id, score1, score2 });
  
  // Déterminer le vainqueur ou match nul
  let equipe1Points = 0;
  let equipe2Points = 0;
  let equipe1Victoire = 0;
  let equipe2Victoire = 0;
  let equipe1Defaite = 0;
  let equipe2Defaite = 0;
  let matchNul = 0;

  if (score1 > score2) {
    // Équipe 1 gagne
    equipe1Points = 3;
    equipe1Victoire = 1;
    equipe2Defaite = 1;
  } else if (score2 > score1) {
    // Équipe 2 gagne
    equipe2Points = 3;
    equipe2Victoire = 1;
    equipe1Defaite = 1;
  } else {
    // Match nul
    equipe1Points = 1;
    equipe2Points = 1;
    matchNul = 1;
  }

  // Mettre à jour le classement de l'équipe 1
  db.query(
    `INSERT INTO classement (equipe_id, points, victoires, nuls, defaites, buts_pour, buts_contre) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
     points = points + ?, 
     victoires = victoires + ?, 
     nuls = nuls + ?, 
     defaites = defaites + ?, 
     buts_pour = buts_pour + ?, 
     buts_contre = buts_contre + ?`,
    [
      equipe1Id, equipe1Points, equipe1Victoire, matchNul, equipe1Defaite, score1, score2, 
      equipe1Points, equipe1Victoire, matchNul, equipe1Defaite, score1, score2
    ],
    (err) => {
      if (err) {
        console.error('Erreur mise à jour classement équipe 1:', err);
      } else {
        console.log('Classement équipe 1 mis à jour avec succès');
      }
    }
  );

  // Mettre à jour le classement de l'équipe 2
  db.query(
    `INSERT INTO classement (equipe_id, points, victoires, nuls, defaites, buts_pour, buts_contre) 
     VALUES (?, ?, ?, ?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
     points = points + ?, 
     victoires = victoires + ?, 
     nuls = nuls + ?, 
     defaites = defaites + ?, 
     buts_pour = buts_pour + ?, 
     buts_contre = buts_contre + ?`,
    [
      equipe2Id, equipe2Points, equipe2Victoire, matchNul, equipe2Defaite, score2, score1,
      equipe2Points, equipe2Victoire, matchNul, equipe2Defaite, score2, score1
    ],
    (err) => {
      if (err) {
        console.error('Erreur mise à jour classement équipe 2:', err);
      } else {
        console.log('Classement équipe 2 mis à jour avec succès');
      }
    }
  );
}

// Route pour récupérer les joueurs par équipe
app.get('/joueurs/:equipeId', (req, res) => {
  const equipeId = req.params.equipeId;
  
  console.log('Récupération des joueurs pour l\'équipe:', equipeId);
  
  db.query(
    'SELECT * FROM joueurs WHERE equipe_id = ?',
    [equipeId],
    (err, results) => {
      if (err) {
        console.error('Erreur récupération joueurs:', err);
        return res.status(500).json({ message: 'Erreur de récupération des joueurs', error: err.message });
      }
      
      console.log(`${results.length} joueurs récupérés`);
      res.json(results);
    }
  );
});

// Route pour le calendrier (similaire aux matchs mais différent formatage)
app.get('/calendrier', (req, res) => {
  console.log('Récupération du calendrier');
  
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     ORDER BY m.date_match, m.heure_match`,
    (err, results) => {
      if (err) {
        console.error('Erreur récupération calendrier:', err);
        return res.status(500).json({ message: 'Erreur de récupération du calendrier', error: err.message });
      }
      
      // Grouper par date
      const calendar = {};
      results.forEach(match => {
        if (!calendar[match.date_match]) {
          calendar[match.date_match] = [];
        }
        calendar[match.date_match].push(match);
      });
      
      console.log('Calendrier récupéré avec succès');
      res.json(calendar);
    }
  );
});

// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});