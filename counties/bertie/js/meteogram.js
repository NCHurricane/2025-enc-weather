// ==============================
// Bertie County Meteogram Builder - meteogram.js
// Purpose: County-specific meteogram using getHourlyData() from countyData.js
// ==============================

import { getHourlyData } from './countyData.js';

// Utility function to convert degrees to cardinal direction
function degreesToCardinal(deg) {
  if (deg == null) return 'N/A';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Process hourly data for meteogram chart
// COMPLETE REPLACEMENT for processHourlyData function in meteogram.js
// Replace lines 14-112 (the entire processHourlyData function) with this:

function processHourlyData(hourlyData) {
  if (!hourlyData) {
    console.error('No hourly data provided');
    return null;
  }

  // Handle your specific data structure
  let periods;
  if (hourlyData.hours && Array.isArray(hourlyData.hours)) {
    periods = hourlyData.hours;  // Your actual structure
  } else if (hourlyData.periods && Array.isArray(hourlyData.periods)) {
    periods = hourlyData.periods;  // Fallback for standard NWS format
  } else {
    console.error('Invalid hourly data structure:', hourlyData);
    console.log('Expected: {hours: [...]} or {periods: [...]}');
    console.log('Received keys:', Object.keys(hourlyData));
    return null;
  }

  console.log(`Processing ${periods.length} hourly periods for meteogram`);

  const now = new Date();
  const timeframes = { "0": [], "24": [], "48": [], "72": [], "96": [] };

  periods.forEach((period) => {
    if (!period) return;

    // Get timestamp
    const timestamp = new Date(period.startTime);
    if (isNaN(timestamp.getTime())) {
      console.warn('Invalid timestamp in period:', period);
      return;
    }

    // Calculate hours from now
    const hoursSinceNow = Math.floor((timestamp - now) / (60 * 60 * 1000));
    
    // Only include future hours
    if (hoursSinceNow < 0) return;

    // Determine timeframe
    let timeframeKey;
    if (hoursSinceNow < 24) timeframeKey = "0";
    else if (hoursSinceNow < 48) timeframeKey = "24";
    else if (hoursSinceNow < 72) timeframeKey = "48";
    else if (hoursSinceNow < 96) timeframeKey = "72";
    else if (hoursSinceNow < 120) timeframeKey = "96";
    else return; // Skip beyond 120h

    // Extract data - handle your specific format
    const temp = period.temperature;  // Direct number
    
// NEW: Extract dewpoint and humidity from your updated data format
const dewpoint = period.dewpoint || null;  // Now available in Fahrenheit
const humidity = period.relativeHumidity || null;  // Now available as percentage
    
    // Precipitation probability - your format is direct number, not object
    const precipChance = period.probabilityOfPrecipitation || null;
    
    // Parse wind speed (handle "6 mph" format)
    let windSpeed = null;
    if (period.windSpeed) {
      const windStr = period.windSpeed;
      const numMatch = windStr.match(/(\d+)/);
      if (numMatch) windSpeed = parseInt(numMatch[1]);
    }

    // Parse wind direction - your format is string like "NE"
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
      dewpoint,  // Will be null
      humidity,  // Will be null  
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
      dewpoint: group.map(p => p.dewpoint),      // Will be all null
      humidity: group.map(p => p.humidity),      // Will be all null
      precipChance: group.map(p => p.precipChance),
      windSpeed: group.map(p => p.windSpeed),
      windDirection: group.map(p => p.windDirection)
    };
  }

  console.log('Successfully processed meteogram data');
  return processed;
}

// Create Chart.js meteogram
function createMeteogramChart(timeframeKey, processedData, selectedParams) {
  if (!processedData || !processedData[timeframeKey]) {
    console.warn(`No data for timeframe: ${timeframeKey}`);
    return null;
  }

  const canvas = document.getElementById('meteogramChart');
  if (!canvas) {
    console.error('Meteogram canvas not found');
    return null;
  }

  // Destroy existing chart
  if (window.meteogramChartInstance) {
    window.meteogramChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const data = processedData[timeframeKey];
  const datasets = [];

  // Temperature
  if (selectedParams.includes('temperature')) {
    datasets.push({
      type: 'line',
      label: 'Temp (°F)',
      data: data.temperature,
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: 'y-temp',
      pointRadius: 3,
      order: 1
    });
  }

  // Dewpoint
  if (selectedParams.includes('dewpoint') && data.dewpoint) {
    datasets.push({
      type: 'line',
      label: 'Dew Point (°F)',
      data: data.dewpoint,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: 'y-temp',
      pointRadius: 3,
      order: 2
    });
  }

  // Humidity
  if (selectedParams.includes('humidity') && data.humidity) {
    datasets.push({
      type: 'line',
      label: 'Humidity (%)',
      data: data.humidity,
      borderColor: 'rgb(54, 162, 235)',
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: 'y-humidity',
      pointRadius: 3,
      order: 3
    });
  }

// Wind
  if (selectedParams.includes('wind') && data.windSpeed) {
    // Create arrow images for point style
    const pointImages = data.windDirection.map((direction, index) => {
      // Skip creating arrows if either direction is missing or wind speed is 0
      if (direction === null || direction === undefined || data.windSpeed[index] === 0) {
        return undefined;
      }

      // Create a canvas for each arrow
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Draw arrow
      ctx.save();
      ctx.translate(20, 25);

      // Rotate to show direction wind is blowing towards 
      // (wind direction is where wind is coming FROM, so add 180°)
      ctx.rotate(((direction + 180) * Math.PI) / 180);

      // Arrow stem
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -20);
      ctx.strokeStyle = 'rgb(153, 102, 255)';  // Match the line color
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(8, -8);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fillStyle = 'rgb(153, 102, 255)';  // Match the line color
      ctx.fill();

      ctx.restore();
      return canvas;
    });

    datasets.push({
      type: 'line',
      label: 'Wind (mph)',
      data: data.windSpeed,
      borderColor: 'rgb(153, 102, 255)',
      backgroundColor: 'rgba(153, 102, 255, 0.5)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: 'y-wind',
      pointRadius: 6,           // Larger points to show arrows
      pointHoverRadius: 8,
      pointStyle: pointImages,  // Use custom arrow images
      order: 4
    });
  }

  // Precipitation
  if (selectedParams.includes('precipitation') && data.precipChance) {
    datasets.push({
      type: 'bar',
      label: 'Precip. Chance (%)',
      data: data.precipChance,
      backgroundColor: 'rgba(255, 159, 64, 0.7)',
      borderColor: 'rgb(255, 159, 64)',
      borderWidth: 1,
      yAxisID: 'y-precip',
      order: 5
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

  if (selectedParams.includes('temperature') || selectedParams.includes('dewpoint')) {
    scales['y-temp'] = {
      type: 'linear',
      display: true,
      position: 'left',
      title: { display: true, text: 'Temperature (°F)' }
    };
  }

  if (selectedParams.includes('humidity')) {
    scales['y-humidity'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: { display: true, text: 'Humidity (%)' },
      min: 0,
      max: 100,
      grid: { drawOnChartArea: false }
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

// Setup parameter checkboxes and timeframe controls
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
    const paramIds = ['temperature', 'dewpoint', 'humidity', 'wind', 'precipitation'];
    
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

// Main initialization function
export async function initMeteogram() {
  try {
    console.log('Initializing meteogram...');

    // Get hourly data from countyData.js
    const hourlyData = await getHourlyData();
    if (!hourlyData) {
      console.error('Failed to fetch hourly data');
      return false;
    }

    // Process data for meteogram
    const processedData = processHourlyData(hourlyData);
    if (!processedData) {
      console.error('Failed to process hourly data');
      return false;
    }

    // Setup controls and create initial chart
    setupMeteogramControls(processedData);

    console.log('Meteogram initialized successfully');
    return true;

  } catch (error) {
    console.error('Error initializing meteogram:', error);
    return false;
  }
}