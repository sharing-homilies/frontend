import Alpine from 'alpinejs';
import { formatDate, titleCaseFirst, truncateText } from './utils.js';

window.Alpine = Alpine;
Alpine.start();

// Light switcher
const lightSwitches = document.querySelectorAll('.light-switch');
if (lightSwitches.length > 0) {
  lightSwitches.forEach((lightSwitch, i) => {
    if (localStorage.getItem('dark-mode') === 'true') {
      // eslint-disable-next-line no-param-reassign
      lightSwitch.checked = true;
    }
    lightSwitch.addEventListener('change', () => {
      const { checked } = lightSwitch;
      lightSwitches.forEach((el, n) => {
        if (n !== i) {
          // eslint-disable-next-line no-param-reassign
          el.checked = checked;
        }
      });
      if (lightSwitch.checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dark-mode', true);
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dark-mode', false);
      }
    });
  });
}

const rawApiBase = (document.documentElement.dataset.apiBase || '').trim();
const apiBase = rawApiBase && !rawApiBase.includes('%VITE_')
  ? rawApiBase
  : 'http://localhost:5000';
const grid = document.getElementById('homily-grid');
const statusEl = document.getElementById('homily-status');
const emptyEl = document.getElementById('homily-empty');
const refreshButton = document.getElementById('refresh-homilies');
const template = document.getElementById('homily-card-template');
const modal = document.getElementById('homily-modal');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalHomily = document.getElementById('modal-homily');
const modalPoints = document.getElementById('modal-points');
const modalClose = document.getElementById('modal-close');

