const { MongoClient } = require('mongodb');
const { validate } = require('../lib/validate');

// La connexion est conservée entre deux appels pour éviter d'en rouvrir une à chaque fois
let clientPromise;
function getClient() {
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }
  return clientPromise;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Méthode non autorisée.' });
  }

  const result = validate(req.body);
  if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
  if (result.spam) return res.status(201).json({ ok: true }); // on fait semblant d'accepter

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI manquante');
    return res.status(500).json({ ok: false, error: 'Configuration serveur manquante.' });
  }

  try {
    const client = await getClient();
    await client.db('bissima').collection('diagnostics').insertOne({
      profil: result.profil,
      reponses: result.reponses,
      createdAt: new Date(),
    });
    return res.status(201).json({ ok: true });
  } catch (err) {
    clientPromise = undefined; // permet de retenter une nouvelle connexion au prochain appel
    console.error('Erreur MongoDB :', err.message);
    return res.status(500).json({ ok: false, error: 'Enregistrement impossible pour le moment.' });
  }
};
