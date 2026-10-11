'use strict';

/* ==========================================================================
   CineSuggest — analytics.js
   Needs main.js (API functions and UI helpers) and Chart.js loaded first.
   Parts: 1 counters, 2 charts, 3 OLAP operations, 4 start-up
   ========================================================================== */

const analyticsError = document.getElementById('analyticsError');
const chartInstances = {};   // keeps Chart objects so they can be redrawn on retry


/* ==========================================================================
   1. ANIMATED COUNTERS
   ========================================================================== */
const COUNTER_FORMATS = {
  plus: (value) => `${Math.round(value).toLocaleString('en-US')}+`,
  million: (value) => `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M+`,
  decimal: (value) => value.toFixed(1)
};

function animateCounter(element, target, format, duration = 1400) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { element.textContent = format(target); return; }

  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);   // starts fast, slows down
    element.textContent = format(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderCounters(summary) {
  document.querySelectorAll('[data-stat]').forEach((element) => {
    const value = summary[element.dataset.stat];
    if (typeof value === 'number') {
      animateCounter(element, value, COUNTER_FORMATS[element.dataset.format]);
    }
  });
}


/* ==========================================================================
   2. CHARTS (Chart.js)
   ========================================================================== */
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function applyChartDefaults() {
  Chart.defaults.color = cssVar('--muted');
  Chart.defaults.font.family = cssVar('--font-body');
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';
  Chart.defaults.plugins.tooltip.backgroundColor = '#241b35';
  Chart.defaults.plugins.tooltip.padding = 10;
}

function drawChart(canvasId, config) {
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  const canvas = document.getElementById(canvasId);
  chartInstances[canvasId] = new Chart(canvas, config);
  canvas.closest('.chart-card').classList.add('is-ready');   // hides the loading spinner
}

function renderCharts(data) {
  applyChartDefaults();
  const red = cssVar('--chart-red');
  const violet = cssVar('--chart-violet');
  const pink = cssVar('--chart-pink');
  const amber = cssVar('--chart-amber');
  const teal = cssVar('--chart-teal');
  const commonOptions = { responsive: true, maintainAspectRatio: false };

  // Chart 1: Movies by Genre (bar)
  drawChart('genreChart', {
    type: 'bar',
    data: {
      labels: data.genreCounts.labels,
      datasets: [{ label: 'Movies', data: data.genreCounts.values, backgroundColor: violet, borderRadius: 6 }]
    },
    options: { ...commonOptions, plugins: { legend: { display: false } } }
  });

  // Chart 2: Ratings Distribution (doughnut)
  drawChart('ratingDistChart', {
    type: 'doughnut',
    data: {
      labels: data.ratingsDistribution.labels,
      datasets: [{
        data: data.ratingsDistribution.values,
        backgroundColor: ['#5b3a8c', violet, pink, red, amber],
        borderColor: '#1a1425',
        borderWidth: 3
      }]
    },
    options: { ...commonOptions, cutout: '62%', plugins: { legend: { position: 'bottom' } } }
  });

  // Chart 3: Average Rating by Year (line)
  drawChart('yearAvgChart', {
    type: 'line',
    data: {
      labels: data.averageRatingByYear.labels,
      datasets: [{
        label: 'Average rating',
        data: data.averageRatingByYear.values,
        borderColor: red,
        backgroundColor: `${red}33`,
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }]
    },
    options: {
      ...commonOptions,
      plugins: { legend: { display: false } },
      scales: { y: { min: 3, max: 4, title: { display: true, text: 'Rating (1 to 5 scale)' } } }
    }
  });

  // Chart 4: Top Rated Movies (horizontal bar)
  drawChart('topMoviesChart', {
    type: 'bar',
    data: {
      labels: data.topRatedMovies.labels,
      datasets: [{ label: 'Average rating', data: data.topRatedMovies.values, backgroundColor: teal, borderRadius: 6 }]
    },
    options: {
      ...commonOptions,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { min: 4, max: 4.6, title: { display: true, text: 'Average rating (axis starts at 4.0)' } } }
    }
  });

  // Chart 5: Number of Ratings by Year (line)
  drawChart('ratingsByYearChart', {
    type: 'line',
    data: {
      labels: data.ratingsByYear.labels,
      datasets: [{
        label: 'Ratings',
        data: data.ratingsByYear.values,
        borderColor: violet,
        backgroundColor: `${violet}33`,
        fill: true,
        tension: 0.3,
        pointRadius: 4
      }]
    },
    options: { ...commonOptions, plugins: { legend: { display: false } } }
  });
}


