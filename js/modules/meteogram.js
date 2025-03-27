// meteogram.js

// Import the forecast data function from alertsForecastAFD.js
import { fetchWeatherForecast } from './alertsForecastAFD.js';

// Define your own fetchForecastData function that works with the existing fetchWeatherForecast
export async function fetchForecastData(lat, lon) {
  try {
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    const pointsData = await pointsResponse.json();
    const gridId = pointsData.properties.gridId;
    const gridX = pointsData.properties.gridX;
    const gridY = pointsData.properties.gridY;

    // Use the raw gridpoints endpoint instead of forecast/hourly
    const gridpointsUrl = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}`;
    const gridpointsResponse = await fetch(gridpointsUrl);
    return await gridpointsResponse.json();
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    return null;
  }
}

// export function processForecastData(rawData) {
//   console.log("Raw forecast data:", rawData.properties.periods[0]);
//   if (!rawData || !rawData.properties || !rawData.properties.periods) return null;
//   const periods = rawData.properties.periods;
//   const timeframes = { "0": [], "24": [], "48": [], "72": [], "96": [] };

//   periods.forEach((period, index) => {
//     if (index < 24) {
//       timeframes["0"].push(period);
//     } else if (index < 48) {
//       timeframes["24"].push(period);
//     } else if (index < 72) {
//       timeframes["48"].push(period);
//     } else if (index < 96) {
//       timeframes["72"].push(period);
//     } else if (index < 120) {
//       timeframes["96"].push(period);
//     }
//   });

//   const processed = {};
//   for (const key in timeframes) {
//     const group = timeframes[key];
//     if (!group.length) continue;

//     processed[key] = {
//       labels: group.map(p => {
//         const date = new Date(p.startTime);
//         return {
//           date: date.toLocaleDateString('en-US', {
//             day: 'numeric',
//             month: 'numeric'
//           }),
//           time: date.getHours() + ":00",
//         };
//       }),
//       temperature: group.map(p => p.temperature),
//       dewpoint: group.map(p => {
//         // Handle different possible structures for dewpoint
//         if (p.dewpoint && typeof p.dewpoint === 'object' && 'value' in p.dewpoint) {
//           // Convert from C to F if needed
//           return Math.round((p.dewpoint.value * 9 / 5) + 32);
//         } else if (typeof p.dewpoint === 'number') {
//           return p.dewpoint;
//         }
//         return null;
//       }),
//       windSpeed: group.map(p => {
//         // Parse wind speed values from string like "5 to 10 mph"
//         if (typeof p.windSpeed === 'string') {
//           const match = p.windSpeed.match(/(\d+)/);
//           return match ? parseInt(match[0], 10) : 0;
//         }
//         return p.windSpeed || 0;
//       }),
//       humidity: group.map(p => {
//         if (p.relativeHumidity && typeof p.relativeHumidity === 'object') {
//           return p.relativeHumidity.value || 0;
//         }
//         return 0;
//       }),
//       precipChance: group.map(p => {
//         if (p.probabilityOfPrecipitation && typeof p.probabilityOfPrecipitation === 'object') {
//           return p.probabilityOfPrecipitation.value || 0;
//         }
//         return 0;
//       }),
//       skyCover: group.map(p => {
//         if (p.skyCover !== undefined) {
//           return typeof p.skyCover === 'object' ? (p.skyCover.value || 0) : p.skyCover;
//         }
//         return 0;
//       }),

//       // Add wind direction - handle both string directions and numeric degrees
//       windDirection: group.map(p => {
//         if (p.windDirection) {
//           // Some APIs provide cardinal directions as strings, others as degrees
//           if (!isNaN(p.windDirection)) {
//             return parseInt(p.windDirection, 10); // It's a number, return as is
//           } else {
//             // It's a string like "N" or "NE" - convert to approximate degrees
//             const directionMap = {
//               'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
//               'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
//               'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
//               'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
//             };
//             return directionMap[p.windDirection] !== undefined ?
//               directionMap[p.windDirection] : null;
//           }
//         }
//         return null; // Return null instead of empty string for missing values
//       })
//     };
//   }

//   return processed;
// }

export function processForecastData(rawData) {
  // Check if we have the necessary data
  if (!rawData || !rawData.properties) return null;

  // Extract all the relevant properties
  const skyCover = rawData.properties.skyCover?.values || [];
  const temperature = rawData.properties.temperature?.values || [];
  const dewpoint = rawData.properties.dewpoint?.values || [];
  const relativeHumidity = rawData.properties.relativeHumidity?.values || [];
  const windSpeed = rawData.properties.windSpeed?.values || [];
  const windDirection = rawData.properties.windDirection?.values || [];
  const probabilityOfPrecipitation = rawData.properties.probabilityOfPrecipitation?.values || [];

  // Get the current time to use as a reference point
  const now = new Date();

  // Create timeframes (0-24h, 24-48h, etc.)
  const timeframes = { "0": [], "24": [], "48": [], "72": [], "96": [] };

  // Process each property into hourly data points
  // We'll start by creating a timeline of hourly timestamps for the next 120 hours
  const hourlyTimestamps = [];
  for (let i = 0; i < 120; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    hourlyTimestamps.push(timestamp);
  }

  // Function to get value for a specific timestamp from a property array
  function getValueAtTime(propertyArray, timestamp) {
    for (const item of propertyArray) {
      const validTime = item.validTime;
      const [startTimeStr, durationStr] = validTime.split('/');

      const startTime = new Date(startTimeStr);

      // Parse the duration (e.g., "PT1H" = 1 hour, "PT2H" = 2 hours)
      let hours = 1;
      if (durationStr) {
        const match = durationStr.match(/PT(\d+)H/);
        if (match) {
          hours = parseInt(match[1], 10);
        }
      }

      const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);

      if (timestamp >= startTime && timestamp < endTime) {
        return item.value;
      }
    }
    return null;
  }

  // Process data for each timeframe
  hourlyTimestamps.forEach((timestamp, index) => {
    const hour = Math.floor(index / 24); // 0, 1, 2, 3, 4 for the different timeframes
    if (hour > 4) return; // Skip if beyond our timeframes

    const timeframeKey = (hour * 24).toString();
    if (!timeframes[timeframeKey]) return;

    timeframes[timeframeKey].push({
      timestamp,
      temperature: getValueAtTime(temperature, timestamp),
      dewpoint: getValueAtTime(dewpoint, timestamp),
      skyCover: getValueAtTime(skyCover, timestamp),
      relativeHumidity: getValueAtTime(relativeHumidity, timestamp),
      windSpeed: getValueAtTime(windSpeed, timestamp),
      windDirection: getValueAtTime(windDirection, timestamp),
      probabilityOfPrecipitation: getValueAtTime(probabilityOfPrecipitation, timestamp)
    });
  });

  // Format the processed data for the chart
  const processed = {};
  for (const key in timeframes) {
    const group = timeframes[key];
    if (!group.length) continue;

    processed[key] = {
      labels: group.map(p => {
        const date = p.timestamp;
        return {
          date: date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'numeric'
          }),
          time: date.getHours() + ":00",
        };
      }),
      temperature: group.map(p => {
        // Convert from C to F if needed
        return p.temperature !== null ? Math.round((p.temperature * 9 / 5) + 32) : null;
      }),
      dewpoint: group.map(p => {
        // Convert from C to F if needed
        return p.dewpoint !== null ? Math.round((p.dewpoint * 9 / 5) + 32) : null;
      }),
      skyCover: group.map(p => p.skyCover),
      humidity: group.map(p => p.relativeHumidity),
      precipChance: group.map(p => p.probabilityOfPrecipitation),
      windSpeed: group.map(p => {
        // Convert from km/h to mph if needed
        return p.windSpeed !== null ? Math.round(p.windSpeed * 0.621371) : null;
      }),
      windDirection: group.map(p => p.windDirection)
    };
  }

  return processed;
}

// Helper function to convert degrees to cardinal directions
function degreesToCardinal(deg) {
  if (deg === undefined || deg === null) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.floor((deg / 22.5) + 0.5) % 16];
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
    const pointImages = data.windDirection.map(direction => {
      if (direction === null || direction === undefined) return undefined;

      // Create a canvas for each arrow
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Draw arrow
      ctx.save();
      ctx.translate(20, 25);

      // Rotate to show direction wind is blowing towards
      ctx.rotate(((direction + 180) * Math.PI) / 180);

      // Arrow stem
      ctx.beginPath();
      ctx.moveTo(0, 0);     // Keep the same starting point
      ctx.lineTo(0, -20);   // Double the length from -5 to -10
      ctx.strokeStyle = 'rgb(0, 16, 134)';
      ctx.lineWidth = 3;    // Keep the same line width
      ctx.stroke();

      // Arrow head - doubled in size
      ctx.beginPath();
      ctx.moveTo(0, -20);   // Move tip twice as far (from -10 to -20)
      ctx.lineTo(8, -8);  // Double the width (from 5 to 10) and height
      ctx.lineTo(-8, -8); // Double the width on left side too
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
                return `Wind Direction: ${degreesToCardinal(direction) || 'N/A'}`;
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