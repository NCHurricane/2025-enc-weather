// satellite.js
import { createImageLoader } from './imageLoader.js';

let zoomLevel = 2; // scale factor

async function createSatelliteUrls(product = 'GEOCOLOR') {
    try {
        const resolution = "2400x2400";
        const sector = 'se';
        const baseUrl = `https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/${sector}/${product}/`;

        // Static image URL
        const staticImageUrl = `${baseUrl}${resolution}.jpg`;

        // Animated GIF URL
        const animatedGifUrl = `${baseUrl}GOES16-${sector.toUpperCase()}-${product}-600x600.gif`;

        return [staticImageUrl, animatedGifUrl];
    } catch (error) {
        console.error("Error creating satellite URLs:", error);
        return [];
    }
}

// Custom image update function to handle zoom levels
function updateSatelliteImage(imageUrl, isAnimating) {
    const img = document.getElementById('satellite-image');
    if (!img) return;

    img.onload = function () {
        // Apply different zoom based on whether it's animated or static
        if (isAnimating) {
            img.style.transform = `scale(${zoomLevel * 1})`;
        } else {
            img.style.transform = `scale(${zoomLevel})`;
        }

        // Update visibility
        document.getElementById('satellite-loading').style.display = 'none';
        document.getElementById('satellite-image-container').style.display = 'block';
        document.getElementById('satellite-error').style.display = 'none';

        // Update timestamp
        const timestamp = new Date();
        const formattedTime = timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        document.getElementById('satellite-timestamp').textContent = isAnimating ?
            "Animated Loop" : formattedTime + " (latest)";
    };

    img.onerror = function () {
        console.error("Failed to load satellite image:", imageUrl);
        document.getElementById('satellite-loading').style.display = 'none';
        document.getElementById('satellite-image-container').style.display = 'none';
        document.getElementById('satellite-error').style.display = 'block';
    };

    img.src = imageUrl;
}

// Configure and create the satellite image loader
const satelliteLoader = createImageLoader({
    containerId: 'satellite-image-container',
    imageId: 'satellite-image',
    loadingId: 'satellite-loading',
    errorId: 'satellite-error',
    timestampId: 'satellite-timestamp',
    playButtonId: 'satellite-play-pause',
    selectorId: 'satellite-product-select',
    getImageUrls: createSatelliteUrls,
    defaultProduct: 'GEOCOLOR'
});

// Export functions and values
export { zoomLevel };
export function initSatellite() {
    satelliteLoader.initialize();
}