/* ==========================================================================
   3. OLAP OPERATIONS
   Roll-up, slice and dice are calculated here from the movie list.
   Drill-down asks getDrillDown() in main.js.
   ========================================================================== */
const olapTable = document.getElementById('olapTable');
const olapTitle = document.getElementById('olapTitleResult');
const olapCount = document.getElementById('olapCount');
const olapState = document.getElementById('olapState');
const olapForms = document.querySelectorAll('.olap-card');

let olapMovies = [];
let olapListenersAdded = false;

const average = (numbers) => numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
const topRated = (movies) => movies.reduce((best, movie) => (movie.rating > best.rating ? movie : best));

// result = { title, columns: [{ label, numeric }], rows: [[cell, ...], ...] }
function showOlapResult(result) {
  olapTitle.textContent = result.title;
  olapCount.textContent = `${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'}`;

  olapTable.querySelector('thead').innerHTML = `<tr>${result.columns
    .map((column) => `<th scope="col" class="${column.numeric ? 'num' : ''}">${escapeHtml(column.label)}</th>`).join('')}</tr>`;

  olapTable.querySelector('tbody').innerHTML = result.rows
    .map((row) => `<tr>${row
      .map((cell, i) => `<td class="${result.columns[i].numeric ? 'num' : ''}">${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  if (result.rows.length) {
    olapState.innerHTML = '';
  } else {
    renderEmpty(olapState, 'No movies match these filters.', 'Try a different combination.');
  }
}

// Roll-up: Movie (detail) -> Genre -> Year (highest level)
function rollUp(level) {
  if (level === 'movie') {
    const rows = [...olapMovies]
      .sort((a, b) => b.rating - a.rating)
      .map((movie) => [movie.title, movie.year, formatGenres(movie.genres), movie.rating.toFixed(1)]);
    return {
      title: 'Roll-Up: individual movies (lowest level)',
      columns: [{ label: 'Movie' }, { label: 'Year', numeric: true }, { label: 'Genres' }, { label: 'Rating', numeric: true }],
      rows
    };
  }

  const groups = new Map();
  olapMovies.forEach((movie) => {
    const keys = level === 'genre' ? movie.genres : [movie.year];
    keys.forEach((key) => {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(movie);
    });
  });

  const rows = [...groups.entries()]
    .map(([key, movies]) => [key, movies.length, average(movies.map((m) => m.rating)).toFixed(2), topRated(movies).title]);

  if (level === 'genre') {
    rows.sort((a, b) => b[1] - a[1]);
  } else {
    rows.sort((a, b) => a[0] - b[0]);
  }

  return {
    title: level === 'genre' ? 'Roll-Up: movies grouped by genre' : 'Roll-Up: movies grouped by year',
    columns: [{ label: level === 'genre' ? 'Genre' : 'Year', numeric: level === 'year' }, { label: 'Movies', numeric: true }, { label: 'Avg rating', numeric: true }, { label: 'Top rated movie' }],
    rows
  };
}

// Drill-down: Year -> Month -> Day (number of ratings)
async function drillDown(level, year, month) {
  const entries = await getDrillDown(level, year, month);
  const total = entries.reduce((sum, entry) => sum + entry.ratings, 0);
  const levelLabel = { year: 'Year', month: 'Month', day: 'Day' }[level];
  const titles = {
    year: 'Drill-Down: ratings per year',
    month: `Drill-Down: ratings per month in ${year}`,
    day: `Drill-Down: ratings per day in ${MONTH_NAMES[Number(month) - 1]} ${year}`
  };
  return {
    title: titles[level],
    columns: [{ label: levelLabel }, { label: 'Ratings', numeric: true }, { label: 'Share of total', numeric: true }],
    rows: entries.map((entry) => [entry.label, entry.ratings.toLocaleString('en-US'), `${((entry.ratings / total) * 100).toFixed(1)}%`])
  };
}

// Slice: fix one dimension (release year)
function slice(year) {
  const rows = olapMovies
    .filter((movie) => String(movie.year) === String(year))
    .sort((a, b) => b.rating - a.rating)
    .map((movie) => [movie.title, formatGenres(movie.genres), movie.rating.toFixed(1)]);
  return {
    title: `Slice: movies released in ${year}`,
    columns: [{ label: 'Movie' }, { label: 'Genres' }, { label: 'Rating', numeric: true }],
    rows
  };
}

// Dice: filter on several dimensions at once
function dice(genre, year, minRating) {
  const rows = olapMovies
    .filter((movie) => !genre || movie.genres.includes(genre))
    .filter((movie) => !year || String(movie.year) === String(year))
    .filter((movie) => movie.rating >= minRating)
    .sort((a, b) => b.rating - a.rating)
    .map((movie) => [movie.title, movie.year, formatGenres(movie.genres), movie.rating.toFixed(1)]);
  return {
    title: `Dice: ${genre || 'any genre'}, ${year || 'any year'}, rating ${minRating > 0 ? `${minRating}+` : 'any'}`,
    columns: [{ label: 'Movie' }, { label: 'Year', numeric: true }, { label: 'Genres' }, { label: 'Rating', numeric: true }],
    rows
  };
}

async function runOlapOperation(form) {
  const values = new FormData(form);
  const operation = form.dataset.operation;

  olapForms.forEach((card) => card.classList.toggle('is-active', card === form));
  olapState.innerHTML = '<div class="skeleton skeleton-line skeleton-line--wide" aria-hidden="true"></div>';

  try {
    let result;
    if (operation === 'rollup') result = rollUp(values.get('level'));
    else if (operation === 'drilldown') result = await drillDown(values.get('level'), values.get('year'), values.get('month'));
    else if (operation === 'slice') result = slice(values.get('year'));
    else result = dice(values.get('genre'), values.get('year'), Number(values.get('rating')));
    showOlapResult(result);
  } catch (error) {
    olapTable.querySelector('thead').innerHTML = '';
    olapTable.querySelector('tbody').innerHTML = '';
    olapCount.textContent = '';
    renderError(olapState, error, () => runOlapOperation(form));
  }
}

// Drill-down only needs the year for "month" and "day", and the month for "day".
function syncDrillControls() {
  const level = document.getElementById('drillLevel').value;
  document.getElementById('drillYear').disabled = level === 'year';
  document.getElementById('drillMonth').disabled = level !== 'day';
}

async function initOlap(analytics) {
  try {
    olapMovies = await getAllMovies();
  } catch (error) {
    renderError(olapState, error, () => initOlap(analytics));
    return;
  }

  // Fill dropdowns once, from the loaded data.
  if (!olapListenersAdded) {
    fillSelect(document.getElementById('drillYear'), analytics.ratingsByYear.labels);
    fillSelect(document.getElementById('sliceYear'), uniqueYears(olapMovies).reverse());
    fillSelect(document.getElementById('diceGenre'), uniqueGenres(olapMovies));
    fillSelect(document.getElementById('diceYear'), uniqueYears(olapMovies));

    olapForms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        runOlapOperation(form);
      });
    });
    document.getElementById('drillLevel').addEventListener('change', syncDrillControls);
    syncDrillControls();
    olapListenersAdded = true;
  }

  // Show a first result so the table is not empty.
  runOlapOperation(document.querySelector('[data-operation="rollup"]'));
}


/* ==========================================================================
   4. START-UP
   ========================================================================== */
async function loadAnalytics() {
  analyticsError.innerHTML = '';
  document.querySelectorAll('.chart-card').forEach((card) => card.classList.remove('is-ready'));

  if (typeof Chart === 'undefined') {
    renderError(analyticsError, new Error('The chart library did not load. Check your internet connection.'), loadAnalytics);
    return;
  }

  try {
    const analytics = await getAnalytics();
    renderCounters(analytics.summary);
    renderCharts(analytics);
    initOlap(analytics);
  } catch (error) {
    renderError(analyticsError, error, loadAnalytics);
  }
}

loadAnalytics();
