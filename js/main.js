'use strict';

/* ==========================================================================
   CineSuggest — main.js (loaded on every page)

   1. API CONFIG        switch between mock data and the Flask backend
   2. MOCK DATA         sample movies and analytics (replace later)
   3. MOCK BACKEND      a small TF-IDF + cosine recommender used while Flask is not ready
   4. API FUNCTIONS     the ONLY functions that talk to the backend
   5. UI HELPERS        cards, skeletons, empty/error states, suggestions
   6. SHARED BEHAVIOUR  navigation drawer, header, nav search
   7. HOME PAGE         hero wall, search section, top movies
   ========================================================================== */


/* ==========================================================================
   1. API CONFIG
   ========================================================================== */
const API_CONFIG = {
  USE_MOCK_DATA: true,                       // set to false once Flask is running
  BASE_URL: 'http://127.0.0.1:5000/api',     // Flask address (enable CORS in Flask)
  MOCK_DELAY_MS: 350,                        // fake network delay so loaders are visible
  SIMULATE_ERROR: false                      // set to true to test the error screens
};


/* ==========================================================================
   2. MOCK DATA  (sample only; Flask + MySQL will replace this)
   Movie shape: { id, title, year, genres[], rating, keywords[] }
   "keywords" is only used by the mock recommender below.
   ========================================================================== */
