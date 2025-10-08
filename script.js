// ====== Elementos do DOM ======
const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");
const photosResult = document.getElementById("photosResult");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");
const suggestionsList = document.getElementById("suggestionsList");
const citySuggestions = document.getElementById("citySuggestions");

// ====== Configurações da API ======
const ACCESS_KEY = "ZQabiWYAegyn2PaEN1x_FnvxSMjN4PDjrncJsCFcG0E";

// ====== Variáveis de controle do autocomplete ======
let searchTimeout;
let currentSuggestions = [];
let selectedSuggestionIndex = -1;

// ====== Tela de Carregamento ======
function initLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  
  // Remove a tela de carregamento após 8 segundos
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    
    // Remove completamente do DOM após a animação
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  }, 8000);
}

// ====== Gerenciamento de Tema ======
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
  
  // Animação do botão
  themeToggle.style.transform = 'scale(0.9)';
  setTimeout(() => {
    themeToggle.style.transform = 'scale(1)';
  }, 150);
}

function updateThemeIcon(theme) {
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ====== Funções de Autocomplete ======
async function getSuggestions(query) {
  if (query.length < 2) return [];
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&countrycodes=br`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.map(item => ({
      name: item.display_name.split(',')[0],
      fullName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      country: item.address?.country || 'Brasil',
      state: item.address?.state || '',
      flag: getLocationFlag(item.address?.state || item.address?.country)
    }));
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
}

function getLocationFlag(location) {
  const flags = {
    'São Paulo': '🏙️',
    'Rio de Janeiro': '🏖️',
    'Minas Gerais': '⛰️',
    'Bahia': '🌴',
    'Paraná': '🌾',
    'Rio Grande do Sul': '🐎',
    'Santa Catarina': '🏝️',
    'Goiás': '🌽',
    'Pernambuco': '🦀',
    'Ceará': '☀️',
    'Pará': '🌳',
    'Maranhão': '🏛️',
    'Paraíba': '🌊',
    'Amazonas': '🌿',
    'Mato Grosso': '🐆',
    'Distrito Federal': '🏛️',
    'Alagoas': '🥥',
    'Piauí': '🌵',
    'Espírito Santo': '⛵',
    'Rio Grande do Norte': '🦐',
    'Mato Grosso do Sul': '🐂',
    'Sergipe': '🦐',
    'Rondônia': '🌲',
    'Acre': '🌳',
    'Amapá': '🌊',
    'Roraima': '🏔️',
    'Tocantins': '🌾',
    'Brasil': '🇧🇷'
  };
  
  return flags[location] || '📍';
}

function displaySuggestions(suggestions) {
  currentSuggestions = suggestions;
  selectedSuggestionIndex = -1;
  
  if (suggestions.length === 0) {
    suggestionsList.classList.remove('show');
    return;
  }
  
  const html = suggestions.map((suggestion, index) => `
    <div class="suggestion-item" data-index="${index}">
      <span class="city-flag">${suggestion.flag}</span>
      <div>
        <div class="city-name">${suggestion.name}</div>
        <div class="city-details">${suggestion.state ? suggestion.state + ', ' : ''}${suggestion.country}</div>
      </div>
    </div>
  `).join('');
  
  suggestionsList.innerHTML = html;
  suggestionsList.classList.add('show');
  
  // Adicionar event listeners para clique
  suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      selectSuggestion(index);
    });
  });
}

function selectSuggestion(index) {
  if (index >= 0 && index < currentSuggestions.length) {
    const suggestion = currentSuggestions[index];
    cityInput.value = suggestion.name;
    suggestionsList.classList.remove('show');
    searchCity(suggestion.name);
  }
}

function highlightSuggestion(index) {
  const items = suggestionsList.querySelectorAll('.suggestion-item');
  items.forEach(item => item.classList.remove('highlighted'));
  
  if (index >= 0 && index < items.length) {
    items[index].classList.add('highlighted');
    selectedSuggestionIndex = index;
  }
}

function hideSuggestions() {
  setTimeout(() => {
    suggestionsList.classList.remove('show');
  }, 200);
}

// ====== Funções de API ======
async function getCoordinates(city) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro na conexão com o serviço de localização');
    }
    
    const data = await response.json();
    
    if (!data.length) {
      throw new Error('Cidade não encontrada. Tente um nome diferente.');
    }
    
    return { 
      lat: parseFloat(data[0].lat), 
      lon: parseFloat(data[0].lon), 
      name: data[0].display_name 
    };
  } catch (error) {
    console.error('Erro ao buscar coordenadas:', error);
    throw error;
  }
}

async function getWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao obter dados meteorológicos');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
    throw error;
  }
}

async function getPhotos(city) {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}&per_page=6&client_id=${ACCESS_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Limite de requisições da API de imagens excedido');
      }
      throw new Error('Erro ao obter imagens');
    }
    
    const data = await response.json();
    return data.results.map(photo => ({
      url: photo.urls.small,
      alt: photo.alt_description || city,
      photographer: photo.user.name,
      link: photo.links.html
    }));
  } catch (error) {
    console.error('Erro ao buscar fotos:', error);
    throw error;
  }
}

// ====== Funções de Interface ======
function showLoading(element, message) {
  element.innerHTML = `<div class="loading">${message}</div>`;
  element.classList.add('loading');
}

function hideLoading(element) {
  element.classList.remove('loading');
}

function formatWeatherData(coords, weather) {
  const current = weather.current;
  const location = coords.name.split(',')[0]; // Pega apenas o nome da cidade
  
  return `
    <div class="weather-info">
      <p><strong>📍 ${location}</strong></p>
      <p>🌡️ <strong>Temperatura:</strong> ${current.temperature_2m}°C</p>
      <p>💨 <strong>Vento:</strong> ${current.wind_speed_10m} km/h</p>
      <p>📅 <strong>Atualizado:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  `;
}

function formatPhotosData(photos, city) {
  if (!photos.length) {
    return '<p class="no-photos">Nenhuma foto encontrada para esta cidade.</p>';
  }
  
  return photos
    .map(photo => `
      <div class="photo-container">
        <img src="${photo.url}" alt="${photo.alt}" loading="lazy">
        <div class="photo-credit">
          <small>📸 ${photo.photographer}</small>
        </div>
      </div>
    `)
    .join('');
}

function showError(element, message) {
  element.innerHTML = `
    <div class="error-message">
      <p style="color: var(--text-accent); font-weight: 600;">❌ ${message}</p>
    </div>
  `;
}

// ====== Função Principal de Busca ======
async function searchCity(city) {
  if (!city.trim()) {
    showError(weatherResult, 'Por favor, digite o nome de uma cidade.');
    return;
  }

  // Mostrar estados de carregamento
  showLoading(weatherResult, 'Buscando informações do clima...');
  photosResult.innerHTML = '';

  try {
    // Buscar coordenadas
    const coords = await getCoordinates(city);
    
    // Buscar clima e fotos em paralelo
    const [weather, photos] = await Promise.allSettled([
      getWeather(coords.lat, coords.lon),
      getPhotos(city)
    ]);

    // Processar resultado do clima
    if (weather.status === 'fulfilled') {
      weatherResult.innerHTML = formatWeatherData(coords, weather.value);
    } else {
      showError(weatherResult, 'Erro ao obter dados meteorológicos.');
    }

    // Processar resultado das fotos
    if (photos.status === 'fulfilled') {
      photosResult.innerHTML = formatPhotosData(photos.value, city);
    } else {
      photosResult.innerHTML = '<p class="no-photos">Erro ao carregar imagens da cidade.</p>';
    }

  } catch (error) {
    showError(weatherResult, error.message);
    photosResult.innerHTML = '';
  } finally {
    hideLoading(weatherResult);
  }
}

// ====== Event Listeners ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  suggestionsList.classList.remove('show');
  await searchCity(city);
});

themeToggle.addEventListener("click", toggleTheme);

// Event listeners para autocomplete
cityInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  
  clearTimeout(searchTimeout);
  
  if (query.length < 2) {
    suggestionsList.classList.remove('show');
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    const suggestions = await getSuggestions(query);
    displaySuggestions(suggestions);
  }, 300);
});

cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsList.querySelectorAll('.suggestion-item');
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (selectedSuggestionIndex < items.length - 1) {
        highlightSuggestion(selectedSuggestionIndex + 1);
      }
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      if (selectedSuggestionIndex > 0) {
        highlightSuggestion(selectedSuggestionIndex - 1);
      }
      break;
      
    case 'Enter':
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        selectSuggestion(selectedSuggestionIndex);
      } else {
        form.dispatchEvent(new Event('submit'));
      }
      break;
      
    case 'Escape':
      suggestionsList.classList.remove('show');
      selectedSuggestionIndex = -1;
      break;
  }
});

cityInput.addEventListener("blur", hideSuggestions);

cityInput.addEventListener("focus", () => {
  if (currentSuggestions.length > 0 && cityInput.value.length >= 2) {
    suggestionsList.classList.add('show');
  }
});

// ====== Inicialização ======
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLoadingScreen(); // Inicializa a tela de carregamento
  
  // Foco automático no campo de input (após o loading)
  setTimeout(() => {
    cityInput.focus();
  }, 8500);
  
  // Exemplo inicial (opcional) - descomente se quiser
  // setTimeout(() => {
  //   searchCity('São Paulo');
  // }, 9000);
});

// ====== Tratamento de Erros Globais ======
window.addEventListener('error', (e) => {
  console.error('Erro global capturado:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Promise rejeitada não tratada:', e.reason);
  e.preventDefault();
});