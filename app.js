// State
const state = {
    questions: [],
    activeQuestions: [], // Questions for the current session
    currentIndex: 0,
    score: 0,
    mode: 'ALL', // 'ALL', 'CATEGORY', 'MOCK'
    mockPhase: 1, // 1 = Signs, 2 = General
    mockMistakes: 0, // Track mistakes for mock exam rules
    answers: {} // Store user answers
};

// DOM Elements
const els = {
    views: {
        home: document.getElementById('home-view'),
        quiz: document.getElementById('quiz-view'),
        results: document.getElementById('results-view')
    },
    homeBtn: document.getElementById('home-btn'),
    categorySelection: document.getElementById('category-selection'),
    categoryGrid: document.getElementById('category-grid'),

    // Quiz Elements
    qCategory: document.getElementById('q-category'),
    currentQNum: document.getElementById('current-q-num'),
    totalQNum: document.getElementById('total-q-num'),
    progressFill: document.getElementById('progress-fill'),
    questionImage: document.getElementById('question-image'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    feedbackSection: document.getElementById('feedback-section'),
    feedbackText: document.getElementById('feedback-text'),
    nextBtn: document.getElementById('next-btn'),

    // Results Elements
    scoreDisplay: document.getElementById('score-display'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message')
};

// Initialization
function init() {
    if (typeof questions !== 'undefined') {
        state.questions = questions;
        renderCategories();
    } else {
        alert('Error loading questions.js');
    }

    // Event Listeners
    els.nextBtn.addEventListener('click', nextQuestion);
    els.homeBtn.addEventListener('click', () => location.reload());
    document.getElementById('logo-link').addEventListener('click', (e) => {
        e.preventDefault();
        location.reload();
    });

    // Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');

    els.questionImage.addEventListener('click', () => {
        // Only open if image is visible and has a source
        if (!els.questionImage.classList.contains('hidden') && els.questionImage.getAttribute('src')) {
            lightboxImg.src = els.questionImage.src;
            lightbox.classList.remove('hidden');
        }
    });

    lightbox.addEventListener('click', () => {
        lightbox.classList.add('hidden');
    });
}

// Mode Selection
window.startMode = function (mode, categoryCode = null) {
    state.mode = mode;
    state.currentIndex = 0;
    state.score = 0;
    state.mockMistakes = 0;
    state.mockPhase = 1;
    state.answers = {};

    if (mode === 'ALL') {
        state.activeQuestions = [...state.questions];
    } else if (mode === 'CATEGORY') {
        state.activeQuestions = state.questions.filter(q => q.category && q.category.code === categoryCode);
    } else if (mode === 'MOCK') {
        startMockExam();
        return;
    }

    startQuiz();
};

window.toggleCategories = function () {
    els.categorySelection.classList.toggle('hidden');
    els.categorySelection.scrollIntoView({ behavior: 'smooth' });
};

function renderCategories() {
    const categories = {};
    state.questions.forEach(q => {
        if (q.category) {
            categories[q.category.code] = q.category.description;
        }
    });

    els.categoryGrid.innerHTML = Object.entries(categories).map(([code, desc]) => `
        <button class="category-btn" onclick="startMode('CATEGORY', '${code}')">
            ${desc}
        </button>
    `).join('');
}

// Mock Exam Logic
function startMockExam() {
    // Phase 1: 10 Signs Questions
    const signQuestions = state.questions.filter(q => q.category && q.category.code === 'SN');
    if (signQuestions.length === 0) {
        alert('No sign questions found. Please check data.');
        return;
    }
    state.activeQuestions = shuffleArray(signQuestions).slice(0, 10);
    state.mockPhase = 1;
    startQuiz();
}

function startMockPhase2() {
    // Phase 2: 20 General Questions (Non-Signs)
    const generalQuestions = state.questions.filter(q => !q.category || q.category.code !== 'SN');
    state.activeQuestions = shuffleArray(generalQuestions).slice(0, 20);
    state.currentIndex = 0;
    state.mockPhase = 2;

    // Reset UI for new phase
    renderQuestion();
    updateProgress();
}

// Quiz Logic
function startQuiz() {
    switchView('quiz');
    renderQuestion();
    updateProgress();
}

function renderQuestion() {
    const question = state.activeQuestions[state.currentIndex];

    // Reset UI
    els.feedbackSection.classList.add('hidden');
    els.nextBtn.disabled = true;
    els.nextBtn.textContent = 'Next Question';

    // Meta
    els.qCategory.textContent = question.category ? question.category.description : 'General';
    els.currentQNum.textContent = state.currentIndex + 1;
    els.totalQNum.textContent = state.activeQuestions.length;

    // Content
    els.questionText.textContent = question.question;

    if (question.images && question.images.length > 0) {
        els.questionImage.src = `images/${question.images[0]}`;
        els.questionImage.classList.remove('hidden');
    } else {
        els.questionImage.classList.add('hidden');
    }

    // Options
    els.optionsContainer.innerHTML = '';
    question.answers.filter(a => a.text && a.text.trim() !== '').forEach(answer => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = answer.text;
        btn.onclick = () => handleAnswer(btn, answer.value, question);
        els.optionsContainer.appendChild(btn);
    });
}

function handleAnswer(selectedBtn, selectedValue, question) {
    // Disable all buttons
    const buttons = els.optionsContainer.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    // Check correctness
    const isCorrect = selectedValue === question.correctAnswer;

    if (isCorrect) {
        selectedBtn.classList.add('correct');
        state.score++;
    } else {
        selectedBtn.classList.add('incorrect');
        state.mockMistakes++;

        // Highlight correct answer
        const correctBtnIndex = question.answers.findIndex(a => a.value === question.correctAnswer);
        if (correctBtnIndex !== -1) {
            buttons[correctBtnIndex].classList.add('correct');
        }
    }

    // Show Feedback
    els.feedbackText.textContent = question.feedback;
    els.feedbackSection.classList.remove('hidden');
    els.nextBtn.disabled = false;

    // Mock Exam Immediate Fail Check
    if (state.mode === 'MOCK') {
        if (state.mockPhase === 1 && !isCorrect) {
            // Fail immediately if any sign question is wrong
            setTimeout(() => finishQuiz(false, "You missed a sign question. You must get 100% on signs to proceed."), 1500);
            return;
        }
        if (state.mockPhase === 2 && state.mockMistakes > 4) {
            setTimeout(() => finishQuiz(false, "You missed more than 4 general questions."), 1500);
            return;
        }
    }
}

function nextQuestion() {
    if (state.currentIndex < state.activeQuestions.length - 1) {
        state.currentIndex++;
        renderQuestion();
        updateProgress();
    } else {
        // End of current set
        if (state.mode === 'MOCK' && state.mockPhase === 1) {
            // Passed Phase 1, start Phase 2
            alert("Excellent! You passed the Signs portion. Now starting General Knowledge.");
            startMockPhase2();
        } else {
            finishQuiz(true);
        }
    }
}

function updateProgress() {
    const progress = ((state.currentIndex + 1) / state.activeQuestions.length) * 100;
    els.progressFill.style.width = `${progress}%`;
}

function finishQuiz(completed = true, failReason = null) {
    switchView('results');

    let passed = false;
    let percentage = 0;

    if (state.mode === 'MOCK') {
        // Mock Exam Logic
        if (failReason) {
            passed = false;
            els.resultTitle.textContent = "Test Failed";
            els.resultMessage.textContent = failReason;
            els.scoreDisplay.textContent = "FAIL";
            els.scoreDisplay.classList.add('fail');
        } else {
            passed = true;
            els.resultTitle.textContent = "Congratulations!";
            els.resultMessage.textContent = "You passed the Virginia DMV Permit Test!";
            els.scoreDisplay.textContent = "PASS";
            els.scoreDisplay.classList.add('pass');
        }
    } else {
        // Standard Logic
        percentage = Math.round((state.score / state.activeQuestions.length) * 100);
        passed = percentage >= 80;

        els.scoreDisplay.textContent = `${percentage}%`;
        els.scoreDisplay.className = `score-display ${passed ? 'pass' : 'fail'}`;
        els.resultTitle.textContent = passed ? "Great Job!" : "Keep Practicing";
        els.resultMessage.textContent = `You answered ${state.score} out of ${state.activeQuestions.length} correctly.`;
    }
}

// Utilities
function switchView(viewName) {
    Object.values(els.views).forEach(el => el.classList.add('hidden'));
    els.views[viewName].classList.remove('hidden');

    if (viewName === 'quiz') {
        els.homeBtn.classList.remove('hidden');
    } else {
        els.homeBtn.classList.add('hidden');
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Start
init();
