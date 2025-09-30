// =============================
// Meteogram Chart Module - js/modules/meteogram.js
// Fetches hourly weather data for the current county and renders a meteogram chart using Chart.js.
// Allows selection of timeframes (now, 24, 48, 72, 96 hours) and parameters (temperature, wind, precipitation).
// =============================

function degreesToCardinal(deg) {
  if (deg == null) return null;
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Get county name from current URL path
 */
function getCountyFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/counties\/(\w+)\//);
  return match ? match[1] : null;
}

/**
 * Fetch hourly data from county-specific data files
 */
async function fetchHourlyData() {
  const county = getCountyFromURL();
  if (!county) {
    console.error('Cannot determine county from URL');
    return null;
  }

  try {
    const response = await fetch(`../../counties/${county}/data/hourly.json?t=${Date.now()}`, {
      headers: { 'User-Agent': 'NCHurricane.com Weather App/1.0' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hourly data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching hourly data:', error);
    return null;
  }
}

/**
 * Process hourly data for meteogram chart
 */
function processHourlyData(hourlyData) {
  if (!hourlyData) return null;

  // Handle data structure - look for 'hours' array
  const periods = hourlyData.hours || hourlyData.periods || [];
  if (!Array.isArray(periods)) {
    console.error('Invalid hourly data structure');
    return null;
  }

  console.log(`Processing ${periods.length} hourly periods for meteogram`);

  const now = new Date();
  const timeframes = { "0": [], "24": [], "48": [], "72": [], "96": [] };

  periods.forEach((period) => {
    if (!period || !period.startTime) return;

    const timestamp = new Date(period.startTime);
    if (isNaN(timestamp.getTime())) return;

    // Only include future hours
    const hoursSinceNow = Math.floor((timestamp - now) / (60 * 60 * 1000));
    if (hoursSinceNow < 0) return;

    // Determine timeframe
    let timeframeKey;
    if (hoursSinceNow < 24) timeframeKey = "0";
    else if (hoursSinceNow < 48) timeframeKey = "24";
    else if (hoursSinceNow < 72) timeframeKey = "48";
    else if (hoursSinceNow < 96) timeframeKey = "72";
    else if (hoursSinceNow < 120) timeframeKey = "96";
    else return;

    // Extract temperature
    const temp = period.temperature;

    // Extract precipitation probability
    const precipChance = period.probabilityOfPrecipitation;

    // Parse wind speed
    let windSpeed = null;
    if (period.windSpeed) {
      const numMatch = period.windSpeed.toString().match(/(\d+)/);
      if (numMatch) windSpeed = parseInt(numMatch[1]);
    }

    // Convert wind direction from cardinal to degrees
    let windDirection = null;
    if (period.windDirection) {
      const cardinalMap = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
      };
      windDirection = cardinalMap[period.windDirection] ?? null;
    }

    timeframes[timeframeKey].push({
      timestamp,
      temperature: temp,
      precipChance,
      windSpeed,
      windDirection
    });
  });

  // Format for Chart.js
  const processed = {};
  for (const [key, group] of Object.entries(timeframes)) {
    if (!group.length) continue;

    processed[key] = {
      labels: group.map(p => ({
        date: p.timestamp.toLocaleDateString('en-US', { day: 'numeric', month: 'numeric' }),
        time: p.timestamp.getHours().toString().padStart(2, '0') + ":00"
      })),
      temperature: group.map(p => p.temperature),
      precipChance: group.map(p => p.precipChance),
      windSpeed: group.map(p => p.windSpeed),
      windDirection: group.map(p => p.windDirection)
    };
  }

  return processed;
}

/**
 * Create meteogram chart using Chart.js
 */
function createMeteogramChart(timeframeKey, processedData, selectedParams) {
  if (!processedData || !processedData[timeframeKey]) return null;

  const canvas = document.getElementById('meteogramChart');
  if (!canvas) return null;

  // Destroy existing chart
  if (window.meteogramChartInstance) {
    window.meteogramChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const data = processedData[timeframeKey];
  const datasets = [];

  // Temperature dataset
  if (selectedParams.includes('temperature')) {
    datasets.push({
      label: 'Temperature (°F)',
      data: data.temperature,
      backgroundColor: 'rgba(255, 99, 132, 0.7)',
      borderColor: 'rgb(255, 99, 132)',
      borderWidth: 2,
      yAxisID: 'y-temp',
      order: 1
    });
  }

  // Wind speed dataset
  if (selectedParams.includes('wind')) {
    datasets.push({
      label: 'Wind Speed (mph)',
      data: data.windSpeed,
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1,
      yAxisID: 'y-wind',
      order: 3
    });
  }

  // Precipitation dataset
  if (selectedParams.includes('precipitation')) {
    datasets.push({
      label: 'Precipitation Chance (%)',
      data: data.precipChance,
      backgroundColor: 'rgba(255, 159, 64, 0.7)',
      borderColor: 'rgb(255, 159, 64)',
      borderWidth: 1,
      yAxisID: 'y-precip',
      order: 4
    });
  }

  // Configure scales
  const scales = {
    x: {
      title: { display: true, text: 'Time' },
      ticks: {
        callback: function (val, index) {
          const labelObj = data.labels[index];
          return [labelObj.time, labelObj.date];
        }
      }
    }
  };

  if (selectedParams.includes('temperature')) {
    scales['y-temp'] = {
      type: 'linear',
      display: true,
      position: 'left',
      title: { display: true, text: 'Temperature (°F)' }
    };
  }

  if (selectedParams.includes('wind')) {
    scales['y-wind'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: { display: true, text: 'Wind Speed (mph)' },
      min: 0,
      grid: { drawOnChartArea: false }
    };
  }

  if (selectedParams.includes('precipitation')) {
    scales['y-precip'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: { display: true, text: 'Precipitation (%)' },
      min: 0,
      max: 100,
      grid: { drawOnChartArea: false }
    };
  }

  // Create chart
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            title: context => {
              const index = context[0]?.dataIndex;
              if (index === undefined) return 'Time: Unknown';
              const label = data.labels[index];
              return `Time: ${label.time} on ${label.date}`;
            },
            afterBody: context => {
              if (selectedParams.includes('wind') && data.windDirection) {
                const index = context[0]?.dataIndex;
                const direction = data.windDirection[index];
                return direction != null ? `Wind Direction: ${degreesToCardinal(direction)}` : '';
              }
              return '';
            }
          }
        }
      }
    }
  });

  window.meteogramChartInstance = chart;
  return chart;
}