const MOCK_MOVIES = [
  { id: 1,  title: 'The Shawshank Redemption', year: 1994, genres: ['Drama', 'Crime'], rating: 9.3, keywords: ['prison', 'hope', 'friendship', 'escape'] },
  { id: 2,  title: 'The Godfather', year: 1972, genres: ['Crime', 'Drama'], rating: 9.2, keywords: ['mafia', 'family', 'power', 'betrayal'] },
  { id: 3,  title: 'The Dark Knight', year: 2008, genres: ['Action', 'Crime', 'Thriller'], rating: 9.0, keywords: ['superhero', 'gotham', 'vigilante', 'chaos'] },
  { id: 4,  title: 'Pulp Fiction', year: 1994, genres: ['Crime', 'Thriller'], rating: 8.9, keywords: ['hitman', 'nonlinear', 'gangster', 'violence'] },
  { id: 5,  title: 'Inception', year: 2010, genres: ['Sci-Fi', 'Thriller', 'Action'], rating: 8.8, keywords: ['dreams', 'heist', 'mindbending', 'time', 'family'] },
  { id: 6,  title: 'Interstellar', year: 2014, genres: ['Sci-Fi', 'Drama', 'Adventure'], rating: 8.6, keywords: ['space', 'time', 'wormhole', 'family', 'mindbending'] },
  { id: 7,  title: 'The Matrix', year: 1999, genres: ['Sci-Fi', 'Action'], rating: 8.7, keywords: ['simulation', 'hacker', 'reality', 'mindbending'] },
  { id: 8,  title: 'Goodfellas', year: 1990, genres: ['Crime', 'Drama'], rating: 8.7, keywords: ['mafia', 'gangster', 'loyalty', 'violence'] },
  { id: 9,  title: 'The Fellowship of the Ring', year: 2001, genres: ['Adventure', 'Action', 'Fantasy'], rating: 8.8, keywords: ['quest', 'magic', 'friendship', 'journey'] },
  { id: 10, title: 'Star Wars: A New Hope', year: 1977, genres: ['Sci-Fi', 'Adventure', 'Action'], rating: 8.6, keywords: ['space', 'rebellion', 'empire', 'force'] },
  { id: 11, title: 'Toy Story', year: 1995, genres: ['Animation', 'Comedy', 'Adventure'], rating: 8.3, keywords: ['toys', 'friendship', 'family', 'journey'] },
  { id: 12, title: 'Spirited Away', year: 2001, genres: ['Animation', 'Adventure', 'Fantasy'], rating: 8.6, keywords: ['spirits', 'magic', 'journey', 'family'] },
  { id: 13, title: 'The Lion King', year: 1994, genres: ['Animation', 'Drama', 'Adventure'], rating: 8.5, keywords: ['kingdom', 'family', 'betrayal', 'journey'] },
  { id: 14, title: 'Finding Nemo', year: 2003, genres: ['Animation', 'Adventure', 'Comedy'], rating: 8.2, keywords: ['ocean', 'family', 'journey', 'friendship'] },
  { id: 15, title: 'The Silence of the Lambs', year: 1991, genres: ['Crime', 'Thriller', 'Horror'], rating: 8.6, keywords: ['serial-killer', 'fbi', 'psychological', 'dark'] },
  { id: 16, title: 'Se7en', year: 1995, genres: ['Crime', 'Thriller', 'Drama'], rating: 8.6, keywords: ['serial-killer', 'detective', 'twist', 'dark'] },
  { id: 17, title: 'The Shining', year: 1980, genres: ['Horror', 'Thriller'], rating: 8.4, keywords: ['hotel', 'isolation', 'haunted', 'psychological'] },
  { id: 18, title: 'Get Out', year: 2017, genres: ['Horror', 'Thriller'], rating: 7.7, keywords: ['twist', 'psychological', 'suburbia', 'secrets'] },
  { id: 19, title: 'A Quiet Place', year: 2018, genres: ['Horror', 'Sci-Fi', 'Thriller'], rating: 7.5, keywords: ['silence', 'family', 'monsters', 'survival'] },
  { id: 20, title: 'Titanic', year: 1997, genres: ['Romance', 'Drama'], rating: 7.9, keywords: ['ship', 'love', 'disaster', 'class'] },
  { id: 21, title: 'La La Land', year: 2016, genres: ['Romance', 'Comedy', 'Drama'], rating: 8.0, keywords: ['music', 'dreams', 'love', 'hollywood'] },
  { id: 22, title: 'The Notebook', year: 2004, genres: ['Romance', 'Drama'], rating: 7.8, keywords: ['love', 'memory', 'summer', 'letters'] },
  { id: 23, title: 'Superbad', year: 2007, genres: ['Comedy'], rating: 7.6, keywords: ['teenagers', 'friendship', 'party', 'chaos'] },
  { id: 24, title: 'The Hangover', year: 2009, genres: ['Comedy'], rating: 7.7, keywords: ['vegas', 'friends', 'party', 'chaos'] },
  { id: 25, title: 'Mad Max: Fury Road', year: 2015, genres: ['Action', 'Adventure', 'Sci-Fi'], rating: 8.1, keywords: ['desert', 'chase', 'survival', 'dystopia'] },
  { id: 26, title: 'Gladiator', year: 2000, genres: ['Action', 'Adventure', 'Drama'], rating: 8.5, keywords: ['rome', 'revenge', 'arena', 'empire'] },
  { id: 27, title: 'Avengers: Endgame', year: 2019, genres: ['Action', 'Adventure', 'Sci-Fi'], rating: 8.4, keywords: ['superhero', 'time', 'sacrifice', 'team'] },
  { id: 28, title: 'Blade Runner 2049', year: 2017, genres: ['Sci-Fi', 'Drama', 'Thriller'], rating: 8.0, keywords: ['replicants', 'dystopia', 'identity', 'future'] },
  { id: 29, title: 'Parasite', year: 2019, genres: ['Thriller', 'Drama', 'Comedy'], rating: 8.5, keywords: ['class', 'family', 'twist', 'inequality'] },
  { id: 30, title: 'Memento', year: 2000, genres: ['Thriller', 'Mystery'], rating: 8.4, keywords: ['memory', 'nonlinear', 'revenge', 'twist'] },
  { id: 31, title: 'The Prestige', year: 2006, genres: ['Drama', 'Thriller', 'Sci-Fi'], rating: 8.5, keywords: ['magicians', 'rivalry', 'twist', 'obsession'] },
  { id: 32, title: 'Coco', year: 2017, genres: ['Animation', 'Adventure', 'Comedy'], rating: 8.4, keywords: ['music', 'family', 'afterlife', 'memory'] },
  { id: 33, title: 'Whiplash', year: 2014, genres: ['Drama', 'Music'], rating: 8.5, keywords: ['music', 'obsession', 'ambition', 'drummer'] },
  { id: 34, title: 'Jurassic Park', year: 1993, genres: ['Adventure', 'Sci-Fi', 'Thriller'], rating: 8.2, keywords: ['dinosaurs', 'survival', 'island', 'science'] }
];

