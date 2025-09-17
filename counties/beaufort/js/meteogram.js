// ==============================
// Beaufort County Meteogram Builder - meteogram.js
// Purpose: County-specific meteogram using getHourlyData() from countyData.js
// ==============================

import { getHourlyData } from "./countyData.js";

function degreesToCardinal(deg) {
  if (deg == null) return "N/A";
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

function processHourlyData(hourlyData) {
  if (!hourlyData) {
    console.error("No hourly data provided");
    return null;
  }

  let periods;
  if (hourlyData.hours && Array.isArray(hourlyData.hours)) {
    periods = hourlyData.hours;
  } else if (hourlyData.periods && Array.isArray(hourlyData.periods)) {
    periods = hourlyData.periods;
  } else {
    console.error("Invalid hourly data structure:", hourlyData);
    console.log("Expected: {hours: [...]} or {periods: [...]}");
    console.log("Received keys:", Object.keys(hourlyData));
    return null;
  }

  console.log(`Processing ${periods.length} hourly periods for meteogram`);

  const now = new Date();
  const timeframes = { 0: [], 24: [], 48: [], 72: [], 96: [] };

  periods.forEach((period) => {
    if (!period) return;

    const timestamp = new Date(period.startTime);
    if (isNaN(timestamp.getTime())) {
      console.warn("Invalid timestamp in period:", period);
      return;
    }

    const hoursSinceNow = Math.floor((timestamp - now) / (60 * 60 * 1000));

    if (hoursSinceNow < 0) return;

    let timeframeKey;
    if (hoursSinceNow < 24) timeframeKey = "0";
    else if (hoursSinceNow < 48) timeframeKey = "24";
    else if (hoursSinceNow < 72) timeframeKey = "48";
    else if (hoursSinceNow < 96) timeframeKey = "72";
    else if (hoursSinceNow < 120) timeframeKey = "96";
    else return;

    const temp = period.temperature;

    const dewpoint = period.dewpoint || null;
    const humidity = period.relativeHumidity || null;

    const precipChance = period.probabilityOfPrecipitation || null;

    let windSpeed = null;
    if (period.windSpeed) {
      const windStr = period.windSpeed;
      const numMatch = windStr.match(/(\d+)/);
      if (numMatch) windSpeed = parseInt(numMatch[1]);
    }

    let windDirection = null;
    if (period.windDirection) {
      const cardinalMap = {
        N: 0,
        NNE: 22.5,
        NE: 45,
        ENE: 67.5,
        E: 90,
        ESE: 112.5,
        SE: 135,
        SSE: 157.5,
        S: 180,
        SSW: 202.5,
        SW: 225,
        WSW: 247.5,
        W: 270,
        WNW: 292.5,
        NW: 315,
        NNW: 337.5,
      };
      windDirection = cardinalMap[period.windDirection] ?? null;
    }

    timeframes[timeframeKey].push({
      timestamp,
      temperature: temp,
      dewpoint,
      humidity,
      precipChance,
      windSpeed,
      windDirection,
    });
  });

  const processed = {};
  for (const [key, group] of Object.entries(timeframes)) {
    if (!group.length) continue;

    processed[key] = {
      labels: group.map((p) => ({
        date: p.timestamp.toLocaleDateString("en-US", {
          day: "numeric",
          month: "numeric",
        }),
        time: p.timestamp.getHours().toString().padStart(2, "0") + ":00",
      })),
      temperature: group.map((p) => p.temperature),
      dewpoint: group.map((p) => p.dewpoint),
      humidity: group.map((p) => p.humidity),
      precipChance: group.map((p) => p.precipChance),
      windSpeed: group.map((p) => p.windSpeed),
      windDirection: group.map((p) => p.windDirection),
    };
  }

  console.log("Successfully processed meteogram data");
  return processed;
}

function createMeteogramChart(timeframeKey, processedData, selectedParams) {
  if (!processedData || !processedData[timeframeKey]) {
    console.warn(`No data for timeframe: ${timeframeKey}`);
    return null;
  }

  const canvas = document.getElementById("meteogramChart");
  if (!canvas) {
    console.error("Meteogram canvas not found");
    return null;
  }

  if (window.meteogramChartInstance) {
    window.meteogramChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");
  const data = processedData[timeframeKey];
  const datasets = [];

  if (selectedParams.includes("temperature")) {
    datasets.push({
      type: "line",
      label: "Temp (°F)",
      data: data.temperature,
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.5)",
      borderWidth: 2,
      tension: 0.3,
      yAxisID: "y-temp",
      pointRadius: 3,
      order: 1,
    });
  }

  if (selectedParams.includes("dewpoint") && data.dewpoint) {
    datasets.push({
      type: "line",
      label: "Dew Point (°F)",
      data: data.dewpoint,
      borderColor: "rgb(75, 192, 192)",
      backgroundColor: "rgba(75, 192, 192, 0.5)",
      borderWidth: 2,
      tension: 0.3,
      yAxisID: "y-temp",
      pointRadius: 3,
      order: 2,
    });
  }

  if (selectedParams.includes("humidity") && data.humidity) {
    datasets.push({
      type: "line",
      label: "Humidity (%)",
      data: data.humidity,
      borderColor: "rgb(54, 162, 235)",
      backgroundColor: "rgba(54, 162, 235, 0.5)",
      borderWidth: 2,
      tension: 0.3,
      yAxisID: "y-humidity",
      pointRadius: 3,
      order: 3,
    });
  }

  if (selectedParams.includes("wind") && data.windSpeed) {
    const pointImages = data.windDirection.map((direction, index) => {
      if (
        direction === null ||
        direction === undefined ||
        data.windSpeed[index] === 0
      ) {
        return undefined;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.translate(20, 25);

      ctx.rotate(((direction + 180) * Math.PI) / 180);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -20);
      ctx.strokeStyle = "rgb(153, 102, 255)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(8, -8);
      ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fillStyle = "rgb(153, 102, 255)";
      ctx.fill();

      ctx.restore();
      return canvas;
    });

    datasets.push({
      type: "line",
      label: "Wind (mph)",
      data: data.windSpeed,
      borderColor: "rgb(153, 102, 255)",
      backgroundColor: "rgba(153, 102, 255, 0.5)",
      borderWidth: 2,
      tension: 0.3,
      yAxisID: "y-wind",
      pointRadius: 6,
      pointHoverRadius: 8,
      pointStyle: pointImages,
      order: 4,
    });
  }

  if (selectedParams.includes("precipitation") && data.precipChance) {
    datasets.push({
      type: "bar",
      label: "Precip. Chance (%)",
      data: data.precipChance,
      backgroundColor: "rgba(255, 159, 64, 0.7)",
      borderColor: "rgb(255, 159, 64)",
      borderWidth: 1,
      yAxisID: "y-precip",
      order: 5,
    });
  }

  const scales = {
    x: {
      title: { display: true, text: "Time" },
      ticks: {
        callback: function (val, index) {
          const labelObj = data.labels[index];
          return [labelObj.time, labelObj.date];
        },
      },
    },
  };

  if (
    selectedParams.includes("temperature") ||
    selectedParams.includes("dewpoint")
  ) {
    scales["y-temp"] = {
      type: "linear",
      display: true,
      position: "left",
      title: { display: true, text: "Temperature (°F)" },
    };
  }

  if (selectedParams.includes("humidity")) {
    scales["y-humidity"] = {
      type: "linear",
      display: true,
      position: "right",
      title: { display: true, text: "Humidity (%)" },
      min: 0,
      max: 100,
      grid: { drawOnChartArea: false },
    };
  }

  if (selectedParams.includes("wind")) {
    scales["y-wind"] = {
      type: "linear",
      display: true,
      position: "right",
      title: { display: true, text: "Wind Speed (mph)" },
      min: 0,
      grid: { drawOnChartArea: false },
    };
  }

  if (selectedParams.includes("precipitation")) {
    scales["y-precip"] = {
      type: "linear",
      display: true,
      position: "right",
      title: { display: true, text: "Precipitation (%)" },
      min: 0,
      max: 100,
      grid: { drawOnChartArea: false },
    };
  }

  const chart = new Chart(ctx, {
    type: "line",
    data: { labels: data.labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales,
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            title: (context) => {
              const index = context[0]?.dataIndex;
              if (index === undefined) return "Time: Unknown";
              const label = data.labels[index];
              return `Time: ${label.time} on ${label.date}`;
            },
            afterBody: (context) => {
              if (selectedParams.includes("wind") && data.windDirection) {
                const index = context[0]?.dataIndex;
                const direction = data.windDirection[index];
                return direction != null
                  ? `Wind Direction: ${degreesToCardinal(direction)}`
                  : "";
              }
              return "";
            },
          },
        },
      },
    },
  });

  window.meteogramChartInstance = chart;
  return chart;
}

