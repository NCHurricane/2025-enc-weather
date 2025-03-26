// alertsForecastAFD.js
import { safeSetText, safeSetHTML } from './utils.js';
import { warningColors } from './warningColors.js';

export async function fetchWeatherForecast(lat, lon) {
  try {
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);

    const pointsData = await pointsResponse.json();
    if (!pointsData.properties || !pointsData.properties.gridId ||
      !pointsData.properties.gridX || !pointsData.properties.gridY) {
      throw new Error('Invalid points data response structure');
    }

    const gridId = pointsData.properties.gridId;
    const gridX = pointsData.properties.gridX;
    const gridY = pointsData.properties.gridY;
    const forecastUrl = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`;

    const response = await fetch(forecastUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    if (!data.properties || !data.properties.periods || !Array.isArray(data.properties.periods)) {
      throw new Error('Invalid forecast data response structure');
    }

    let forecastHTML = '';
    data.properties.periods.slice(0, 10).forEach(period => {
      const tempColor = period.isDaytime ? 'red' : 'blue';
      forecastHTML += `
        <div class="forecast-item">
          <div class="forecast-cell forecast-day">${period.name}</div>
          <div class="forecast-cell forecast-icon">
            <img src="${period.icon}" alt="${period.shortForecast}">
          </div>
          <div class="forecast-cell forecast-temp" style="color: ${tempColor};">
            ${period.temperature}°
          </div>
        </div>
      `;
    });

    safeSetHTML('forecast', forecastHTML);
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    safeSetHTML('forecast', '<div class="forecast-item">Weather forecast unavailable. Please try again later.</div>');
  }
}

export async function fetchDetailedForecast(lat, lon) {
  try {
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);

    const pointsData = await pointsResponse.json();
    if (!pointsData.properties || !pointsData.properties.gridId ||
      !pointsData.properties.gridX || !pointsData.properties.gridY) {
      throw new Error('Invalid points data response structure');
    }

    const gridId = pointsData.properties.gridId;
    const gridX = pointsData.properties.gridX;
    const gridY = pointsData.properties.gridY;
    const forecastUrl = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`;

    const response = await fetch(forecastUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    if (!data.properties || !data.properties.periods || !Array.isArray(data.properties.periods)) {
      throw new Error('Invalid forecast data response structure');
    }

    let detailedHTML = '';
    data.properties.periods.slice(0, 10).forEach(period => {
      detailedHTML += `
        <div class="detailed-item">
            <div class="detailed-row">
                <div class="detailed-col-day">
                    <div class="detailed-day">${period.name}</div>
                </div>
                <div class="detailed-col-icon">
                    <div class="detailed-icon"><img src="${period.icon}" alt="${period.shortForecast}"></div>
                </div>
                <div class="detailed-col-forecast">
                    <div class="detailed-forecast">${period.detailedForecast}</div>
                </div>
            </div>
        </div>
        `;
    });

    safeSetHTML('detailed-forecast', detailedHTML);
  } catch (error) {
    console.error('Error fetching detailed forecast:', error);
    safeSetHTML('detailed-forecast', '<div class="detailed-item">Detailed forecast unavailable. Please try again later.</div>');
  }
}

export async function fetchCurrentWarnings(lat, lon) {
  try {
    const response = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Invalid alerts data response structure');
    }

    let alertsHTML = '';
    if (data.features.length === 0) {
      alertsHTML = '<div class="alert"><div class="alert-none"><i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon" ></i > <b>No active alerts</b></div></div > ';
    } else {
      data.features.forEach((alert, index) => {
        if (!alert.properties) return;

        const eventName = alert.properties.event || 'Unknown Alert';
        let description = alert.properties.description || 'No description available.';
        description = description.replace(/\r\n/g, "\n");
        const paragraphs = description.split(/\n\s*\n/);
        const formattedDescription = paragraphs.map(p => `<p>${p.replace(/\n/g, " ")}</p>`).join("");

        // Get the background color from warningColors.js
        const bgColor = warningColors[eventName] || '#FFFFFF'; // Default to white if not found
        const textColor = getContrastingTextColor(bgColor); // Helper function to determine text color

        alertsHTML += `
          <div class="alert" style="background-color: ${bgColor}; color: ${textColor};">
            <input type="checkbox" id="alert-${index}" class="alert-toggle">
            <label for="alert-${index}" class="alert-title" style="color: ${textColor};">
              <i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i>
              ${eventName}
            </label>
            <div class="alert-details">
              ${formattedDescription}
            </div>
          </div>
        `;
      });
    }

    safeSetHTML('alerts', alertsHTML);
  } catch (error) {
    console.error('Error fetching current warnings:', error);
    safeSetHTML('alerts', '<div class="alert"><p><b>Unable to fetch alerts. Please try again later.</b></p></div>');
  }
}

export async function fetchAFDText(wfo) {
  try {
    if (!wfo) throw new Error('No WFO identifier provided');

    const afdUrl = `https://forecast.weather.gov/product.php?site=${wfo}&issuedby=${wfo}&product=AFD&format=txt&version=1&glossary=0`;
    const response = await fetch(afdUrl);

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    let afdContent = doc.querySelector("pre") ? doc.querySelector("pre").innerText : doc.body.innerText;
    afdContent = afdContent.replace(/&&/g, "").replace(/\r\n/g, "\n");

    const paragraphs = afdContent.split(/\n\s*\n/);
    const formatted = paragraphs.map(p => `<p>${p.replace(/\n/g, " ")}</p>`).join("");

    safeSetHTML("afd-content", formatted);
    return true;
  } catch (error) {
    console.error('Error fetching AFD text:', error);
    safeSetText("afd-content", "Error loading forecast discussion. Please try again later.");
    return false;
  }
}

// Helper function to determine if text should be black or white based on background color
function getContrastingTextColor(hexColor) {
  // Remove the # if it exists
  hexColor = hexColor.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);

  // Calculate perceived brightness using the formula: (R*0.299 + G*0.587 + B*0.114)
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

  // Use white text for dark backgrounds and black text for light backgrounds
  return brightness < 128 ? '#FFFFFF' : '#000000';
}