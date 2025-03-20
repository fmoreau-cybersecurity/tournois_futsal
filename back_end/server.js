// Importation des modules
const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config();

// Création de l'application Express
const app = express();
app.use(express.json());

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

// Routes
// Route de test
app.get('/', (req, res) => {
  res.send('Bienvenue sur l\'API du tournoi Futsal !');
});

// Route pour obtenir les équipes
app.get('/equipes', (req, res) => {
  db.query('SELECT * FROM equipes', (err, results) => {
    if (err) {
      res.status(500).json({ message: 'Erreur de récupération des équipes', error: err });
    } else {
      res.json(results);
    }
  });
});

// Route pour ajouter un match
app.post('/matchs', (req, res) => {
  const { equipe1_id, equipe2_id, date_match, heure_match, lieu } = req.body;
  
  db.query(
    'INSERT INTO matchs (equipe1_id, equipe2_id, date_match, heure_match, lieu) VALUES (?, ?, ?, ?, ?)',
    [equipe1_id, equipe2_id, date_match, heure_match, lieu],
    (err, results) => {
      if (err) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout du match', error: err });
      } else {
        res.status(201).json({ message: 'Match ajouté avec succès', matchId: results.insertId });
      }
    }
  );
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
