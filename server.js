// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your app and website
app.use(express.json());

// Supabase Client (using service_role key for full access)
// WARNING: Keep this key secret! Never expose it in frontend code.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Helper: Get ID from name (for exam types) ---
async function getExamTypeId(name) {
    const { data } = await supabase
        .from('exam_types')
        .select('id')
        .eq('name', name)
        .single();
    return data?.id;
}

// ==================== API ENDPOINTS ====================

// GET /subjects
app.get('/subjects', async (req, res) => {
    const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /subjects
app.post('/subjects', async (req, res) => {
    const { name, icon, color, bg } = req.body;
    const { data, error } = await supabase
        .from('subjects')
        .insert([{ name, icon, color, bg }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// DELETE /subjects/:id
app.delete('/subjects/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

// GET /exam-types
app.get('/exam-types', async (req, res) => {
    const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /years (all years, ordered descending)
app.get('/years', async (req, res) => {
    const { data, error } = await supabase
        .from('years')
        .select('*')
        .order('year', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /years
app.post('/years', async (req, res) => {
    const { year } = req.body;
    const { data, error } = await supabase
        .from('years')
        .insert([{ year }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// DELETE /years/:id
app.delete('/years/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('years').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

// GET /years-available?subject_id=...&exam_type=...
// Returns distinct years that have questions for given filters
app.get('/years-available', async (req, res) => {
    const { subject_id, exam_type } = req.query;
    let query = supabase
        .from('questions')
        .select('year_id, years!inner(year)')
        .order('year', { ascending: false });

    if (subject_id) query = query.eq('subject_id', subject_id);
    if (exam_type && exam_type !== 'All') {
        const examId = await getExamTypeId(exam_type);
        if (examId) query = query.eq('exam_type_id', examId);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Extract unique years
    const years = [...new Set(data.map(item => item.years.year))];
    res.json(years);
});

// GET /questions?subject_id=...&year=...&exam_type=...
app.get('/questions', async (req, res) => {
    const { subject_id, year, exam_type } = req.query;
    
    // Build query
    let query = supabase
        .from('questions')
        .select(`
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
            subjects!inner(name),
            exam_types!inner(name),
            years!inner(year)
        `)
        .eq('subject_id', subject_id)
        .eq('years.year', year);

    if (exam_type && exam_type !== 'All') {
        const examId = await getExamTypeId(exam_type);
        if (examId) query = query.eq('exam_type_id', examId);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    
    // Transform to cleaner format
    const questions = data.map(q => ({
        id: q.id,
        text: q.question_text,
        options: [q.option_a, q.option_b, q.option_c, q.option_d],
        answer: q.correct_option ? ['A', 'B', 'C', 'D'].indexOf(q.correct_option) : 0,
        explanation: q.explanation,
        subject: q.subjects.name,
        examType: q.exam_types.name,
        year: q.years.year
    }));
    res.json(questions);
});

// POST /questions
app.post('/questions', async (req, res) => {
    const {
        subject_id, exam_type_id, year_id,
        question_text, option_a, option_b, option_c, option_d,
        correct_option, explanation
    } = req.body;

    const { data, error } = await supabase
        .from('questions')
        .insert([{
            subject_id, exam_type_id, year_id,
            question_text, option_a, option_b, option_c, option_d,
            correct_option, explanation
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// Start server
app.listen(port, () => {
    console.log(`Learning Lounge API running on port ${port}`);
});
