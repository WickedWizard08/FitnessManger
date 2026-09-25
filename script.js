const STORAGE_KEYS = {
  workouts: 'repright-workouts',
  savedPlans: 'repright-saved-plans',
  calendar: 'repright-calendar',
  profile: 'repright-profile'
};

const exercises = [
  { name: 'Bench Press', muscle: 'Chest', weight: 50, sets: 3, reps: 10, instructions: 'Keep your shoulder blades tucked, lower the bar with control to mid-chest, then press upward while keeping your feet planted.' },
  { name: 'Squat', muscle: 'Legs', weight: 65, sets: 3, reps: 10, instructions: 'Stand with feet about shoulder-width apart. Sit your hips down and back, keep your chest proud, then drive through your feet.' },
  { name: 'Deadlift', muscle: 'Back & Legs', weight: 75, sets: 3, reps: 8, instructions: 'Hinge at your hips with a flat back, grip the bar, brace your core, and stand tall without leaning backward.' },
  { name: 'Shoulder Press', muscle: 'Shoulders', weight: 40, sets: 3, reps: 10, instructions: 'Start with weights at shoulder height. Brace your core and press overhead without arching your lower back.' },
  { name: 'Bicep Curl', muscle: 'Arms', weight: 15, sets: 3, reps: 12, instructions: 'Keep elbows close to your ribs and curl the weights slowly. Avoid swinging your body.' },
  { name: 'Tricep Pushdown', muscle: 'Arms', weight: 20, sets: 3, reps: 12, instructions: 'Keep elbows pinned to your sides and press the handle down until your arms are straight.' },
  { name: 'Lat Pulldown', muscle: 'Back', weight: 50, sets: 3, reps: 10, instructions: 'Pull the bar toward your upper chest while keeping your torso steady, then return it slowly.' },
  { name: 'Leg Press', muscle: 'Legs', weight: 90, sets: 3, reps: 10, instructions: 'Place feet shoulder-width apart, lower the platform under control, and push through your whole foot.' },
  { name: 'Leg Curl', muscle: 'Legs', weight: 35, sets: 3, reps: 12, instructions: 'Keep your hips down and curl your heels toward you. Pause briefly before lowering.' },
  { name: 'Leg Extension', muscle: 'Legs', weight: 30, sets: 3, reps: 12, instructions: 'Sit tall with your knees aligned to the machine pivot and extend your legs smoothly.' },
  { name: 'Lunges', muscle: 'Legs', weight: 15, sets: 3, reps: 10, instructions: 'Step forward, lower until both knees are bent, then push through the front foot to return.' },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', weight: 30, sets: 3, reps: 10, instructions: 'Use a slight incline, lower the dumbbells toward your upper chest, then press them together overhead.' },
  { name: 'Dumbbell Fly', muscle: 'Chest', weight: 25, sets: 3, reps: 12, instructions: 'With a soft bend in your elbows, open your arms wide and bring the dumbbells together over your chest.' },
  { name: 'Lateral Raise', muscle: 'Shoulders', weight: 10, sets: 3, reps: 12, instructions: 'Raise light weights out to shoulder height with relaxed wrists, then lower slowly.' }
];

const defaultPlans = {
  'Chest & Shoulders': ['Bench Press', 'Shoulder Press', 'Incline Dumbbell Press', 'Dumbbell Fly'],
  Arms: ['Bicep Curl', 'Tricep Pushdown', 'Lateral Raise'],
  Legs: ['Squat', 'Leg Press', 'Leg Curl', 'Lunges'],
  Back: ['Deadlift', 'Lat Pulldown', 'Bicep Curl']
};

let state = {
  workouts: readStorage(STORAGE_KEYS.workouts, []),
  savedPlans: readStorage(STORAGE_KEYS.savedPlans, []),
  calendar: readStorage(STORAGE_KEYS.calendar, {}),
  profile: readStorage(STORAGE_KEYS.profile, { name: '', goal: 'Strength', experience: 'Beginner' }),
  selectedCategory: 'Chest & Shoulders',
  activeWorkout: null,
  activeExerciseIndex: 0,
  activeSets: [],
  calendarDate: new Date(),
  selectedDate: formatDate(new Date())
};

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (error) { return fallback; }
}

function writeStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function formatDate(date) { return new Date(date).toISOString().slice(0, 10); }
function prettyDate(dateString) { return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function getExercise(name) { return exercises.find((exercise) => exercise.name === name) || exercises[0]; }
function getAllPlans() { return [...Object.keys(defaultPlans), ...state.savedPlans.map((plan) => plan.name)]; }
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setupNavigation() {
  document.querySelectorAll('[data-view]').forEach((item) => item.addEventListener('click', (event) => {
    event.preventDefault();
    showView(item.dataset.view);
  }));
  document.querySelector('#menuToggle').addEventListener('click', () => document.querySelector('#mainNav').classList.toggle('open'));
  window.addEventListener('hashchange', () => showView(location.hash.slice(1) || 'home', false));
}

function showView(viewName, updateHash = true) {
  const validViews = ['home', 'workouts', 'progress', 'assistant', 'calendar', 'exercises', 'profile', 'workout'];
  const view = validViews.includes(viewName) ? viewName : 'home';
  document.querySelectorAll('.view').forEach((section) => section.classList.toggle('active', section.dataset.page === view));
  document.querySelectorAll('.main-nav a').forEach((link) => link.classList.toggle('active', link.dataset.view === view));
  document.querySelector('#mainNav').classList.remove('open');
  if (updateHash && location.hash.slice(1) !== view) history.pushState(null, '', `#${view}`);
  if (view === 'progress') renderProgress();
  if (view === 'calendar') renderCalendar();
  if (view === 'workouts') renderHistory();
}

function populatePlanSelects() {
  const plans = getAllPlans();
  const categorySelect = document.querySelector('#categorySelect');
  categorySelect.innerHTML = plans.map((plan) => `<option>${escapeHtml(plan)}</option>`).join('');
  categorySelect.value = state.selectedCategory;
  categorySelect.addEventListener('change', () => { state.selectedCategory = categorySelect.value; renderHome(); });
  document.querySelector('#calendarWorkoutSelect').innerHTML = plans.map((plan) => `<option>${escapeHtml(plan)}</option>`).join('');
}

function getPlanExercises(planName) {
  if (defaultPlans[planName]) return defaultPlans[planName].map(getExercise);
  const saved = state.savedPlans.find((plan) => plan.name === planName);
  return saved ? saved.exercises.map((item) => ({ ...getExercise(item.name), ...item })) : [];
}

function renderHome() {
  const profileName = state.profile.name ? `Ready to train, ${state.profile.name}.` : 'Small steps. Stronger you.';
  document.querySelector('#homeGreeting').textContent = profileName;
  document.querySelector('#todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  document.querySelector('#homeWorkoutTitle').textContent = state.selectedCategory;
  document.querySelector('#homeExerciseList').innerHTML = getPlanExercises(state.selectedCategory).map((exercise) => `<article class="exercise-card"><span class="exercise-tag">${escapeHtml(exercise.muscle)}</span><h3>${escapeHtml(exercise.name)}</h3><p class="muted">${escapeHtml(exercise.instructions.slice(0, 74))}...</p><div class="exercise-specs"><div class="spec"><strong>${exercise.weight}</strong><span>lbs</span></div><div class="spec"><strong>${exercise.sets}</strong><span>sets</span></div><div class="spec"><strong>${exercise.reps}</strong><span>reps</span></div></div></article>`).join('');
}

function startWorkout(planName = state.selectedCategory) {
  const planExercises = getPlanExercises(planName);
  if (!planExercises.length) return showToast('Add at least one exercise to this workout.');
  state.activeWorkout = { name: planName, exercises: planExercises, startedAt: new Date().toISOString() };
  state.activeExerciseIndex = 0;
  state.activeSets = [];
  renderActiveExercise();
  showView('workout');
}

function renderActiveExercise() {
  const workout = state.activeWorkout;
  const exercise = workout.exercises[state.activeExerciseIndex];
  document.querySelector('#activeWorkoutTitle').textContent = workout.name;
  document.querySelector('#activeExerciseNumber').textContent = String(state.activeExerciseIndex + 1).padStart(2, '0');
  document.querySelector('#activeExerciseName').textContent = exercise.name;
  document.querySelector('#activeExerciseMuscle').textContent = exercise.muscle;
  document.querySelector('#activeInstructions').textContent = exercise.instructions;
  document.querySelector('#activeRecommendation').innerHTML = `<div class="recommendation"><strong>${exercise.weight}</strong><span>recommended lbs</span></div><div class="recommendation"><strong>${exercise.sets}</strong><span>recommended sets</span></div><div class="recommendation"><strong>${exercise.reps}</strong><span>recommended reps</span></div>`;
  document.querySelector('#setWeight').value = exercise.weight;
  document.querySelector('#setReps').value = exercise.reps;
  document.querySelector('#savedSets').innerHTML = state.activeSets.length ? state.activeSets.map((set, index) => `<div class="saved-set"><span>Set ${index + 1}</span><strong>${set.weight} lbs × ${set.reps} reps</strong></div>`).join('') : '<p class="muted">Saved sets will appear here.</p>';
  document.querySelector('#workoutProgressBar').style.width = `${((state.activeExerciseIndex + 1) / workout.exercises.length) * 100}%`;
  document.querySelector('#workoutProgressCopy').textContent = `Exercise ${state.activeExerciseIndex + 1} of ${workout.exercises.length}`;
  document.querySelector('#nextExerciseButton').disabled = state.activeExerciseIndex === workout.exercises.length - 1;
  document.querySelector('#workoutExerciseNav').innerHTML = workout.exercises.map((item, index) => `<button class="exercise-nav-item ${index === state.activeExerciseIndex ? 'active' : ''}" data-exercise-index="${index}" type="button"><span>${index + 1}</span>${escapeHtml(item.name)}</button>`).join('');
  document.querySelectorAll('[data-exercise-index]').forEach((button) => button.addEventListener('click', () => { state.activeExerciseIndex = Number(button.dataset.exerciseIndex); state.activeSets = []; renderActiveExercise(); }));
}

function saveSet(event) {
  event.preventDefault();
  const weight = Number(document.querySelector('#setWeight').value);
  const reps = Number(document.querySelector('#setReps').value);
  if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 1) return showToast('Enter a valid weight and at least 1 rep.');
  state.activeSets.push({ weight, reps });
  renderActiveExercise();
  showToast('Set saved. Nice work.');
}

function finishWorkout() {
  if (!state.activeWorkout) return;
  const allSets = state.activeWorkout.exercises.flatMap((exercise, index) => index === state.activeExerciseIndex ? state.activeSets.map((set) => ({ ...set, exercise: exercise.name })) : []);
  const existingSets = state.activeWorkout.loggedSets || [];
  const loggedSets = [...existingSets, ...allSets];
  if (!loggedSets.length) return showToast('Save at least one set before finishing.');
  const workout = { id: Date.now(), date: formatDate(new Date()), name: state.activeWorkout.name, sets: loggedSets };
  state.workouts.unshift(workout);
  saveWorkout(workout);
  state.activeWorkout = null;
  state.activeSets = [];
  showToast('Workout saved to your history.');
  showView('workouts');
}

function goToNextExercise() {
  if (!state.activeWorkout || state.activeExerciseIndex >= state.activeWorkout.exercises.length - 1) return;
  state.activeWorkout.loggedSets = [...(state.activeWorkout.loggedSets || []), ...state.activeSets.map((set) => ({ ...set, exercise: state.activeWorkout.exercises[state.activeExerciseIndex].name }))];
  state.activeExerciseIndex += 1;
  state.activeSets = [];
  renderActiveExercise();
}

function saveWorkout(workout) {
  const workouts = readStorage(STORAGE_KEYS.workouts, []).filter((item) => item.id !== workout.id);
  writeStorage(STORAGE_KEYS.workouts, [workout, ...workouts]);
}
function loadWorkouts() { state.workouts = readStorage(STORAGE_KEYS.workouts, []); return state.workouts; }
function deleteWorkout(id) { state.workouts = state.workouts.filter((workout) => workout.id !== id); writeStorage(STORAGE_KEYS.workouts, state.workouts); renderHistory(); renderProgress(); showToast('Workout removed.'); }

function renderHistory() {
  loadWorkouts();
  const history = document.querySelector('#historyList');
  if (!state.workouts.length) { history.innerHTML = '<div class="card empty-state"><h2>Your history starts here.</h2><p class="muted">Finish your first workout and it will appear on this page.</p></div>'; return; }
  history.innerHTML = state.workouts.map((workout) => { const totalReps = workout.sets.reduce((sum, set) => sum + set.reps, 0); const weights = [...new Set(workout.sets.map((set) => set.weight))].join(', '); return `<article class="card history-item"><div><h3>${escapeHtml(workout.name)}</h3><p>${prettyDate(workout.date)}</p></div><div class="history-metrics"><span><strong>${[...new Set(workout.sets.map((set) => set.exercise))].length}</strong>exercises</span><span><strong>${workout.sets.length}</strong>sets</span></div><div class="history-metrics"><span><strong>${totalReps}</strong>reps</span><span><strong>${weights || 0}</strong>lbs used</span></div><button class="delete-button" data-delete-id="${workout.id}" type="button">Delete</button></article>`; }).join('');
  document.querySelectorAll('[data-delete-id]').forEach((button) => button.addEventListener('click', () => deleteWorkout(Number(button.dataset.deleteId))));
}

function addCreatorRow(values = {}) {
  const row = document.createElement('div');
  row.className = 'creator-row';
  row.innerHTML = `<label>Exercise<select class="creator-exercise">${exercises.map((exercise) => `<option>${escapeHtml(exercise.name)}</option>`).join('')}</select></label><label>Sets<input class="creator-sets" type="number" min="1" max="10" value="${values.sets || 3}"></label><label>Reps<input class="creator-reps" type="number" min="1" max="50" value="${values.reps || 10}"></label><label>Start lbs<input class="creator-weight" type="number" min="0" step="0.5" value="${values.weight || 0}"></label><button class="remove-exercise" type="button" aria-label="Remove exercise">×</button>`;
  row.querySelector('.creator-exercise').value = values.name || exercises[0].name;
  row.querySelector('.remove-exercise').addEventListener('click', () => row.remove());
  document.querySelector('#creatorExercises').appendChild(row);
}

function saveCustomWorkout(event) {
  event.preventDefault();
  const name = document.querySelector('#creatorName').value.trim();
  const rows = [...document.querySelectorAll('.creator-row')];
  if (!name) return showToast('Please enter a workout name.');
  if (!rows.length) return showToast('Add at least one exercise.');
  const plan = { name, exercises: rows.map((row) => ({ name: row.querySelector('.creator-exercise').value, sets: Number(row.querySelector('.creator-sets').value), reps: Number(row.querySelector('.creator-reps').value), weight: Number(row.querySelector('.creator-weight').value) })) };
  if (plan.exercises.some((exercise) => exercise.sets < 1 || exercise.reps < 1 || exercise.weight < 0)) return showToast('Check sets, reps, and weight values.');
  state.savedPlans = [...state.savedPlans.filter((item) => item.name !== name), plan];
  writeStorage(STORAGE_KEYS.savedPlans, state.savedPlans);
  document.querySelector('#creatorForm').reset();
  document.querySelector('#creatorExercises').innerHTML = '';
  document.querySelector('#creatorPanel').classList.add('hidden');
  populatePlanSelects();
  renderHistory();
  showToast('Custom workout saved.');
}

function calculateProgress() {
  const allSets = state.workouts.flatMap((workout) => workout.sets);
  const counts = {};
  allSets.forEach((set) => { counts[set.exercise] = (counts[set.exercise] || 0) + 1; });
  const mostFrequent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { totalWorkouts: state.workouts.length, totalSets: allSets.length, totalReps: allSets.reduce((sum, set) => sum + set.reps, 0), averageWeight: allSets.length ? Math.round(allSets.reduce((sum, set) => sum + set.weight, 0) / allSets.length) : 0, mostFrequent: mostFrequent ? mostFrequent[0] : '—' };
}

function renderProgress() {
  const progress = calculateProgress();
  document.querySelector('#progressStats').innerHTML = [['Workouts', progress.totalWorkouts], ['Total sets', progress.totalSets], ['Total reps', progress.totalReps], ['Avg. weight', `${progress.averageWeight} lbs`], ['Top exercise', progress.mostFrequent]].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong><span>all time</span></div>`).join('');
  const weeks = [0, 1, 2, 3].map((week) => { const start = new Date(); start.setDate(start.getDate() - (week + 1) * 7); const end = new Date(); end.setDate(end.getDate() - week * 7); return state.workouts.filter((workout) => new Date(`${workout.date}T12:00:00`) >= start && new Date(`${workout.date}T12:00:00`) < end).length; }).reverse();
  const max = Math.max(...weeks, 1);
  document.querySelector('#weeklyChart').innerHTML = weeks.map((count, index) => `<div class="bar-column"><span>${count}</span><div class="bar" style="height: ${Math.max(4, count / max * 140)}px"></div><small>Week ${index + 1}</small></div>`).join('');
  const names = [...new Set(state.workouts.flatMap((workout) => workout.sets.map((set) => set.exercise)))];
  const select = document.querySelector('#progressExerciseSelect');
  select.innerHTML = (names.length ? names : exercises.map((exercise) => exercise.name)).map((name) => `<option>${escapeHtml(name)}</option>`).join('');
  renderWeightChart(select.value);
}

function renderWeightChart(name) {
  const weights = state.workouts.flatMap((workout) => workout.sets.filter((set) => set.exercise === name).map((set) => set.weight)).reverse();
  document.querySelector('#weightChart').innerHTML = weights.length ? `<div class="weight-list">${weights.map((weight) => `<div class="weight-point" title="${weight} lbs" style="height: ${Math.max(8, weight / Math.max(...weights) * 145)}px"></div>`).join('')}</div>` : '<p>No logged weight for this exercise yet.</p>';
}

function saveCalendarEvent(event) {
  event.preventDefault();
  const plan = document.querySelector('#calendarWorkoutSelect').value;
  if (!state.selectedDate || !plan) return showToast('Select a date and workout first.');
  state.calendar[state.selectedDate] = [...new Set([...(state.calendar[state.selectedDate] || []), plan])];
  writeStorage(STORAGE_KEYS.calendar, state.calendar);
  renderCalendar();
  showToast('Workout scheduled.');
}
function loadCalendarEvents() { state.calendar = readStorage(STORAGE_KEYS.calendar, {}); return state.calendar; }

function renderCalendar() {
  loadCalendarEvents();
  const year = state.calendarDate.getFullYear(); const month = state.calendarDate.getMonth();
  document.querySelector('#calendarMonth').textContent = state.calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const previousDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let index = 0; index < 42; index += 1) { const dayNumber = index - firstDay + 1; const date = dayNumber < 1 ? new Date(year, month - 1, previousDays + dayNumber) : dayNumber > daysInMonth ? new Date(year, month + 1, dayNumber - daysInMonth) : new Date(year, month, dayNumber); const dateKey = formatDate(date); const other = date.getMonth() !== month; cells.push(`<button class="calendar-day ${other ? 'other-month' : ''} ${dateKey === formatDate(new Date()) ? 'today' : ''} ${dateKey === state.selectedDate ? 'selected' : ''} ${state.calendar[dateKey] ? 'scheduled' : ''}" data-calendar-date="${dateKey}" type="button">${date.getDate()}</button>`); }
  document.querySelector('#calendarGrid').innerHTML = cells.join('');
  document.querySelectorAll('[data-calendar-date]').forEach((button) => button.addEventListener('click', () => { state.selectedDate = button.dataset.calendarDate; renderCalendar(); }));
  document.querySelector('#selectedDateLabel').textContent = prettyDate(state.selectedDate);
  document.querySelector('#scheduledEvents').innerHTML = (state.calendar[state.selectedDate] || []).map((plan) => `<div class="scheduled-event">✓ ${escapeHtml(plan)}</div>`).join('') || '<p class="muted">No workout scheduled for this date.</p>';
}

function answerAssistant(question) {
  const text = question.toLowerCase();
  if (text.includes('bench')) return 'Keep your back supported on the bench, grip the bar slightly wider than shoulder width, lower the bar with control toward your chest, then press it upward. Start with a manageable weight and focus on proper form.';
  if (text.includes('rep') || text.includes('set')) return 'For a beginner, 3 sets of 8–12 controlled reps is a useful starting point for many exercises. Choose a weight that leaves you with good form and a little energy in reserve.';
  if (text.includes('chest')) return 'Try Bench Press, Incline Dumbbell Press, and Dumbbell Fly. Rest 60–120 seconds between sets and keep each rep controlled.';
  if (text.includes('leg') || text.includes('squat')) return 'A balanced leg day could include Squats, Leg Press, Leg Curl, and Lunges. Warm up first and prioritize a comfortable range of motion.';
  if (text.includes('warm')) return 'Start with 5–10 minutes of easy movement, then do a few light practice sets of your first exercise. Use dynamic movements rather than long static stretches before lifting.';
  if (text.includes('deadlift') || text.includes('back')) return 'For back training, keep your spine neutral and control every rep. A simple session could use Deadlift, Lat Pulldown, and a light Bicep Curl.';
  return 'I can help with exercise form, sets and reps, chest or leg workouts, and warm-ups. Try asking one of those questions.';
}
function addChatMessage(message, type) { const bubble = document.createElement('div'); bubble.className = `chat-message ${type}`; bubble.textContent = message; document.querySelector('#chatMessages').appendChild(bubble); document.querySelector('#chatMessages').scrollTop = document.querySelector('#chatMessages').scrollHeight; }

function saveProfile(event) { event.preventDefault(); const name = document.querySelector('#profileName').value.trim(); if (!name) return showToast('Please enter your name.'); state.profile = { name, goal: document.querySelector('#profileGoal').value, experience: document.querySelector('#profileExperience').value }; writeStorage(STORAGE_KEYS.profile, state.profile); renderProfile(); renderHome(); showToast('Profile saved.'); }
function loadProfile() { state.profile = readStorage(STORAGE_KEYS.profile, state.profile); renderProfile(); }
function renderProfile() { const profile = state.profile; document.querySelector('#profileName').value = profile.name || ''; document.querySelector('#profileGoal').value = profile.goal || 'Strength'; document.querySelector('#profileExperience').value = profile.experience || 'Beginner'; document.querySelector('#profileNameDisplay').textContent = profile.name || 'Your Profile'; document.querySelector('#profileGoalDisplay').textContent = profile.name ? `${profile.goal} · ${profile.experience}` : 'Tell us about your goals.'; document.querySelector('.profile-avatar').textContent = profile.name ? profile.name.charAt(0).toUpperCase() : 'G'; document.querySelector('.avatar').textContent = profile.name ? profile.name.charAt(0).toUpperCase() : 'G'; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

function setupEvents() {
  document.querySelector('#startWorkoutButton').addEventListener('click', () => startWorkout());
  document.querySelector('#setForm').addEventListener('submit', saveSet);
  document.querySelector('#nextExerciseButton').addEventListener('click', goToNextExercise);
  document.querySelector('#finishWorkoutButton').addEventListener('click', finishWorkout);
  document.querySelector('#createWorkoutButton').addEventListener('click', () => { document.querySelector('#creatorPanel').classList.remove('hidden'); if (!document.querySelector('.creator-row')) addCreatorRow(); });
  document.querySelector('#closeCreatorButton').addEventListener('click', () => document.querySelector('#creatorPanel').classList.add('hidden'));
  document.querySelector('#addCreatorExerciseButton').addEventListener('click', () => addCreatorRow());
  document.querySelector('#creatorForm').addEventListener('submit', saveCustomWorkout);
  document.querySelector('#progressExerciseSelect').addEventListener('change', (event) => renderWeightChart(event.target.value));
  document.querySelector('#chatForm').addEventListener('submit', (event) => { event.preventDefault(); const input = document.querySelector('#chatInput'); const question = input.value.trim(); if (!question) return; addChatMessage(question, 'user'); addChatMessage(answerAssistant(question), 'assistant'); input.value = ''; });
  document.querySelector('#calendarForm').addEventListener('submit', saveCalendarEvent);
  document.querySelector('#previousMonthButton').addEventListener('click', () => { state.calendarDate.setMonth(state.calendarDate.getMonth() - 1); renderCalendar(); });
  document.querySelector('#nextMonthButton').addEventListener('click', () => { state.calendarDate.setMonth(state.calendarDate.getMonth() + 1); renderCalendar(); });
  document.querySelector('#exerciseSearch').addEventListener('input', (event) => renderLibrary(event.target.value));
  document.querySelector('#profileForm').addEventListener('submit', saveProfile);
}

function renderLibrary(search = '') {
  const filtered = exercises.filter((exercise) => `${exercise.name} ${exercise.muscle}`.toLowerCase().includes(search.toLowerCase()));
  document.querySelector('#exerciseLibrary').innerHTML = filtered.map((exercise) => `<article class="card library-card"><span class="exercise-tag">${escapeHtml(exercise.muscle)}</span><h3>${escapeHtml(exercise.name)}</h3><p>${escapeHtml(exercise.instructions)}</p><strong>${exercise.sets} sets × ${exercise.reps} reps · ${exercise.weight} lbs starter weight</strong></article>`).join('') || '<div class="card"><p class="muted">No exercises found.</p></div>';
}

function init() {
  setupNavigation(); setupEvents(); populatePlanSelects(); loadProfile(); renderHome(); renderHistory(); renderLibrary();
  addChatMessage('Hi! I am your RepRight guide. Ask me about form, reps, chest, legs, or warm-ups.', 'assistant');
  document.querySelector('#progressExerciseSelect').innerHTML = exercises.map((exercise) => `<option>${escapeHtml(exercise.name)}</option>`).join('');
  if (location.hash) showView(location.hash.slice(1), false);
}

document.addEventListener('DOMContentLoaded', init);
