// Validation et nettoyage des réponses reçues du formulaire.
// On n'accepte que des champs "e_..." (élève) ou "p_..." (parent), de type texte ou liste de textes.

const KEY_RE = /^[ep]_[a-z0-9_-]{1,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_KEYS = 150;
const MAX_LEN = 2000;
const PROFILS = { 'Élève': 'e', 'Parent': 'p' };

function clean(value) {
  if (typeof value === 'string') return value.trim().slice(0, MAX_LEN);
  if (typeof value === 'number') return String(value);
  return null;
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Requête invalide.' };
  }

  // Piège anti-robots : ce champ caché doit rester vide
  if (body.website) return { ok: true, spam: true };

  const prefix = PROFILS[body.profil];
  if (!prefix) return { ok: false, error: 'Profil inconnu.' };

  const reponses = {};
  const keys = Object.keys(body).filter((k) => k !== 'profil' && k !== 'website');
  if (keys.length > MAX_KEYS) return { ok: false, error: 'Trop de champs.' };

  for (const key of keys) {
    if (!KEY_RE.test(key) || key[0] !== prefix) continue; // champ inattendu : ignoré
    const raw = body[key];
    if (Array.isArray(raw)) {
      const list = raw.map(clean).filter(Boolean).slice(0, 30);
      if (list.length) reponses[key] = list;
    } else {
      const v = clean(raw);
      if (v) reponses[key] = v;
    }
  }

  const nom = reponses[`${prefix}_nom`];
  const email = reponses[`${prefix}_email`];
  if (!nom) return { ok: false, error: 'Le nom est obligatoire.' };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "L'adresse email est invalide." };
  if (!reponses[`${prefix}_consent`]) return { ok: false, error: 'Le consentement est obligatoire.' };

  return { ok: true, profil: body.profil, reponses };
}

module.exports = { validate };
