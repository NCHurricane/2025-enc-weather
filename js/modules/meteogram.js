// meteogram.js

import { degreesToCardinal } from './utils.js';

// Define your own fetchForecastData function that works with the existing fetchWeatherForecast
export async function fetchForecastData(lat, lon) {
  try {
    // Get county name from coordinates or page configuration
    const countyName = getCountyNameFromCoordinates(lat, lon);

    if (!countyName) {
      console.error("Could not determine county name from coordinates:", lat, lon);
      return null;
    }

    console.log(`Fetching forecast for ${countyName} county...`);

    // Try both relative and absolute path patterns
    let response;
    try {
      // Try relative path first (for county pages)
      response = await fetch(`../../js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`);

      if (!response.ok) {
        // Try alternative path (for root pages)
        response = await fetch(`js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`);
      }
    } catch (pathError) {
      // If first path fails, try alternative path
      console.log("Trying alternative path for forecast data...");
      response = await fetch(`js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`);
    }

    if (!response.ok) {
      console.error(`Failed to fetch forecast data for ${countyName}: ${response.status}`);

      // Fallback to API for meteorological data
      console.log("Attempting fallback to direct API...");
      return await fetchForecastFromAPI(lat, lon);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    return null;
  }
}

// Fallback function to get basic forecast data directly from API
async function fetchForecastFromAPI(lat, lon) {
  try {
    console.log("Fetching meteorological data from API fallback");
    // Get the forecast from NWS API
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    const pointsData = await pointsResponse.json();

    if (!pointsData.properties || !pointsData.properties.forecastHourly) {
      throw new Error("Invalid points data from API");
    }

    const forecastUrl = pointsData.properties.forecastHourly;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();

    if (!forecastData.properties || !forecastData.properties.periods) {
      throw new Error("Invalid forecast data from API");
    }

    // Structure data in the same format as our cache files
    return {
      timestamp: Math.floor(Date.now() / 1000),
      lastUpdated: new Date().toISOString(),
      location: "API Fallback",
      coords: { lat, lon },
      forecast: {
        hourly: forecastData.properties.periods,
        daily: []
      }
    };
  } catch (apiError) {
    console.error("API fallback failed:", apiError);
    return null;
  }
}

// Helper function to get county name from coordinates
// Updated county detection function with more flexible matching
function getCountyNameFromCoordinates(lat, lon) {
  // First, check if there's a direct configuration match from the page
  const config = window.weatherConfig || {};
  if (config.location && config.location.countyName) {
    console.log("Found county name from weatherConfig:", config.location.countyName);
    return config.location.countyName.toLowerCase();
  }

  // If no direct match, try to find by coordinates
  const counties = window.siteConfig?.counties || [];
  const matchedCounty = counties.find(county =>
    Math.abs(county.lat - lat) < 0.1 &&
    Math.abs(county.lon - lon) < 0.1
  );

  if (matchedCounty) {
    console.log("Found county by coordinates:", matchedCounty.name);
    return matchedCounty.name.toLowerCase();
  }

  // Last attempt - try to extract county from current URL path
  const path = window.location.pathname;
  const countyMatch = path.match(/\/counties\/(\w+)\//);
  if (countyMatch && countyMatch[1]) {
    console.log("Extracted county from URL path:", countyMatch[1]);
    return countyMatch[1].toLowerCase();
  }

  console.error("Could not determine county name from any source");
  return null;
}

function processWindDirection(direction) {
  // Handle various formats of wind direction data
  if (direction === null || direction === undefined) return null;

  // If it's already a number (degrees), return it directly
  if (typeof direction === 'number') return direction;

  // If it's a string with a cardinal direction, convert to degrees
  if (typeof direction === 'string') {
    const directionMap = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };

    // Check if string is already a cardinal direction
    if (directionMap[direction] !== undefined) {
      return directionMap[direction];
    }

    // Check if string contains degrees
    const degMatch = direction.match(/(\d+)/);
    if (degMatch) {
      return parseInt(degMatch[1]);
    }
  }

  return null;
}

export function processForecastData(rawData) {
  // Debug the incoming data
  console.log("Processing forecast data:", rawData);

  // Check if we have the necessary data
  if (!rawData) {
    console.error('No forecast data available');
    return null;
  }

  // Handle different data structures - check for hourly data in several possible locations
  let hourlyData = [];

  if (rawData.forecast && rawData.forecast.hourly) {
    // Standard structure from our cache
    hourlyData = rawData.forecast.hourly;
  } else if (rawData.properties && rawData.properties.periods) {
    // Direct API structure
    hourlyData = rawData.properties.periods;
  } else if (Array.isArray(rawData)) {
    // Maybe it's already an array of periods
    hourlyData = rawData;
  }

  if (!hourlyData.length) {
    console.error('Could not find hourly forecast data in:', rawData);
    return null;
  }

  console.log(`Found ${hourlyData.length} hourly data points`);

  // Get the current time to use as a reference point
  const now = new Date();

  // Create timeframes (0-24h, 24-48h, etc.)
  const timeframes = { "0": [], "24": [], "48": [], "72": [], "96": [] };

  // Process each hourly data point
  hourlyData.forEach((hourData) => {
    if (!hourData) return;

    // Get timestamp from startTime or time property
    let timestamp;
    if (hourData.startTime) {
      timestamp = new Date(hourData.startTime);
    } else if (hourData.time) {
      timestamp = new Date(hourData.time);
    } else {
      console.warn("Missing timestamp in hourly data:", hourData);
      return;
    }

    // Calculate hours since now
    const hoursSinceNow = Math.floor((timestamp - now) / (60 * 60 * 1000));

    // Only include future hours (hoursSinceNow >= 0)
    if (hoursSinceNow < 0) return;

    // Determine which timeframe this hour belongs to
    let timeframeKey;
    if (hoursSinceNow < 24) timeframeKey = "0";
    else if (hoursSinceNow < 48) timeframeKey = "24";
    else if (hoursSinceNow < 72) timeframeKey = "48";
    else if (hoursSinceNow < 96) timeframeKey = "72";
    else if (hoursSinceNow < 120) timeframeKey = "96";
    else return; // Skip hours beyond 120h

    // Extract the data - handle various property structures
    const tempValue = hourData.temperature !== undefined ?
      hourData.temperature :
      (hourData.value !== undefined ? hourData.value : null);

    // Handle different ways dewpoint might be stored
    let dewpointValue = null;
    if (hourData.dewpoint !== undefined) {
      if (typeof hourData.dewpoint === 'object' && hourData.dewpoint !== null) {
        dewpointValue = hourData.dewpoint.value;
      } else {
        dewpointValue = hourData.dewpoint;
      }
    }

    // Handle different ways humidity might be stored
    let humidityValue = null;
    if (hourData.relativeHumidity !== undefined) {
      if (typeof hourData.relativeHumidity === 'object' && hourData.relativeHumidity !== null) {
        humidityValue = hourData.relativeHumidity.value;
      } else {
        humidityValue = hourData.relativeHumidity;
      }
    }

    // Handle different ways precipitation probability might be stored
    let precipValue = null;
    if (hourData.probabilityOfPrecipitation !== undefined) {
      if (typeof hourData.probabilityOfPrecipitation === 'object' && hourData.probabilityOfPrecipitation !== null) {
        precipValue = hourData.probabilityOfPrecipitation.value;
      } else {
        precipValue = hourData.probabilityOfPrecipitation;
      }
    }

    // Process wind direction with our new function
    const windDirectionValue = processWindDirection(hourData.windDirection);

    // Add this hour's data to the appropriate timeframe
    timeframes[timeframeKey].push({
      timestamp,
      temperature: tempValue,
      dewpoint: dewpointValue,
      skyCover: hourData.skyCover,
      relativeHumidity: humidityValue,
      windSpeed: getWindSpeed(hourData.windSpeed),
      windDirection: windDirectionValue,
      probabilityOfPrecipitation: precipValue
    });
  });

  // Check if we have any usable data
  let hasData = false;
  for (const key in timeframes) {
    if (timeframes[key].length > 0) {
      hasData = true;
      break;
    }
  }

  if (!hasData) {
    console.error("No usable forecast data points found");
    return null;
  }

  // Format the processed data for the chart
  const processed = {};
  for (const key in timeframes) {
    const group = timeframes[key];
    if (!group.length) continue;

    processed[key] = {
      labels: group.map(p => ({
        date: p.timestamp.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'numeric'
        }),
        time: p.timestamp.getHours() + ":00"
      })),
      temperature: group.map(p => p.temperature !== null ? Math.round(p.temperature) : null),
      dewpoint: group.map(p => p.dewpoint !== null ? Math.round((p.dewpoint * 9 / 5) + 32) : null),
      skyCover: group.map(p => p.skyCover),
      humidity: group.map(p => p.relativeHumidity !== null ? Math.round(p.relativeHumidity) : null),
      precipChance: group.map(p => p.probabilityOfPrecipitation !== null ?
        Math.round(p.probabilityOfPrecipitation) : null),
      windSpeed: group.map(p => p.windSpeed !== null ? Math.round(p.windSpeed) : null),
      windDirection: group.map(p => p.windDirection)
    };
  }

  console.log("Successfully processed forecast data for chart");
  return processed;
}
// Helper function to parse wind speed from various formats
function getWindSpeed(windSpeedText) {
  if (windSpeedText === null || windSpeedText === undefined) return null;

  // Check if it's a string like "5 to 10 mph"
  if (typeof windSpeedText === 'string') {
    const matches = windSpeedText.match(/(\d+)\s*to\s*(\d+)\s*mph/);
    if (matches) {
      // Average the range
      return Math.round((parseInt(matches[1]) + parseInt(matches[2])) / 2);
    }
    // Try to extract just a number
    const numMatch = windSpeedText.match(/(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }
  }

  // If it's already a number
  if (typeof windSpeedText === 'number') {
    return windSpeedText;
  }

  return null;
}



// This function creates the meteogram chart with selected parameters
export function createMeteogramChart(timeframeKey, processedData, selectedParams) {
  if (!processedData || !processedData[timeframeKey]) return null;
  const canvas = document.getElementById('meteogramChart');
  if (!canvas) return null;

  // Destroy existing chart if one exists
  if (window.meteogramChartInstance) {
    window.meteogramChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const data = processedData[timeframeKey];
  const datasets = [];

  // Build datasets based on selected parameters
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
      pointHoverRadius: 5,
      order: 1
    });
  }

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
      pointHoverRadius: 5,
      order: 2
    });
  }

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
      pointHoverRadius: 5,
      order: 3
    });
  }

  if (selectedParams.includes('wind') && data.windSpeed) {
    // Create arrow images for point style
    const pointImages = data.windDirection.map((direction, index) => {
      // Skip creating arrows if either direction is missing or wind speed is 0
      if (direction === null || direction === undefined || data.windSpeed[index] === 0) {
        console.log("Missing wind direction or zero wind speed at index:", index);
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

      // Rotate to show direction wind is blowing towards (wind direction is where wind is coming FROM)
      ctx.rotate(((direction + 180) * Math.PI) / 180);

      // Arrow stem
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -20);
      ctx.strokeStyle = 'rgb(0, 16, 134)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(8, -8);
      ctx.lineTo(-8, -8);
      ctx.fillStyle = 'rgb(0, 16, 134)';
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
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: pointImages,
      order: 4
    });
  }

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

  if (selectedParams.includes('skycover') && data.skyCover) {
    datasets.push({
      type: 'line',
      label: 'Sky Cover (%)',
      data: data.skyCover,
      borderColor: 'rgb(128, 128, 128)',  // Gray color for clouds
      backgroundColor: 'rgba(128, 128, 128, 0.5)',
      borderWidth: 2,
      tension: 0.3,
      yAxisID: 'y-sky',
      pointRadius: 3,
      pointHoverRadius: 5,
      order: 6
    });
  }

  // Configure scales based on selected parameters
  const scales = {
    x: {
      title: {
        display: true,
        text: 'Time'
      }, ticks: {
        callback: function (val, index) {
          const labelObj = data.labels[index];
          // Return array for multiline, date will be styled separately
          return [labelObj.time, labelObj.date];
        },
        font: function (context) {
          // Make date line bold by checking the label index
          const index = context.tick.label.indexOf;
          if (index === 1) { // Second line (date)
            return {
              weight: 'bold'
            };
          }
          return {}; // Default font
        }
      }
    }
  };

  // Add scales for selected parameters
  if (selectedParams.includes('temperature') || selectedParams.includes('dewpoint')) {
    scales['y-temp'] = {
      type: 'linear',
      display: true,
      position: 'left',
      title: {
        display: true,
        text: 'Temperature (°F)'
      }
    };
  }

  if (selectedParams.includes('humidity')) {
    scales['y-humidity'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Humidity (%)'
      },
      min: 0,
      max: 100,
      grid: {
        drawOnChartArea: false
      }
    };
  }

  if (selectedParams.includes('wind')) {
    scales['y-wind'] = {
      type: 'linear',
      display: true,
      position: selectedParams.includes('humidity') ? 'right' : 'right',
      title: {
        display: true,
        text: 'Wind Speed (mph)'
      },
      min: 0,
      grid: {
        drawOnChartArea: false
      }
    };
  }

  if (selectedParams.includes('precipitation')) {
    scales['y-precip'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Precipitation (%)'
      },
      min: 0,
      max: 100,
      grid: {
        drawOnChartArea: false
      }
    };
  }

  if (selectedParams.includes('skycover')) {
    scales['y-sky'] = {
      type: 'linear',
      display: true,
      position: 'right',
      title: {
        display: true,
        text: 'Sky Cover (%)'
      },
      min: 0,
      max: 100,
      grid: {
        drawOnChartArea: false
      }
    };
  }

  // Create the chart
  const chart = new Chart(ctx, {
    type: 'bar',
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
              if (!context || !context[0] || context[0].dataIndex === undefined) {
                return 'Time: Unknown';
              }

              const index = context[0].dataIndex;
              const timeLabel = data.labels[index];

              // Debug log to console to see what we're dealing with
              console.log('Time label type:', typeof timeLabel, 'Value:', timeLabel);

              // Handle different possible data types
              if (timeLabel === undefined || timeLabel === null) {
                return 'Time: Not available';
              } else if (typeof timeLabel === 'string') {
                return `Time: ${timeLabel}`;
              } else if (timeLabel instanceof Date) {
                return `Time: ${timeLabel.getHours()}:${timeLabel.getMinutes().toString().padStart(2, '0')}`;
              } else if (typeof timeLabel === 'object') {
                // Try to find a usable property
                if (timeLabel.value) return `Time: ${timeLabel.value}`;
                if (timeLabel.time) return `Time: ${timeLabel.time}`;
                if (timeLabel.hour !== undefined) return `Time: ${timeLabel.hour}:00`;

                // Last resort - JSON stringify with limiting
                try {
                  return `Time: ${JSON.stringify(timeLabel).substring(0, 20)}`;
                } catch (e) {
                  return 'Time: [Complex Object]';
                }
              } else {
                // For numbers or other primitive types
                return `Time: ${timeLabel}`;
              }
            }, afterBody: context => {
              if (selectedParams.includes('wind') && data.windDirection) {
                const index = context[0].dataIndex;
                const direction = data.windDirection[index];

                if (direction !== null && direction !== undefined) {
                  return `Wind Direction: ${degreesToCardinal(direction)}`;
                }
                return 'Wind Direction: N/A';
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

function setupParameterCheckboxes(processedData) {
  // Get all parameter checkboxes
  const checkboxes = document.querySelectorAll('.meteogram-param-checkbox');

  // Add event listeners to each checkbox
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateChart);
  });

  // Get the selected timeframe and parameters
  function getSelectedTimeframe() {
    const timeframes = ['0', '24', '48', '72', '96'];
    for (const time of timeframes) {
      const radio = document.getElementById(`meteogram-${time === '0' ? 'now' : time}`);
      if (radio && radio.checked) {
        return time;
      }
    }
    return '0'; // Default to current timeframe
  }

  function getSelectedParameters() {
    const params = [];
    if (document.getElementById('param-temperature').checked) params.push('temperature');
    if (document.getElementById('param-dewpoint').checked) params.push('dewpoint');
    if (document.getElementById('param-humidity').checked) params.push('humidity');
    if (document.getElementById('param-wind').checked) params.push('wind');
    if (document.getElementById('param-precipitation').checked) params.push('precipitation');
    if (document.getElementById('param-skycover').checked) params.push('skycover');

    // Default to temperature if nothing selected
    return params.length > 0 ? params : ['temperature'];
  }

  // Update the chart when parameters change
  function updateChart() {
    const timeframe = getSelectedTimeframe();
    const selectedParams = getSelectedParameters();
    createMeteogramChart(timeframe, processedData, selectedParams);
  }

  // Add event listeners to timeframe radio buttons
  const timeframeRadios = document.querySelectorAll('input[name="meteogramTime"]');
  timeframeRadios.forEach(radio => {
    radio.addEventListener('change', updateChart);
  });

  // Initial chart update
  updateChart();
}

export async function initMeteogram(lat, lon) {
  console.log("Initializing meteogram with coordinates:", lat, lon);

  // Fetch and process data
  const rawData = await fetchForecastData(lat, lon);
  if (!rawData) {
    console.error("Failed to fetch forecast data");
    return null;
  }

  const processedData = processForecastData(rawData);
  if (!processedData) {
    console.error("Failed to process forecast data");
    return null;
  }

  // Make sure the chart container is visible
  const chartContainer = document.getElementById('meteogram-chart-container');
  if (chartContainer) {
    chartContainer.style.display = 'block';
  }

  // For initial load, use temperature parameter
  const defaultParams = ['temperature'];

  // Create initial chart
  const chart = createMeteogramChart('0', processedData, defaultParams);

  // Setup the parameter checkboxes
  if (processedData) {
    setupParameterCheckboxes(processedData);
  }

  return { processedData, defaultParams };
}