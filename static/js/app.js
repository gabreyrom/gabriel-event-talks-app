// Global state
let allUpdates = [];
let filteredUpdates = [];
let currentFeedTitle = 'BigQuery Release Notes';
let lastFetchedTime = null;

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const emptyState = document.getElementById('empty-state');
const retryBtn = document.getElementById('retry-btn');
const refreshBtn = document.getElementById('refresh-btn');
const syncIcon = document.querySelector('.sync-icon');
const lastSyncTimeEl = document.getElementById('last-sync-time');

// Filter Elements
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const sortFilter = document.getElementById('sort-filter');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statChanges = document.getElementById('stat-changes');
const statDeprecations = document.getElementById('stat-deprecations');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const submitTweetBtn = document.getElementById('submit-tweet-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const toastContainer = document.getElementById('toast-container');

// SVG Circle Constants for character counter progress
const CIRCLE_RADIUS = 10;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~62.83

/* --- BOOTSTRAP / INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    // Set up progress ring
    if (progressCircle) {
        progressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
        progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    }
    
    fetchReleaseNotes();
    setupEventListeners();
});

/* --- API CALLS --- */
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading();
    
    if (forceRefresh) {
        syncIcon.classList.add('spinning');
        refreshBtn.disabled = true;
    }

    try {
        const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const feedData = result.data;
            currentFeedTitle = feedData.title || 'BigQuery Release Notes';
            lastFetchedTime = feedData.fetched_at;
            
            // Process and parse raw entries into distinct update cards
            allUpdates = parseFeedEntries(feedData.entries);
            filteredUpdates = [...allUpdates];
            
            updateLastSyncTime();
            updateStats();
            renderUpdates();
            
            if (forceRefresh) {
                showToast('Release notes refreshed successfully!', 'success');
            }
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (err) {
        console.error('Error fetching release notes:', err);
        showError(err.message);
        showToast('Failed to retrieve release notes.', 'error');
    } finally {
        hideLoading();
        syncIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

/* --- FEED PARSING LOGIC --- */
function parseFeedEntries(entries) {
    const parsedUpdates = [];
    
    entries.forEach(entry => {
        const dateStr = entry.title; // e.g. "July 01, 2026"
        const link = entry.link;
        const rawContent = entry.content;
        
        if (!rawContent) return;
        
        // Use DOMParser to split entry by <h3> tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');
        
        const nodes = Array.from(doc.body.childNodes);
        let currentUpdate = null;
        let updateIndex = 0;
        
        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                if (tagName === 'h3') {
                    // Save previous update if exists
                    if (currentUpdate) {
                        parsedUpdates.push(currentUpdate);
                        updateIndex++;
                    }
                    
                    const typeText = node.textContent.trim();
                    currentUpdate = {
                        id: `${entry.id}-${updateIndex}`,
                        date: dateStr,
                        originalLink: link,
                        type: normalizeUpdateType(typeText),
                        html: '',
                        text: ''
                    };
                } else {
                    if (!currentUpdate) {
                        // Create a default group if text appears before any h3
                        currentUpdate = {
                            id: `${entry.id}-${updateIndex}`,
                            date: dateStr,
                            originalLink: link,
                            type: 'General',
                            html: '',
                            text: ''
                        };
                    }
                    currentUpdate.html += node.outerHTML;
                    currentUpdate.text += node.textContent + ' ';
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                const textVal = node.textContent.trim();
                if (textVal) {
                    if (!currentUpdate) {
                        currentUpdate = {
                            id: `${entry.id}-${updateIndex}`,
                            date: dateStr,
                            originalLink: link,
                            type: 'General',
                            html: '',
                            text: ''
                        };
                    }
                    currentUpdate.html += textVal;
                    currentUpdate.text += textVal + ' ';
                }
            }
        });
        
        // Push final update for this entry
        if (currentUpdate) {
            parsedUpdates.push(currentUpdate);
        }
    });
    
    // Clean up texts
    parsedUpdates.forEach(update => {
        update.text = update.text.replace(/\s+/g, ' ').trim();
    });
    
    return parsedUpdates;
}

function normalizeUpdateType(typeStr) {
    const lower = typeStr.toLowerCase();
    if (lower.includes('feature')) return 'Feature';
    if (lower.includes('change') || lower.includes('update')) return 'Changed';
    if (lower.includes('deprecat')) return 'Deprecated';
    if (lower.includes('fix') || lower.includes('resolved')) return 'Fixed';
    return 'General';
}

/* --- UI RENDERING & FILTERING --- */
function renderUpdates() {
    // Clear feed list (except status displays)
    const cardElements = feedContainer.querySelectorAll('.release-card');
    cardElements.forEach(el => el.remove());
    
    if (filteredUpdates.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        card.className = 'release-card glass';
        card.dataset.id = update.id;
        
        const badgeClass = `badge-${update.type.toLowerCase()}`;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="badge ${badgeClass}">
                    <span class="badge-icon"></span>
                    ${update.type}
                </span>
                <span class="release-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    ${update.date}
                </span>
            </div>
            <div class="card-content">
                ${update.html}
            </div>
            <div class="card-actions">
                <a href="${update.originalLink}" target="_blank" rel="noopener" class="btn btn-card" title="View official release documentation">
                    <span>Source Docs</span>
                </a>
                <button class="btn btn-card btn-tweet-action" title="Tweet this update">
                    <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add click listener for Tweet button
        const tweetBtn = card.querySelector('.btn-tweet-action');
        tweetBtn.addEventListener('click', () => openTweetModal(update));
        
        feedContainer.appendChild(card);
    });
}

