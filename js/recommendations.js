'use strict';

/* ==========================================================================
   CineSuggest — recommendations.js
   Needs main.js (API functions and UI helpers) to be loaded first.
   Flow: pick a movie -> getMovieDetails() + getRecommendations() -> render.
   ========================================================================== */

const pickerForm = document.getElementById('pickerForm');
const pickerInput = document.getElementById('pickerInput');
const pickerSuggestionList = document.getElementById('pickerSuggestions');
const quickPicks = document.getElementById('quickPicks');
const selectedBox = document.getElementById('selectedMovie');
const recommendationGrid = document.getElementById('recommendationGrid');
const recommendationNote = document.getElementById('recommendationNote');
const selectedSection = document.getElementById('selectedSection');

let latestSelection = 0; // lets us ignore answers that arrive after a newer pick

function renderSelectedSkeleton() {
  selectedBox.innerHTML = '<div class="skeleton skeleton-block" aria-hidden="true"></div>';
}

function renderSelectedMovie(movie) {
  const genreTags = movie.genres.map((genre) => `<li class="genre-tag">${escapeHtml(genre)}</li>`).join('');
  selectedBox.innerHTML = `
    <article class="selected-card glass">
      <div class="selected-poster">${posterMarkup(movie)}</div>
      <div>
        <h3 class="selected-title">${escapeHtml(movie.title)}</h3>
        <div class="meta-row">
          <span class="pill">${escapeHtml(movie.year)}</span>
          <span class="movie-rating"><i class="fa-solid fa-star" aria-hidden="true"></i> ${Number(movie.rating).toFixed(1)}</span>
        </div>
        <ul class="genre-list">${genreTags}</ul>
        <p class="selected-note">The movies below share the most genres and keywords with this title.</p>
      </div>
    </article>`;
}

function showStartState() {
  renderState(selectedBox, {
    icon: 'fa-film',
    message: 'No movie selected yet.',
    detail: 'Search for a title above to see its details here.'
  });
  renderState(recommendationGrid, {
    icon: 'fa-wand-magic-sparkles',
    message: 'Recommendations will appear here.',
    detail: 'Choose a movie and CineSuggest will find similar ones.'
  });
  recommendationNote.textContent = '';
}

async function selectMovie(movieId, { updateUrl = true } = {}) {
  const thisSelection = ++latestSelection;
  renderSelectedSkeleton();
  renderSkeletonCards(recommendationGrid, 8);
  recommendationNote.textContent = '';

  try {
    // Both requests run at the same time.
    const [movie, recommendations] = await Promise.all([
      getMovieDetails(movieId),
      getRecommendations(movieId)
    ]);
    if (thisSelection !== latestSelection) return;

    renderSelectedMovie(movie);
    document.title = `Recommendations for ${movie.title} — CineSuggest`;
    if (updateUrl) window.history.replaceState(null, '', `?movie=${encodeURIComponent(movie.id)}`);

    if (!recommendations.length) {
      renderEmpty(recommendationGrid, 'No similar movies found.', 'Try a different title.');
      return;
    }
    renderCards(recommendationGrid, recommendations, (item) => ({ similarity: Math.round(item.similarity) }));
    recommendationNote.textContent = `Top ${recommendations.length} matches ranked by TF-IDF and cosine similarity.`;
  } catch (error) {
    if (thisSelection !== latestSelection) return;
    renderError(selectedBox, error, () => selectMovie(movieId, { updateUrl }));
    renderState(recommendationGrid, {
      icon: 'fa-circle-exclamation',
      message: 'Recommendations are unavailable.',
      detail: 'They appear once the selected movie loads.'
    });
  }
}

// Finds the best match for typed text and selects it.
async function selectFromQuery(query) {
  const text = query.trim();
  if (!text) return;

  const thisSelection = ++latestSelection;
  renderSelectedSkeleton();
  try {
    const matches = await searchMovies(text);
    if (thisSelection !== latestSelection) return;
    if (!matches.length) {
      renderEmpty(selectedBox);
      renderState(recommendationGrid, { icon: 'fa-wand-magic-sparkles', message: 'Recommendations will appear here.' });
      recommendationNote.textContent = '';
      return;
    }
    const exactMatch = matches.find((movie) => movie.title.toLowerCase() === text.toLowerCase());
    selectMovie((exactMatch || matches[0]).id);
  } catch (error) {
    if (thisSelection !== latestSelection) return;
    renderError(selectedBox, error, () => selectFromQuery(text));
  }
}

const pickerSuggestions = attachSuggestions(pickerInput, pickerSuggestionList, (movie) => {
  pickerInput.value = movie.title;
  selectMovie(movie.id);
});

pickerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  pickerSuggestions.close();
  selectFromQuery(pickerInput.value);
});

quickPicks.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-title]');
  if (!chip) return;
  pickerInput.value = chip.dataset.title;
  selectFromQuery(chip.dataset.title);
});

// "Recommend Similar" on a recommended card re-runs the page for that movie without a reload.
recommendationGrid.addEventListener('click', (event) => {
  const link = event.target.closest('[data-movie-id]');
  if (!link) return;
  event.preventDefault();
  selectMovie(link.dataset.movieId);
  selectedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Page start: open ?movie=<id> if present (this is how "Recommend Similar" links arrive here).
const movieIdFromUrl = new URLSearchParams(window.location.search).get('movie');
if (movieIdFromUrl) {
  selectMovie(movieIdFromUrl, { updateUrl: false });
} else {
  showStartState();
}
