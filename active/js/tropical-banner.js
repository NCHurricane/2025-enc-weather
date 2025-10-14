// =============================
// Atlantic Tropical Alert banner - active/js/tropical-banner.js
// Handles rendering of the tropical alert banner
//
// Uses the NHC active storms data to display a banner alert of current active tropical systems in the Atlantic basin
// User can click on the system name to go to the detailed active storm page
// ==============================

const STORM_CLASSIFICATIONS = {
  TD: "Tropical Depression",
  TS: "Tropical Storm",
  HU: "Hurricane",
  MH: "Major Hurricane",
  STD: "Subtropical Depression",
  STS: "Subtropical Storm",
  PTC: "Post-tropical Cyclone",
  PC: "Potential Tropical Cyclone",
};

/**
 * Fetch active storm data from cache/API
 * @returns {Promise<Array>} Array of active Atlantic storms
 */
/**
 * Fetch active storm data from cache/API
 * @returns {Promise<Array>} Array of active Atlantic storms
 */
async function fetchActiveStorms() {
  try {
    // Use relative path from document root
    const CACHE_URL = "active/cache/nhc_current_storms.json";

    // Add cache-busting with 15-minute bucket
    const now = new Date();
    const bucket = Math.floor(now.getTime() / (15 * 60 * 1000));
    const cacheBustedUrl = `${CACHE_URL}?t=${bucket}`;

    const response = await fetch(cacheBustedUrl);
    if (!response.ok) {
      console.warn("Cache not available, attempting direct API...");
      return [];
    }

    const data = await response.json();

    let activeStorms = [];
    if (Array.isArray(data.activeStorms)) {
      activeStorms = data.activeStorms;
    } else if (data.data && Array.isArray(data.data.activeStorms)) {
      activeStorms = data.data.activeStorms;
    } else if (data.data && Array.isArray(data.data.storms)) {
      activeStorms = data.data.storms;
    }

    console.log("Raw active storms:", activeStorms);

    const atlanticStorms = activeStorms.filter((storm) => {
      if (!storm.binNumber) return false;
      const binUpper = storm.binNumber.toUpperCase();
      return binUpper.startsWith("AL") || binUpper.startsWith("AT");
    });

    console.log("Filtered Atlantic storms:", atlanticStorms);

    return atlanticStorms;
  } catch (error) {
    console.error("Error fetching storm data:", error);
    return [];
  }
}

/**
 * Display "No Active Systems" message
 */
function displayNoActiveSystems() {
  const bannerContainer = document.querySelector(".tropical-banner");
  if (!bannerContainer) return;

  bannerContainer.innerHTML = "";

  const noSystemsContainer = document.createElement("div");
  noSystemsContainer.className = "no-active-systems";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-check";

  const message = document.createElement("span");
  message.textContent = "No active systems";

  noSystemsContainer.appendChild(icon);
  noSystemsContainer.appendChild(message);
  bannerContainer.appendChild(noSystemsContainer);
}

/**
 * Display active tropical systems
 * @param {Array} storms - Array of active storm data
 */
function displayActiveStorms(storms) {
  const bannerContainer = document.querySelector(".tropical-banner");
  if (!bannerContainer) return;

  bannerContainer.innerHTML = "";


  const alertHeader = document.createElement("div");
  alertHeader.className = "active-systems-header";

  const headerText = document.createElement("span");
  headerText.textContent =
    storms.length === 1 ? "Active System" : "Active Systems";
  alertHeader.appendChild(headerText);


  const stormsContainer = document.createElement("div");
  stormsContainer.className = "active-systems-container";


  storms.forEach((storm) => {
    const stormDiv = document.createElement("div");
    stormDiv.className = "active-system-item";


    const stormIcon = document.createElement("i");
    stormIcon.className = "fa-solid fa-hurricane";


    if (storm.classification === "HU" || storm.classification === "MH") {
      stormIcon.style.color = "red";
    } else if (
      storm.classification === "TS" ||
      storm.classification === "STS"
    ) {
      stormIcon.style.color = "orange";
    } else {
      stormIcon.style.color = "blue";
    }

    const stormLink = document.createElement("a");
    stormLink.href = `active/?storm=${storm.id.toUpperCase()}`;
    stormLink.className = "active-system-link";

    const classification =
      STORM_CLASSIFICATIONS[storm.classification] || "Tropical Cyclone";

    stormLink.innerHTML = `
            <span class="storm-classification">${classification}</span>
            <span class="storm-name">${storm.name}</span>
        `;

    stormDiv.appendChild(stormIcon);
    stormDiv.appendChild(stormLink);
    stormsContainer.appendChild(stormDiv);
  });

  bannerContainer.appendChild(alertHeader);
  bannerContainer.appendChild(stormsContainer);
}

/**
 * Initialize and update the tropical banner
 * Main export function - replaces previous initTropicalBanner and other functions
 */
export async function initTropicalBanner() {
  console.log("Initializing consolidated tropical banner system");

  try {
    const activeStorms = await fetchActiveStorms();

    if (activeStorms.length > 0) {
      console.log(`Found ${activeStorms.length} active Atlantic systems`);
      displayActiveStorms(activeStorms);
    } else {
      console.log("No active tropical systems found");
      displayNoActiveSystems();
    }
  } catch (error) {
    console.error("Error initializing tropical banner:", error);
    displayNoActiveSystems();
  }
}

/**
 * Legacy function names for backward compatibility
 * Remove these after updating your initialization code
 */
export function checkActiveStorms() {
  return initTropicalBanner();
}

export function updateTropicalAlertBanner() {
  return initTropicalBanner();
}