/**
 * Setup meteogram controls
 */
function setupMeteogramControls(processedData) {
  function getSelectedTimeframe() {
    const timeframes = ['now', '24', '48', '72', '96'];
    for (const time of timeframes) {
      const radio = document.getElementById(`meteogram-${time}`);
      if (radio?.checked) {
        return time === 'now' ? '0' : time;
      }
    }
    return '0';
  }

  function getSelectedParameters() {
    const params = [];
    const paramIds = ['temperature', 'wind', 'precipitation'];

    for (const param of paramIds) {
      const checkbox = document.getElementById(`param-${param}`);
      if (checkbox?.checked) params.push(param);
    }

    return params.length > 0 ? params : ['temperature'];
  }

  function updateChart() {
    const timeframe = getSelectedTimeframe();
    const selectedParams = getSelectedParameters();
    createMeteogramChart(timeframe, processedData, selectedParams);
  }

  // Add event listeners
  const checkboxes = document.querySelectorAll('.meteogram-param-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
  });

  const timeframeRadios = document.querySelectorAll('input[name="meteogramTime"]');
  timeframeRadios.forEach(radio => {
    radio.addEventListener('change', updateChart);
  });

  // Initial chart
  updateChart();
}

/**
 * Initialize meteogram
 */
export async function initMeteogram() {
  try {
    console.log('Initializing meteogram...');

    // Fetch hourly data
    const hourlyData = await fetchHourlyData();
    if (!hourlyData) {
      console.error('Failed to fetch hourly data');
      return false;
    }

    // Process data
    const processedData = processHourlyData(hourlyData);
    if (!processedData) {
      console.error('Failed to process hourly data');
      return false;
    }

    // Setup controls and create chart
    setupMeteogramControls(processedData);

    console.log('Meteogram initialized successfully');
    return true;

  } catch (error) {
    console.error('Error initializing meteogram:', error);
    return false;
  }
}