// Movies shown in "Top Rated Movies" on the home page (mock only).
const MOCK_TOP_MOVIE_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

// Dashboard data. The Flask /api/analytics endpoint should return this same shape.
const MOCK_ANALYTICS = {
  summary: { totalMovies: 4000, totalUsers: 6000, totalRatings: 1000209, averageRating: 3.6 },
  genreCounts: {
    labels: ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'],
    values: [503, 283, 105, 1200, 211, 1603, 343, 471, 276, 492]
  },
  ratingsDistribution: {
    labels: ['1 star', '2 stars', '3 stars', '4 stars', '5 stars'],
    values: [56174, 107557, 261197, 348971, 226310]
  },
  averageRatingByYear: {
    labels: ['1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999', '2000'],
    values: [3.52, 3.55, 3.5, 3.58, 3.6, 3.62, 3.59, 3.55, 3.52, 3.5, 3.48]
  },
  topRatedMovies: {
    labels: ['The Shawshank Redemption', 'The Godfather', 'The Usual Suspects', "Schindler's List", 'Raiders of the Lost Ark', 'Rear Window', 'Star Wars', 'Casablanca'],
    values: [4.55, 4.52, 4.52, 4.51, 4.48, 4.48, 4.45, 4.41]
  },
  ratingsByYear: {
    labels: ['2000', '2001', '2002', '2003'],
    values: [904757, 68058, 24046, 3348]
  }
};


/* ==========================================================================
   3. MOCK BACKEND
   Mimics what the Flask server will do: TF-IDF vectors + cosine similarity.
   ========================================================================== */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockDelay() {
  await wait(API_CONFIG.MOCK_DELAY_MS);
  if (API_CONFIG.SIMULATE_ERROR) throw new Error('Simulated network error');
}

// Remove the mock-only "keywords" field so mock responses look like real API responses.
function toPublicMovie(movie) {
  const { keywords, ...publicMovie } = movie;
  return publicMovie;
}

// Each movie becomes a document of tokens: its genres plus its keywords.
function buildTfIdfVectors(movies) {
  const documents = movies.map((movie) => [...movie.genres, ...movie.keywords].map((t) => t.toLowerCase()));
  const documentFrequency = {};
  documents.forEach((tokens) => {
    new Set(tokens).forEach((token) => { documentFrequency[token] = (documentFrequency[token] || 0) + 1; });
  });

  const vectors = new Map();
  documents.forEach((tokens, index) => {
    const counts = {};
    tokens.forEach((token) => { counts[token] = (counts[token] || 0) + 1; });
    const vector = {};
    Object.keys(counts).forEach((token) => {
      const termFrequency = counts[token] / tokens.length;
      const inverseDocFrequency = Math.log(movies.length / documentFrequency[token]) + 1;
      vector[token] = termFrequency * inverseDocFrequency;
    });
    vectors.set(movies[index].id, vector);
  });
  return vectors;
}

