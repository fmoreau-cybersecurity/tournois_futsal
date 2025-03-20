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
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
  
  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = user;
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
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }
  
  db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur serveur', error: err });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    const user = results[0];
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
    
    res.json({
      message: 'Connexion réussie',
      user: userWithoutPassword,
      token
    });
  });
});

app.post('/auth/register', async (req, res) => {
  const { nom, email, password } = req.body;
  
  if (!nom || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }
  
  try {
    // Vérifier si l'utilisateur existe déjà
    db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur serveur', error: err });
      }
      
      if (results.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé' });
      }
      
      // Hacher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Nouvel utilisateur (par défaut: rôle 'user')
      db.query(
        'INSERT INTO utilisateurs (nom, email, password, role, date_inscription) VALUES (?, ?, ?, ?, NOW())',
        [nom, email, hashedPassword, 'user'],
        (err, results) => {
          if (err) {
            return res.status(500).json({ message: 'Erreur lors de l\'inscription', error: err });
          }
          
          res.status(201).json({
            message: 'Utilisateur créé avec succès',
            userId: results.insertId
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

// Routes pour les équipes
app.get('/equipes', (req, res) => {
  db.query('SELECT * FROM equipes', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur de récupération des équipes', error: err });
    }
    res.json(results);
  });
});

app.get('/equipes/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM equipes WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur de récupération de l\'équipe', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Équipe non trouvée' });
    }
    res.json(results[0]);
  });
});

app.post('/equipes', authenticateToken, isAdmin, (req, res) => {
  const { nom, logo } = req.body;
  
  if (!nom) {
    return res.status(400).json({ message: 'Nom de l\'équipe requis' });
  }
  
  db.query(
    'INSERT INTO equipes (nom, logo) VALUES (?, ?)',
    [nom, logo || null],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'équipe', error: err });
      }
      res.status(201).json({
        message: 'Équipe ajoutée avec succès',
        equipeId: results.insertId
      });
    }
  );
});

app.put('/equipes/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  const { nom, logo } = req.body;
  
  db.query(
    'UPDATE equipes SET nom = ?, logo = ? WHERE id = ?',
    [nom, logo, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la modification de l\'équipe', error: err });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Équipe non trouvée' });
      }
      res.json({ message: 'Équipe modifiée avec succès' });
    }
  );
});

app.delete('/equipes/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  
  // Vérifier si l'équipe est utilisée dans d'autres tables
  db.query(
    'SELECT id FROM matchs WHERE equipe1_id = ? OR equipe2_id = ? UNION ALL SELECT id FROM resultats WHERE equipe1_id = ? OR equipe2_id = ? UNION ALL SELECT id FROM classement WHERE equipe_id = ?',
    [id, id, id, id, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur serveur', error: err });
      }
      
      if (results.length > 0) {
        return res.status(409).json({ message: 'Impossible de supprimer l\'équipe car elle est utilisée dans des matchs, résultats ou classements' });
      }
      
      db.query('DELETE FROM equipes WHERE id = ?', [id], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Erreur lors de la suppression de l\'équipe', error: err });
        }
        if (results.affectedRows === 0) {
          return res.status(404).json({ message: 'Équipe non trouvée' });
        }
        res.json({ message: 'Équipe supprimée avec succès' });
      });
    }
  );
});

// Routes pour les matchs
app.get('/matchs', (req, res) => {
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     ORDER BY m.date_match, m.heure_match`,
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur de récupération des matchs', error: err });
      }
      res.json(results);
    }
  );
});

app.get('/matchs/upcoming', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
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
        return res.status(500).json({ message: 'Erreur de récupération des matchs à venir', error: err });
      }
      res.json(results);
    }
  );
});

app.get('/matchs/:id', (req, res) => {
  const id = req.params.id;
  
  db.query(
    `SELECT m.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM matchs m 
     JOIN equipes e1 ON m.equipe1_id = e1.id 
     JOIN equipes e2 ON m.equipe2_id = e2.id 
     WHERE m.id = ?`,
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur de récupération du match', error: err });
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
        return res.status(500).json({ message: 'Erreur serveur', error: err });
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
            return res.status(500).json({ message: 'Erreur lors de l\'ajout du match', error: err });
          }
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
      return res.status(500).json({ message: 'Erreur lors de la modification du match', error: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }
    
    // Si le match est terminé, mettre à jour les résultats et le classement
    if (statut === 'terminé' && score_equipe1 !== undefined && score_equipe2 !== undefined) {
      updateResultsAndStandings(id, equipe1_id, equipe2_id, score_equipe1, score_equipe2);
    }
    
    res.json({ message: 'Match modifié avec succès' });
  });
});

app.delete('/matchs/:id', authenticateToken, isAdmin, (req, res) => {
  const id = req.params.id;
  
  db.query('DELETE FROM matchs WHERE id = ?', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la suppression du match', error: err });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Match non trouvé' });
    }
    res.json({ message: 'Match supprimé avec succès' });
  });
});

// Routes pour les résultats
app.get('/resultats', (req, res) => {
  db.query(
    `SELECT r.*, e1.nom as equipe1_nom, e2.nom as equipe2_nom 
     FROM resultats r 
     JOIN equipes e1 ON r.equipe1_id = e1.id 
     JOIN equipes e2 ON r.equipe2_id = e2.id 
     ORDER BY r.date_match DESC`,
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur de récupération des résultats', error: err });
      }
      res.json(results);
    }
  );
});

app.post('/resultats', authenticateToken, isAdmin, (req, res) => {
  const { equipe1_id, equipe2_id, score_equipe1, score_equipe2, date_match } = req.body;
  
  if (!equipe1_id || !equipe2_id || score_equipe1 === undefined || score_equipe2 === undefined || !date_match) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }
  
  db.query(
    'INSERT INTO resultats (equipe1_id, equipe2_id, score_equipe1, score_equipe2, date_match) VALUES (?, ?, ?, ?, ?)',
    [equipe1_id, equipe2_id, score_equipe1, score_equipe2, date_match],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de l\'ajout du résultat', error: err });
      }
      
      // Mettre à jour le classement
      updateClassement(equipe1_id, equipe2_id, score_equipe1, score_equipe2);
      
      res.status(201).json({
        message: 'Résultat ajouté avec succès',
        resultatId: results.insertId
      });
    }
  );
});

// Fonction pour mettre à jour le classement
function updateClassement(equipe1Id, equipe2Id, score1, score2) {
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
        console.error('Erreur lors de la mise à jour du classement (équipe 1):', err);
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
        console.error('Erreur lors de la mise à jour du classement (équipe 2):', err);
      }
    }
  );
}
// Lancer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});