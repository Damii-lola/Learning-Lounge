const API_URL = 'https://learning-lounge-o9v9.onrender.com';

// Fetch subjects and populate dropdowns
async function fetchSubjects() {
  const response = await fetch(`${API_URL}/subjects`);
  const subjects = await response.json();
  const subjectSelect = document.getElementById('questionSubject');
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  subjects.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.label;
    subjectSelect.appendChild(option);
  });
  return subjects;
}

// Render subjects
async function renderSubjects() {
  const subjects = await fetchSubjects();
  const grid = document.getElementById('subjects-grid');
  grid.innerHTML = subjects.map(s => `
    <div class="subject-card" data-id="${s.id}">
      <h3>${s.label}</h3>
      <p>${s.id}</p>
    </div>
  `).join('');
  document.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', () => showYears(s.id));
  });
}

// Show years for a subject
async function showYears(subjectId) {
  const response = await fetch(`${API_URL}/years?subject=${subjectId}`);
  const years = await response.json();
  const list = document.getElementById('years-list');
  list.innerHTML = years.map(y => `
    <div class="year-card" data-year="${y}">
      <h3>${y}</h3>
    </div>
  `).join('');
  document.getElementById('subjects').style.display = 'none';
  document.getElementById('years').style.display = 'block';
  document.querySelectorAll('.year-card').forEach(card => {
    card.addEventListener('click', () => showExamTypes(subjectId, card.dataset.year));
  });
}

// Show WAEC/NECO options
async function showExamTypes(subjectId, year) {
  const list = document.getElementById('exam-types-list');
  list.innerHTML = `
    <div class="exam-type-card" data-exam="WAEC">
      <h3>WAEC</h3>
    </div>
    <div class="exam-type-card" data-exam="NECO">
      <h3>NECO</h3>
    </div>
  `;
  document.getElementById('years').style.display = 'none';
  document.getElementById('examTypes').style.display = 'block';
  document.querySelectorAll('.exam-type-card').forEach(card => {
    card.addEventListener('click', () => showQuestions(subjectId, year, card.dataset.exam));
  });
}

// Show questions for subject/year/exam
async function showQuestions(subjectId, year, exam) {
  const response = await fetch(`${API_URL}/questions?subject=${subjectId}&year=${year}&exam=${exam}`);
  const questions = await response.json();
  const list = document.getElementById('questions-list');
  list.innerHTML = questions.map(q => `
    <div class="question-card">
      <p><strong>Q: ${q.text}</strong></p>
      <div>
        ${q.options.map((opt, i) => `
          <p>${String.fromCharCode(65+i)}. ${opt}${i === q.answer ? ' ✓' : ''}</p>
        `).join('')}
      </div>
      <p><em>Explanation: ${q.explanation || 'N/A'}</em></p>
    </div>
  `);
  document.getElementById('examTypes').style.display = 'none';
  document.getElementById('questions').style.display = 'block';
}

// Modal logic
document.getElementById('editCatalog').addEventListener('click', () => {
  document.getElementById('editModal').style.display = 'block';
});
document.getElementById('addQuestion').addEventListener('click', () => {
  document.getElementById('addQuestionModal').style.display = 'block';
});

document.querySelectorAll('.close').forEach(close => {
  close.addEventListener('click', () => {
    close.parentElement.parentElement.style.display = 'none';
  });
});

window.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
  }
});

// Catalog Type Toggle
document.getElementById('catalogType').addEventListener('change', (e) => {
  document.getElementById('editSubjectForm').style.display = e.target.value === 'subject' ? 'block' : 'none';
  document.getElementById('editYearForm').style.display = e.target.value === 'year' ? 'block' : 'none';
  document.getElementById('editQuestionsForm').style.display = e.target.value === 'year' ? 'block' : 'none';
});

// Save Subject
document.getElementById('saveSubject').addEventListener('click', async () => {
  const id = document.getElementById('editSubjectId').value;
  const label = document.getElementById('editSubjectName').value;
  await fetch(`${API_URL}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, label, icon: '📚', color: '#1565C0', bg: '#E3F2FD' })
  });
  alert('Subject saved!');
  document.getElementById('editModal').style.display = 'none';
  renderSubjects();
});

// Save Year
document.getElementById('saveYear').addEventListener('click', async () => {
  const year = document.getElementById('editYearValue').value;
  const subjectId = prompt('Enter subject ID (e.g., english):');
  await fetch(`${API_URL}/years`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject: subjectId, year })
  });
  alert('Year saved!');
  document.getElementById('editModal').style.display = 'none';
});

// Save Questions
document.getElementById('saveQuestions').addEventListener('click', async () => {
  const subject = document.getElementById('editQuestionSubject').value;
  const year = document.getElementById('editQuestionYear').value;
  const questions = prompt('Enter questions in JSON format: [{"text":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]');
  await fetch(`${API_URL}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, year, questions: JSON.parse(questions) })
  });
  alert('Questions saved!');
  document.getElementById('editModal').style.display = 'none';
});

// Add Question Form
document.getElementById('questionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject = document.getElementById('questionSubject').value;
  const year = document.getElementById('questionYear').value;
  const exam = document.getElementById('questionExam').value;
  const text = document.getElementById('questionText').value;
  const options = [
    document.getElementById('questionOptionA').value,
    document.getElementById('questionOptionB').value,
    document.getElementById('questionOptionC').value,
    document.getElementById('questionOptionD').value
  ];
  const answer = parseInt(document.getElementById('questionAnswer').value);
  const explanation = document.getElementById('questionExplanation').value;

  await fetch(`${API_URL}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, year, exam, text, options, answer, explanation })
  });
  alert('Question added!');
  e.target.reset();
  document.getElementById('addQuestionModal').style.display = 'none';
});

// Initialize
renderSubjects();
