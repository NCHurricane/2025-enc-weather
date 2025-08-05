/**
* Fixed Tropical Data API Module
* FIXES: Path resolution issues that cause double js/modules in URLs
*/

/**
* Get the correct base path for tropical data files
*/
function getTropicalBasePath() {
const path = window.location.pathname;

// If we're in a county subdirectory, need to go up to root
if (path.includes('/counties/')) {
return '../../js/modules/';
}

// If we're at root level (index.html or tropical.html)
return 'js/modules/';
}

/**
* Fetches tropical storm data using the most reliable method available
* FIXED: Uses proper path resolution
*/
export async function getTropicalData() {
const basePath = getTropicalBasePath();

try {
// Try the PHP API endpoint first (most up-to-date)
console.log("Attempting to fetch from PHP API...");
const phpUrl = `${basePath}tropical_data.php`;
console.log("PHP URL:", phpUrl);

const response = await fetch(phpUrl);
if (response.ok) {
const data = await response.json();
console.log("Successfully loaded data from PHP API");
return data;
}
throw new Error(`PHP API request failed: ${response.status}`);
} catch (error) {
console.warn("Could not load from PHP API:", error);

try {
// Try the cached JSON file
console.log("Attempting to fetch from cached JSON...");
const cacheUrl = `${basePath}cache/nhc_current_storms.json`;
console.log("Cache URL:", cacheUrl);

const response = await fetch(cacheUrl);
if (response.ok) {
const data = await response.json();
console.log("Successfully loaded data from cache file");
return data;
}
throw new Error(`Cache file request failed: ${response.status}`);
} catch (cacheError) {
console.warn("Could not load from cache file:", cacheError);

try {
// Fall back to example data
console.log("Attempting to fetch from example data...");
const exampleUrl = `${basePath}CurrentStorms[example2].json`;
console.log("Example URL:", exampleUrl);

const response = await fetch(exampleUrl);
if (response.ok) {
const data = await response.json();
console.log("Successfully loaded from example data");
return data;
}
throw new Error(`Example data request failed: ${response.status}`);
} catch (fallbackError) {
console.error("All data sources failed:", fallbackError);
// Return an empty data structure as last resort
return { activeStorms: [] };
}
}
}
}