function applyFilters() {
    const searchVal = searchInput.value.toLowerCase().trim();
    const typeVal = typeFilter.value;
    const sortVal = sortFilter.value;
    
    filteredUpdates = allUpdates.filter(update => {
        // Search text matching
        const matchesSearch = !searchVal || 
            update.text.toLowerCase().includes(searchVal) || 
            update.date.toLowerCase().includes(searchVal) ||
            update.type.toLowerCase().includes(searchVal);
            
        // Type filter matching
        const matchesType = typeVal === 'all' || update.type.toLowerCase() === typeVal;
        
        return matchesSearch && matchesType;
    });
    
    // Sort logic
    filteredUpdates.sort((a, b) => {
        // Date parsing (we can approximate parse date strings like "July 01, 2026")
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (sortVal === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    renderUpdates();
}

/* --- STATE TRANSITIONS & UTILS --- */
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    emptyState.classList.add('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

function showError(msg) {
    loadingIndicator.classList.add('hidden');
    emptyState.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    errorText.textContent = msg || 'There was a problem retrieving data from the server.';
}

function updateLastSyncTime() {
    if (!lastFetchedTime) return;
    const date = new Date(lastFetchedTime * 1000);
    lastSyncTimeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateStats() {
    const total = allUpdates.length;
    const features = allUpdates.filter(u => u.type === 'Feature').length;
    const changes = allUpdates.filter(u => u.type === 'Changed' || u.type === 'Fixed').length;
    const deprecations = allUpdates.filter(u => u.type === 'Deprecated').length;
    
    animateValue(statTotal, parseInt(statTotal.textContent) || 0, total, 800);
    animateValue(statFeatures, parseInt(statFeatures.textContent) || 0, features, 800);
    animateValue(statChanges, parseInt(statChanges.textContent) || 0, changes, 800);
    animateValue(statDeprecations, parseInt(statDeprecations.textContent) || 0, deprecations, 800);
}

// Custom animation for counting numbers in dashboard stats
function animateValue(obj, start, end, duration) {
    if (start === end) {
        obj.textContent = end;
        return;
    }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.textContent = end;
        }
    };
    window.requestAnimationFrame(step);
}

/* --- TWEET COMPOSER SYSTEM --- */
let activeHashtags = ['#BigQuery', '#GoogleCloud'];

function openTweetModal(update) {
    // Generate initial tweet content
    // X links count as 23 characters.
    // Let's build a text:
    const prefix = `📢 BigQuery Update (${update.date}):\n`;
    const hashtagsText = `\n\n${activeHashtags.join(' ')}`;
    const linkText = `\n${update.originalLink}`;
    
    // We want the snippet to fit comfortably.
    // Limit: 280 - (prefix.length + hashtagsText.length + 23 [fixed link length])
    // Note that JavaScript string length is fine for local character counting. We use X's 23 char policy for links.
    const overhead = prefix.length + hashtagsText.length + 23;
    const maxSnippetLen = 280 - overhead;
    
    let snippet = update.text;
    if (snippet.length > maxSnippetLen) {
        snippet = snippet.substring(0, maxSnippetLen - 3) + '...';
    }
    
    const initialText = `${prefix}${snippet}${hashtagsText}${linkText}`;
    
    tweetTextarea.value = initialText;
    updateTweetProgress();
    
    // Set active states on hashtag badges in modal
    const tagBadges = document.querySelectorAll('.hashtag-suggestions .tag-badge');
    tagBadges.forEach(badge => {
        const tag = badge.dataset.tag;
        if (activeHashtags.includes(tag)) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    });

    // Display modal
    tweetModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function updateTweetProgress() {
    const text = tweetTextarea.value;
    
    // Calculate character length according to Twitter/X's rules:
    // Links count as 23 characters.
    // Standard URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let urlMatchCount = 0;
    let textLengthWithoutUrls = text.replace(urlRegex, () => {
        urlMatchCount++;
        return '';
    }).length;
    
    const computedLength = textLengthWithoutUrls + (urlMatchCount * 23);
    const charsRemaining = 280 - computedLength;
    
    charCounter.textContent = charsRemaining;
    
    // Update live preview
    tweetPreviewText.textContent = text;
    
    // Update progress circle indicator
    const percent = Math.min(computedLength / 280, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (percent * CIRCLE_CIRCUMFERENCE);
    progressCircle.style.strokeDashoffset = offset;
    
    // Style adjustments based on limits
    if (charsRemaining < 0) {
        charCounter.style.color = '#ef4444'; // Red
        progressCircle.style.stroke = '#ef4444';
        submitTweetBtn.disabled = true;
    } else if (charsRemaining <= 20) {
        charCounter.style.color = '#f59e0b'; // Amber warning
        progressCircle.style.stroke = '#f59e0b';
        submitTweetBtn.disabled = false;
    } else {
        charCounter.style.color = 'var(--text-secondary)';
        progressCircle.style.stroke = 'var(--color-changed)'; // Standard color
        submitTweetBtn.disabled = false;
    }
}

// Handles toggle clicking on hashtag badges inside modal
function handleHashtagToggle(badge) {
    const tag = badge.dataset.tag;
    let text = tweetTextarea.value;
    
    // We want to replace the links and hashtags correctly.
    // Let's strip existing URLs first, find the hashtags block, modify it, and re-append URLs.
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    let textNoUrls = text.replace(urlRegex, '').trim();
    
    if (activeHashtags.includes(tag)) {
        // Remove hashtag
        activeHashtags = activeHashtags.filter(t => t !== tag);
        badge.classList.remove('active');
        // Replace exact hashtag word (with potential spaces around)
        const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const tagRegex = new RegExp(`\\s*${escapedTag}\\s*`, 'g');
        textNoUrls = textNoUrls.replace(tagRegex, ' ').trim();
    } else {
        // Add hashtag
        activeHashtags.push(tag);
        badge.classList.add('active');
        // Append hashtag before links
        textNoUrls = `${textNoUrls} ${tag}`.replace(/\s+/g, ' ').trim();
    }
    
    // Re-assemble
    let finalLinkText = urls.length > 0 ? `\n${urls.join('\n')}` : '';
    tweetTextarea.value = `${textNoUrls}${finalLinkText}`;
    updateTweetProgress();
}

function submitTweet() {
    const text = tweetTextarea.value;
    if (text.length === 0) return;
    
    // Compose Twitter Web Intent URL
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    showToast('Opening X/Twitter composer...', 'info');
    window.open(twitterIntentUrl, '_blank', 'width=550,height=420,referrerpolicy=no-referrer');
    
    closeTweetModal();
}

/* --- TOAST SYSTEM --- */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg class="icon text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg class="icon" style="color: #ef4444" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else {
        iconSvg = `<svg class="icon text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

/* --- EVENT LISTENERS --- */
function setupEventListeners() {
    // Refresh & Retry Click Handlers
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Filters & Search
    searchInput.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
    
    // Modal controls
    closeModalBtn.addEventListener('click', closeTweetModal);
    cancelModalBtn.addEventListener('click', closeTweetModal);
    submitTweetBtn.addEventListener('click', submitTweet);
    tweetTextarea.addEventListener('input', updateTweetProgress);
    
    // Close modal when clicking outside the card
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });
    
    // Handle hashtag badge clicking in the modal
    const tagBadges = document.querySelectorAll('.hashtag-suggestions .tag-badge');
    tagBadges.forEach(badge => {
        badge.addEventListener('click', () => handleHashtagToggle(badge));
    });
}
