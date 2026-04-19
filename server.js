// server.js (full)
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: get exam type ID from name
async function getExamTypeId(name) {
    const { data } = await supabase
        .from('exam_types')
        .select('id')
        .eq('name', name)
        .single();
    return data?.id;
}

// -------------------- SUBJECTS --------------------
app.get('/subjects', async (req, res) => {
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/subjects', async (req, res) => {
    const { name, icon, color, bg } = req.body;
    const { data, error } = await supabase
        .from('subjects')
        .insert([{ name, icon, color, bg }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.delete('/subjects/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

// -------------------- EXAM TYPES --------------------
app.get('/exam-types', async (req, res) => {
    const { data, error } = await supabase.from('exam_types').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// -------------------- YEARS --------------------
app.get('/years', async (req, res) => {
    const { data, error } = await supabase
        .from('years')
        .select('*')
        .order('year', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/years', async (req, res) => {
    const { year } = req.body;
    const { data, error } = await supabase
        .from('years')
        .insert([{ year }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

app.delete('/years/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('years').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
});

// -------------------- YEARS AVAILABLE (for app) --------------------
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

    const years = [...new Set(data.map(item => item.years.year))];
    res.json(years);
});

// -------------------- QUESTIONS --------------------
app.get('/questions', async (req, res) => {
    const { subject_id, year, exam_type } = req.query;
    
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

app.listen(port, () => {
    console.log(`Learning Lounge API running on port ${port}`);
});