function cosineSimilarity(vectorA, vectorB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  Object.keys(vectorA).forEach((token) => {
    normA += vectorA[token] ** 2;
    if (vectorB[token]) dotProduct += vectorA[token] * vectorB[token];
  });
  Object.keys(vectorB).forEach((token) => { normB += vectorB[token] ** 2; });
  return normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

const MOCK_VECTORS = buildTfIdfVectors(MOCK_MOVIES);

function findMockMovie(movieId) {
  return MOCK_MOVIES.find((movie) => String(movie.id) === String(movieId));
}

function mockSearchMovies(query, filters) {
  const text = query.trim().toLowerCase();
  return MOCK_MOVIES
    .filter((movie) => !text || movie.title.toLowerCase().includes(text))
    .filter((movie) => !filters.genre || movie.genres.includes(filters.genre))
    .filter((movie) => !filters.year || String(movie.year) === String(filters.year))
    .map(toPublicMovie);
}

function mockGetRecommendations(movieId, limit = 8) {
  const target = findMockMovie(movieId);
  if (!target) throw new Error('Movie not found');

  const targetVector = MOCK_VECTORS.get(target.id);
  const ranked = MOCK_MOVIES
    .filter((movie) => movie.id !== target.id)
    .map((movie) => ({ movie, score: cosineSimilarity(targetVector, MOCK_VECTORS.get(movie.id)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Display scaling for the demo only: the best match is shown near 97%.
  // The real Flask version can return the raw cosine score x 100 instead.
  const bestScore = ranked[0] ? ranked[0].score || 1 : 1;
  return ranked.map(({ movie, score }) => ({
    ...toPublicMovie(movie),
    similarity: Math.round((97 * score) / bestScore)
  }));
}

// ---- helpers for the mock drill-down (year -> month -> day) -----------------
function seededRandom(text) {
  let seed = 0;
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Splits a total into `parts` uneven but repeatable shares that add up exactly.
function distribute(total, parts, seedText) {
  const random = seededRandom(seedText);
  const weights = Array.from({ length: parts }, () => 0.5 + random());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - shares.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % parts, remainder--) shares[i]++;
  return shares;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function mockDrillDown(level, year, month) {
  const { labels, values } = MOCK_ANALYTICS.ratingsByYear;
  if (level === 'year') {
    return labels.map((label, i) => ({ label, ratings: values[i] }));
  }

  const yearTotal = values[labels.indexOf(String(year))];
  if (yearTotal === undefined) throw new Error('No data for that year');
  const monthTotals = distribute(yearTotal, 12, `months-${year}`);
  if (level === 'month') {
    return monthTotals.map((ratings, i) => ({ label: MONTH_NAMES[i], ratings }));
  }

  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const dayTotals = distribute(monthTotals[Number(month) - 1], daysInMonth, `days-${year}-${month}`);
  return dayTotals.map((ratings, i) => ({ label: `${MONTH_NAMES[Number(month) - 1].slice(0, 3)} ${i + 1}, ${year}`, ratings }));
}


/* ==========================================================================
   4. API FUNCTIONS
   Every page calls ONLY these functions. To connect Flask, set
   API_CONFIG.USE_MOCK_DATA = false. Each function shows the endpoint it calls.
   ========================================================================== */
async function apiGet(path) {
  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`);
  if (!response.ok) throw new Error(`The server answered with status ${response.status}.`);
  return response.json();
}

// GET /api/movies   ->  [ { id, title, year, genres: [], rating }, ... ]
let allMoviesRequest = null;
function getAllMovies() {
  if (!allMoviesRequest) {
    allMoviesRequest = (async () => {
      if (API_CONFIG.USE_MOCK_DATA) {
        await mockDelay();
        return MOCK_MOVIES.map(toPublicMovie);
      }
      return apiGet('/movies');
    })();
    allMoviesRequest.catch(() => { allMoviesRequest = null; }); // allow a retry after an error
  }
  return allMoviesRequest;
}

// GET /api/movies/search?q=inception&genre=Sci-Fi&year=2010   ->  [ movie, ... ]
async function searchMovies(query, filters = {}) {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    return mockSearchMovies(query, filters);
  }
  const params = new URLSearchParams({ q: query });
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.year) params.set('year', filters.year);
  return apiGet(`/movies/search?${params.toString()}`);
}

// GET /api/movies/<id>   ->  { id, title, year, genres: [], rating }
async function getMovieDetails(movieId) {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    const movie = findMockMovie(movieId);
    if (!movie) throw new Error('We could not find that movie.');
    return toPublicMovie(movie);
  }
  return apiGet(`/movies/${encodeURIComponent(movieId)}`);
}

// GET /api/recommendations/<id>   ->  [ { id, title, year, genres, rating, similarity: 0-100 }, ... ]
async function getRecommendations(movieId) {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    return mockGetRecommendations(movieId);
  }
  return apiGet(`/recommendations/${encodeURIComponent(movieId)}`);
}

// GET /api/top-movies   ->  [ movie, ... ]   (highest rated first)
async function getTopMovies() {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    return MOCK_TOP_MOVIE_IDS
      .map((id) => toPublicMovie(findMockMovie(id)))
      .sort((a, b) => b.rating - a.rating);
  }
  return apiGet('/top-movies');
}

// GET /api/analytics   ->  same shape as MOCK_ANALYTICS above
async function getAnalytics() {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    return MOCK_ANALYTICS;
  }
  return apiGet('/analytics');
}

// GET /api/olap/drilldown?level=day&year=2000&month=3   ->  [ { label, ratings }, ... ]
// (Optional endpoint. Roll-up, slice and dice are calculated in the browser from /api/movies.)
async function getDrillDown(level, year, month) {
  if (API_CONFIG.USE_MOCK_DATA) {
    await mockDelay();
    return mockDrillDown(level, year, month);
  }
  const params = new URLSearchParams({ level, year, month });
  return apiGet(`/olap/drilldown?${params.toString()}`);
}


/* ==========================================================================
   5. UI HELPERS
   ========================================================================== */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function formatGenres(genres) {
  return Array.isArray(genres) ? genres.join(', ') : String(genres);
}

// Builds a poster. Uses movie.posterUrl when the backend provides one,
// otherwise draws a gradient placeholder (8 colour variants chosen by id).
function posterMarkup(movie) {
  const title = escapeHtml(movie.title);
  if (movie.posterUrl) {
    return `<div class="poster"><img src="${escapeHtml(movie.posterUrl)}" alt="Poster of ${title}" loading="lazy"></div>`;
  }
  const tone = (Number(movie.id) || 0) % 8;
  return `<div class="poster poster--g${tone}" role="img" aria-label="Poster placeholder for ${title}">
      <i class="fa-solid fa-film poster-icon" aria-hidden="true"></i>
      <span class="poster-title">${title}</span>
    </div>`;
}

// One reusable card for search results, top movies and recommendations.
// Pass { similarity: 92 } to add the similarity bar.
function createMovieCard(movie, options = {}) {
  const hasSimilarity = typeof options.similarity === 'number';
  const similarityBlock = hasSimilarity
    ? `<div class="similarity">
         <div class="similarity-label"><span>Similarity</span><strong>${options.similarity}%</strong></div>
         <progress class="meter" max="100" value="0" data-value="${options.similarity}" aria-label="Similarity ${options.similarity} percent"></progress>
       </div>`
    : '';

  return `<article class="movie-card">
      <div class="movie-poster">${posterMarkup(movie)}</div>
      <div class="movie-card-body">
        <h3 class="movie-title">${escapeHtml(movie.title)}</h3>
        <p class="movie-meta">${escapeHtml(movie.year)} • ${escapeHtml(formatGenres(movie.genres))}</p>
        <p class="movie-rating"><i class="fa-solid fa-star" aria-hidden="true"></i> ${Number(movie.rating).toFixed(1)}</p>
        ${similarityBlock}
        <a class="btn btn-outline btn-sm" href="recommendations.html?movie=${encodeURIComponent(movie.id)}" data-movie-id="${escapeHtml(movie.id)}">Recommend Similar</a>
      </div>
    </article>`;
}

// Fills the similarity bars after the cards are on screen so the bars animate.
function animateMeters(container) {
  const meters = container.querySelectorAll('progress[data-value]');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      meters.forEach((meter) => { meter.value = Number(meter.dataset.value); });
    });
  });
}

// cardOptions is an optional function: (movie) => ({ similarity: 90 })
function renderCards(container, movies, cardOptions) {
  container.setAttribute('aria-busy', 'false');
  container.innerHTML = movies.map((movie) => createMovieCard(movie, cardOptions ? cardOptions(movie) : {})).join('');
  animateMeters(container);
}

function renderSkeletonCards(container, count = 6) {
  container.setAttribute('aria-busy', 'true');
  container.innerHTML = Array.from({ length: count }, () => `
    <div class="movie-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-poster"></div>
      <div class="movie-card-body">
        <div class="skeleton skeleton-line skeleton-line--wide"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-line--short"></div>
      </div>
    </div>`).join('');
}

function renderState(container, { icon, message, detail = '', actionHtml = '' }) {
  container.setAttribute('aria-busy', 'false');
  container.innerHTML = `<div class="state">
      <i class="fa-solid ${icon} state-icon" aria-hidden="true"></i>
      <p class="state-message">${escapeHtml(message)}</p>
      ${detail ? `<p class="state-detail">${escapeHtml(detail)}</p>` : ''}
      ${actionHtml}
    </div>`;
}

function renderEmpty(container, message = 'No movies found. Try another search.', detail = '') {
  renderState(container, { icon: 'fa-magnifying-glass', message, detail });
}

function renderError(container, error, onRetry) {
  renderState(container, {
    icon: 'fa-triangle-exclamation',
    message: 'Something went wrong.',
    detail: (error && error.message) || 'Please try again.',
    actionHtml: onRetry ? '<button type="button" class="btn btn-outline btn-sm" data-retry>Try again</button>' : ''
  });
  const retryButton = container.querySelector('[data-retry]');
  if (retryButton && onRetry) retryButton.addEventListener('click', onRetry);
}

function fillSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function uniqueGenres(movies) {
  return [...new Set(movies.flatMap((movie) => movie.genres))].sort();
}

function uniqueYears(movies) {
  return [...new Set(movies.map((movie) => movie.year))].sort((a, b) => b - a);
}

// Search-as-you-type dropdown. Works with mouse, arrow keys, Enter and Escape.
// Returns { close } so the page can hide the list when a form is submitted.
function attachSuggestions(input, list, onSelect) {
  let results = [];
  let activeIndex = -1;
  let requestId = 0;

  const close = () => {
    requestId++;
    list.hidden = true;
    list.innerHTML = '';
    results = [];
    activeIndex = -1;
  };

  const setActive = (index) => {
    activeIndex = index;
    list.querySelectorAll('.suggestion').forEach((item, i) => item.classList.toggle('is-active', i === index));
  };

  const choose = (index) => {
    const movie = results[index];
    if (!movie) return;
    close();
    onSelect(movie);
  };

  const refresh = async () => {
    const query = input.value.trim();
    if (query.length < 2) { close(); return; }
    const currentRequest = ++requestId;
    try {
      const matches = (await searchMovies(query)).slice(0, 6);
      if (currentRequest !== requestId) return; // a newer keystroke replaced this request
      results = matches;
      activeIndex = -1;
      list.innerHTML = matches.length
        ? matches.map((movie, i) => `<li class="suggestion" role="option" data-index="${i}"><span>${escapeHtml(movie.title)}</span><span class="suggestion-meta">${escapeHtml(movie.year)}</span></li>`).join('')
        : '<li class="suggestion-empty">No matches found</li>';
      list.hidden = false;
    } catch (error) {
      close();
    }
  };

  input.addEventListener('input', debounce(refresh, 250));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { close(); return; }
    if (list.hidden || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(activeIndex);
    }
  });

  list.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.suggestion');
    if (!item) return;
    event.preventDefault();
    choose(Number(item.dataset.index));
  });

  document.addEventListener('click', (event) => {
    if (event.target !== input && !list.contains(event.target)) close();
  });

  return { close };
}


/* ==========================================================================
   6. SHARED BEHAVIOUR (every page)
   ========================================================================== */
function initNavigation() {
  const header = document.getElementById('siteHeader');
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  const backdrop = document.getElementById('drawerBackdrop');
  const menuIcon = menuToggle.querySelector('i');

  // Highlight the link for the current page.
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
  });

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-visible', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuIcon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    document.body.classList.toggle('no-scroll', open);
  };

  menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setMenu(false));
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 900) setMenu(false); });

  // Glass background appears once the page is scrolled.
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

function initNavSearch() {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navSearchToggle');
  const panel = document.getElementById('navSearch');
  const form = document.getElementById('navSearchForm');
  const input = document.getElementById('navSearchInput');
  const list = document.getElementById('navSuggestions');

  const setPanel = (open) => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('has-panel', open);
    if (open) input.focus();
  };

  toggle.addEventListener('click', () => setPanel(panel.hidden));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) setPanel(false); });

  // Choosing a suggestion opens its recommendations.
  attachSuggestions(input, list, (movie) => {
    window.location.href = `recommendations.html?movie=${encodeURIComponent(movie.id)}`;
  });

  // Pressing Enter without choosing a suggestion runs a full search on the home page.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (query) window.location.href = `index.html?q=${encodeURIComponent(query)}#search`;
  });
}


/* ==========================================================================
   7. HOME PAGE
   ========================================================================== */
async function buildHeroWall() {
  const wall = document.getElementById('heroWall');
  try {
    const movies = await getAllMovies();
    const columns = [[], [], []];
    movies.forEach((movie, i) => columns[i % 3].push(movie));
    // Each column is written twice so the scrolling loop has no visible jump.
    wall.innerHTML = columns.map((column) => {
      const posters = column.map((movie) => `<div class="wall-poster">${posterMarkup(movie)}</div>`).join('');
      return `<div class="wall-col">${posters}${posters}</div>`;
    }).join('');
  } catch (error) {
    wall.innerHTML = ''; // the wall is decorative, so fail silently
  }
}

async function loadTopMovies() {
  const grid = document.getElementById('topMoviesGrid');
  renderSkeletonCards(grid, 8);
  try {
    renderCards(grid, await getTopMovies());
  } catch (error) {
    renderError(grid, error, loadTopMovies);
  }
}

function initSearchSection() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const genreFilter = document.getElementById('genreFilter');
  const yearFilter = document.getElementById('yearFilter');
  const suggestionList = document.getElementById('searchSuggestions');
  const status = document.getElementById('searchStatus');
  const results = document.getElementById('searchResults');
  let latestSearch = 0;

  function showSearchHint() {
    status.textContent = '';
    renderState(results, {
      icon: 'fa-clapperboard',
      message: 'Type a title or choose a genre to start.',
      detail: 'Try one of these:',
      actionHtml: `<div class="chip-row">
          <button type="button" class="chip" data-example="Inception">Inception</button>
          <button type="button" class="chip" data-example="The Matrix">The Matrix</button>
          <button type="button" class="chip" data-example="Toy Story">Toy Story</button>
        </div>`
    });
  }

  async function runSearch() {
    const query = input.value.trim();
    const filters = { genre: genreFilter.value, year: yearFilter.value };
    if (!query && !filters.genre && !filters.year) { showSearchHint(); return; }

    const thisSearch = ++latestSearch;
    status.textContent = 'Searching...';
    renderSkeletonCards(results, 4);
    try {
      const movies = await searchMovies(query, filters);
      if (thisSearch !== latestSearch) return;
      if (!movies.length) {
        status.textContent = '';
        renderEmpty(results);
        return;
      }
      status.textContent = `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} found`;
      renderCards(results, movies);
    } catch (error) {
      if (thisSearch !== latestSearch) return;
      status.textContent = '';
      renderError(results, error, runSearch);
    }
  }

  const suggestions = attachSuggestions(input, suggestionList, (movie) => {
    input.value = movie.title;
    runSearch();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    suggestions.close();
    runSearch();
  });
  genreFilter.addEventListener('change', runSearch);
  yearFilter.addEventListener('change', runSearch);
  results.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-example]');
    if (!chip) return;
    input.value = chip.dataset.example;
    runSearch();
  });

  // Fill the genre and year dropdowns from the movie list.
  getAllMovies()
    .then((movies) => {
      fillSelect(genreFilter, uniqueGenres(movies));
      fillSelect(yearFilter, uniqueYears(movies));
    })
    .catch(() => { /* dropdowns stay on "All"; search still works */ });

  // Support links like index.html?q=inception#search (used by the navbar search).
  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) input.value = initialQuery;
  runSearch();
}

function initHome() {
  buildHeroWall();
  loadTopMovies();
  initSearchSection();
}


/* ==========================================================================
   START
   ========================================================================== */
initNavigation();
initNavSearch();
if (document.body.dataset.page === 'home') initHome();
