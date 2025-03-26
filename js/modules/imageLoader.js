// imageLoader.js
export function createImageLoader(config) {
    // Config contains module-specific settings
    const {
        containerId,
        imageId,
        loadingId,
        errorId,
        timestampId,
        playButtonId,
        selectorId,
        getImageUrls,
        defaultRegion,
        defaultProduct
    } = config;

    let images = [];
    let currentImageIndex = 0;
    let isAnimating = false;
    let currentRegion = defaultRegion || '';
    let currentProduct = defaultProduct || '';

    // Common functions
    async function fetchImageData() {
        const selector = document.getElementById(selectorId);
        const selectorValue = selector ? selector.value : currentRegion || currentProduct;

        // Show loading state
        const loadingElement = document.getElementById(loadingId);
        const containerElement = document.getElementById(containerId);
        const errorElement = document.getElementById(errorId);

        if (loadingElement) loadingElement.style.display = 'block';
        if (containerElement) containerElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        // Get image URLs
        const imageUrls = await getImageUrls(selectorValue);

        if (imageUrls.length > 0) {
            images = imageUrls;
            currentImageIndex = 0;
            updateImage(images[currentImageIndex]);

            // Enable animation button if multiple images are available
            const playButton = document.getElementById(playButtonId);
            if (playButton) {
                if (images.length > 1) {
                    playButton.disabled = false;
                    playButton.title = "";
                } else {
                    playButton.disabled = true;
                    playButton.title = "Animation not available";
                }
            }
        } else {
            document.getElementById(loadingId).style.display = 'none';
            document.getElementById(errorId).style.display = 'block';
        }
    }

    function updateImage(imageUrl) {
        const img = document.getElementById(imageId);
        if (!img) return;

        img.onload = function () {
            // Update UI elements
            document.getElementById(loadingId).style.display = 'none';
            document.getElementById(containerId).style.display = 'block';
            document.getElementById(errorId).style.display = 'none';

            // Update timestamp
            updateTimestamp();
        };

        img.onerror = function () {
            console.error(`Failed to load image: ${imageUrl}`);
            document.getElementById(loadingId).style.display = 'none';
            document.getElementById(containerId).style.display = 'none';
            document.getElementById(errorId).style.display = 'block';
        };

        img.src = imageUrl;
    }

    function updateTimestamp() {
        const timestampElement = document.getElementById(timestampId);
        if (!timestampElement) return;

        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        timestampElement.textContent = isAnimating ?
            "Animated Loop" : formattedTime + " (latest)";
    }

    function toggleAnimation() {
        const button = document.getElementById(playButtonId);
        if (!button) return;

        if (isAnimating) {
            stopAnimation();
            button.innerHTML = '<i class="fa-solid fa-play"></i>';
        } else {
            startAnimation();
            button.innerHTML = '<i class="fa-solid fa-pause"></i>';
        }
    }

    function startAnimation() {
        if (images.length < 2) return;
        isAnimating = true;

        // Switch to animated image
        currentImageIndex = 1;
        updateImage(images[currentImageIndex]);
    }

    function stopAnimation() {
        isAnimating = false;

        // Switch back to static image
        currentImageIndex = 0;
        updateImage(images[currentImageIndex]);
    }

    function changeSelection() {
        // Reset animation state
        if (isAnimating) {
            isAnimating = false;
            const button = document.getElementById(playButtonId);
            if (button) {
                button.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        }

        // Update current selection value
        const selector = document.getElementById(selectorId);
        if (selector) {
            if (currentRegion !== undefined) {
                currentRegion = selector.value;
            }
            if (currentProduct !== undefined) {
                currentProduct = selector.value;
            }
        }

        fetchImageData();
    }

    function initialize() {
        // Add event listeners
        const playButton = document.getElementById(playButtonId);
        if (playButton) {
            playButton.addEventListener('click', toggleAnimation);
        }

        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.addEventListener('change', changeSelection);
        }

        // Load initial data
        fetchImageData();
    }

    return {
        initialize,
        fetchData: fetchImageData
    };
}