if (grid) {
  const limit = 6; // Show 6 homilies per page
  let currentPage = 1;
  let totalPages = 1;
  let isLoading = false;
  const homilyCache = new Map();

  const buildUrl = (page = 1) => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', ((page - 1) * limit).toString());
    return `${apiBase}/web/homilies?${params.toString()}`;
  };

  const formatMeta = (item) => {
    const bits = [];
    if (item.churchName) bits.push(item.churchName);
    if (item.county) bits.push(item.county);
    if (item.date) bits.push(item.date);
    return bits.filter(Boolean).join(' • ');
  };

  const getCoverImage = (item) => {
    if (Array.isArray(item.dalle) && item.dalle.length > 0) {
      return item.dalle[0];
    }
    return './images/header-image-01.jpg';
  };

  const normalizePoints = (points) => {
    if (Array.isArray(points)) return points.filter(Boolean);
    if (typeof points === 'string') {
      return points
        .split(/\n+/)
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
    }
    return [];
  };

  const getDisplayValue = (value) => (value ? String(value) : '');

  const truncateWithEllipsis = (value, maxLength = 14) => {
    const text = String(value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const getChurchName = (value) => {
    if (!value) return '';
    const raw = String(value);
    const parts = raw.split('/').filter(Boolean);
    const name = parts.length ? parts[parts.length - 1] : raw;
    return truncateWithEllipsis(titleCaseFirst(name), 14);
  };

  const renderCards = (items, reset) => {
    if (reset) {
      // Clear existing cards immediately
      grid.innerHTML = '';
      renderNewCards(items);
    } else {
      renderNewCards(items);
    }
  };

  const renderNewCards = (items) => {
    items.forEach((item, index) => {
      homilyCache.set(item.id, item);
      const clone = template.content.cloneNode(true);
      const article = clone.querySelector('article');
      article.classList.add('homily-card-enter');

      const image = clone.querySelector('[data-homily-image]');
      image.src = getCoverImage(item);
      if (index % 2 === 0) {
        image.classList.add('-rotate-2', 'group-hover:rotate-0');
      } else {
        image.classList.add('rotate-2', 'group-hover:rotate-0');
      }
      const countyEl = clone.querySelector('[data-homily-county]');
      const dateEl = clone.querySelector('[data-homily-date]');
      const churchEl = clone.querySelector('[data-homily-church]');

      if (countyEl) countyEl.textContent = titleCaseFirst(item.county);
      if (dateEl) dateEl.textContent = formatDate(item.date);
      if (churchEl) churchEl.textContent = getChurchName(item.churchName || item.church);
      const altTitleEl = clone.querySelector('[data-homily-alt-title]');
      if (altTitleEl) altTitleEl.textContent = item.alt_title || '';
      clone.querySelector('[data-homily-summary]').textContent = truncateText(
        item.notification_summary || item.homily || item.transcript || ''
      );
      if (article) {
        article.addEventListener('click', () => {
          if (!item.id) return;
          window.location.href = `./homily.html?id=${encodeURIComponent(item.id)}`;
        });
      }
      grid.appendChild(clone);
    });
  };

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };

  const setEmptyState = (isEmpty) => {
    if (emptyEl) emptyEl.classList.toggle('hidden', !isEmpty);
  };

  const setLoadingState = (loading) => {
    isLoading = loading;
    if (refreshButton) refreshButton.disabled = loading;
    updatePaginationButtons();
  };

  const updatePaginationButtons = () => {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    // Clear existing content
    paginationContainer.innerHTML = '';

    // Only show pagination if there are multiple pages
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }

    paginationContainer.style.display = 'flex';

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.className = 'btn-sm cursor-pointer text-amber-700 dark:text-gray-200 border border-amber-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed';
    prevButton.disabled = isLoading || currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (!isLoading && currentPage > 1) {
        fetchHomilies(currentPage - 1, true);
      }
    });

    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    pageIndicator.className = 'text-sm text-gray-600 dark:text-gray-400';

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.className = 'btn-sm cursor-pointer text-amber-700 dark:text-gray-200 border border-amber-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed';
    nextButton.disabled = isLoading || currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (!isLoading && currentPage < totalPages) {
        fetchHomilies(currentPage + 1, true);
      }
    });

    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageIndicator);
    paginationContainer.appendChild(nextButton);
  };

  const fetchHomilies = async (page = 1, reset = false) => {
    setLoadingState(true);
    setStatus('Loading homilies…');
    try {
      const url = buildUrl(page);
      console.log('Fetching from:', url);
      const response = await fetch(url);
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const payload = await response.json();
      console.log('API response:', payload);
      const items = Array.isArray(payload.data) ? payload.data : [];
      const total = payload.total || 0;
      
      totalPages = Math.max(1, Math.ceil(total / limit));
      currentPage = Math.min(page, totalPages);
      
      renderCards(items, reset);
      setStatus(`Showing ${grid.children.length} homilies (Page ${currentPage} of ${totalPages})`);
      setEmptyState(grid.children.length === 0);
      updatePaginationButtons();
    } catch (error) {
      console.error('Error loading homilies:', error);
      setStatus(`Unable to load homilies: ${error.message}`);
      setEmptyState(true);
    } finally {
      setLoadingState(false);
    }
  };

  const openModal = (id) => {
    const item = homilyCache.get(id);
    if (!item || !modal) return;
    modalTitle.textContent = item.title || item.churchName || 'Homily';
    modalMeta.textContent = formatMeta(item);
    modalHomily.textContent = item.homily || item.transcript || '';
    modalPoints.innerHTML = '';
    const points = normalizePoints(item.points);
    if (points.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No takeaway points available.';
      modalPoints.appendChild(li);
    } else {
      points.forEach((point) => {
        const li = document.createElement('li');
        li.textContent = point;
        modalPoints.appendChild(li);
      });
    }
    modal.showModal();
  };

  const closeModal = () => {
    if (modal?.open) modal.close();
  };

  refreshButton?.addEventListener('click', () => {
    if (isLoading) return;
    // Add refresh animation class
    grid.classList.add('homily-grid-refreshing');
    setTimeout(() => {
      grid.classList.remove('homily-grid-refreshing');
    }, 800); // Match animation duration

    fetchHomilies(1, true);
  });
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  // Smooth scroll to subscribe section
  const scrollToSubscribeBtn = document.querySelector('.scroll-to-subscribe');
  if (scrollToSubscribeBtn) {
    scrollToSubscribeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const subscribeSection = document.getElementById('subscribe');
      if (subscribeSection) {
        subscribeSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Email subscription form handling
  const subscribeForm = document.querySelector('#subscribe form');
  if (subscribeForm) {
    subscribeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailInput = subscribeForm.querySelector('input[type="email"]');
      const submitBtn = subscribeForm.querySelector('button[type="submit"]');

      if (!emailInput || !submitBtn) return;

      const email = emailInput.value.trim();
      if (!email) {
        showNotification('Please enter your email address', 'error');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }

      // Disable form during submission
      emailInput.disabled = true;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subscribing...';

      try {
        const response = await fetch(`${apiBase}/web/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.already_subscribed) {
            showNotification('You\'re already subscribed!', 'success');
          } else {
            showNotification('Check your email to verify your subscription!', 'success');
          }
          emailInput.value = ''; // Clear the form
        } else {
          showNotification(data.error || 'Subscription failed. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        showNotification('Network error. Please try again later.', 'error');
      } finally {
        // Re-enable form
        emailInput.disabled = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join newsletter';
      }
    });
  }

  // Notification system
  function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  fetchHomilies(1, true);
}
