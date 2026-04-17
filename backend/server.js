// ─── Learning Lounge Backend ──────────────────────────────────────────────────
// Hosted on Render. Reads/writes questions.json in your GitHub repo via GitHub API.
//
// Required environment variables (set in Render dashboard):
//   GITHUB_TOKEN   — your GitHub Personal Access Token (classic, repo scope)
//   GITHUB_OWNER   — your GitHub username  e.g. "johndoe"
//   GITHUB_REPO    — your repository name  e.g. "learning-lounge"
//   GITHUB_FILE    — path to data file     e.g. "questions.json"
//   ADMIN_SECRET   — a password you choose for the admin website

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── GitHub helpers ────────────────────────────────────────────────────────────

const GH_HEADERS = () => ({
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
});

const FILE_URL = () =>
  `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${process.env.GITHUB_FILE}`;

// Read current file from GitHub (returns { data, sha })
async function readFile() {
  const res  = await axios.get(FILE_URL(), { headers: GH_HEADERS() });
  const raw  = Buffer.from(res.data.content, 'base64').toString('utf8');
  return { data: JSON.parse(raw), sha: res.data.sha };
}

// Write updated data back to GitHub
async function writeFile(data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  await axios.put(FILE_URL(), {
    message: 'Update questions via Learning Lounge admin',
    content,
    sha,
  }, { headers: GH_HEADERS() });
}

// ── Admin auth middleware ─────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/data — used by the app to load all questions and catalog
app.get('/api/data', async (req, res) => {
  try {
    const { data } = await readFile();
    res.json(data);
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// POST /api/questions — add a new question (admin only)
app.post('/api/questions', requireAdmin, async (req, res) => {
  try {
    const { subject, year, source, question, options, answer, explanation } = req.body;

    if (!subject || !year || !source || !question || !options || answer === undefined || !explanation) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, sha } = await readFile();

    const newQ = {
      id: `q_${Date.now()}`,
      subject, year, source, question,
      options, answer: parseInt(answer), explanation,
    };

    data.questions.push(newQ);
    await writeFile(data, sha);

    res.json({ success: true, question: newQ });
  } catch (err) {
    console.error('POST /api/questions error:', err.message);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// PUT /api/questions/:id — edit a question (admin only)
app.put('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const { data, sha } = await readFile();
    const idx = data.questions.findIndex(q => q.id === req.params.id);

    if (idx === -1) return res.status(404).json({ error: 'Question not found' });

    data.questions[idx] = { ...data.questions[idx], ...req.body, id: req.params.id };
    await writeFile(data, sha);

    res.json({ success: true, question: data.questions[idx] });
  } catch (err) {
    console.error('PUT /api/questions error:', err.message);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/questions/:id — remove a question (admin only)
app.delete('/api/questions/:id', requireAdmin, async (req, res) => {
  try {
    const { data, sha } = await readFile();
    const before = data.questions.length;
    data.questions = data.questions.filter(q => q.id !== req.params.id);

    if (data.questions.length === before) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await writeFile(data, sha);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/questions error:', err.message);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// PUT /api/catalog — update subjects and/or years lists (admin only)
app.put('/api/catalog', requireAdmin, async (req, res) => {
  try {
    const { subjects, years } = req.body;
    const { data, sha } = await readFile();

    if (subjects) data.subjects = subjects;
    if (years)    data.years    = years;

    await writeFile(data, sha);
    res.json({ success: true, subjects: data.subjects, years: data.years });
  } catch (err) {
    console.error('PUT /api/catalog error:', err.message);
    res.status(500).json({ error: 'Failed to update catalog' });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'Learning Lounge backend running ✅' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