function setupMeteogramControls(processedData) {
  function getSelectedTimeframe() {
    const timeframes = ["now", "24", "48", "72", "96"];
    for (const time of timeframes) {
      const radio = document.getElementById(`meteogram-${time}`);
      if (radio?.checked) {
        return time === "now" ? "0" : time;
      }
    }
    return "0";
  }

  function getSelectedParameters() {
    const params = [];
    const paramIds = [
      "temperature",
      "dewpoint",
      "humidity",
      "wind",
      "precipitation",
    ];

    for (const param of paramIds) {
      const checkbox = document.getElementById(`param-${param}`);
      if (checkbox?.checked) params.push(param);
    }

    return params.length > 0 ? params : ["temperature"];
  }

  function updateChart() {
    const timeframe = getSelectedTimeframe();
    const selectedParams = getSelectedParameters();
    createMeteogramChart(timeframe, processedData, selectedParams);
  }

  const checkboxes = document.querySelectorAll(".meteogram-param-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", updateChart);
  });

  const timeframeRadios = document.querySelectorAll(
    'input[name="meteogramTime"]'
  );
  timeframeRadios.forEach((radio) => {
    radio.addEventListener("change", updateChart);
  });

  updateChart();
}

export async function initMeteogram() {
  try {
    console.log("Initializing meteogram...");

    const hourlyData = await getHourlyData();
    if (!hourlyData) {
      console.error("Failed to fetch hourly data");
      return false;
    }

    const processedData = processHourlyData(hourlyData);
    if (!processedData) {
      console.error("Failed to process hourly data");
      return false;
    }

    setupMeteogramControls(processedData);

    console.log("Meteogram initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing meteogram:", error);
    return false;
  }
}
