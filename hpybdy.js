console.log("Interactive Audio Player script loaded.");

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffersCache = {}; // Cache for decoded audio buffers
const audioAssetBaseUrl = 'https://play.rosebud.ai/assets/';
const audioAssetMap = {
    1: `${audioAssetBaseUrl}1.wav?pZQt`, // Updated to valid asset as per list
    2: `${audioAssetBaseUrl}2.wav?aNWz`,
    3: `${audioAssetBaseUrl}3.wav?LDG1`,
    4: `${audioAssetBaseUrl}4.wav?gUhh`,
    5: `${audioAssetBaseUrl}5.wav?yqY5`,
    6: `${audioAssetBaseUrl}6.wav?szF0`,
    7: `${audioAssetBaseUrl}7.wav?UfIX`,
    8: `${audioAssetBaseUrl}8.wav?ve7E`,
};
const WHATSAPP_IMG_URL_INITIAL = 'https://play.rosebud.ai/assets/WhatsApp Image 2025-06-01 at 18.24.48.jpeg?w9B8';
const WHATSAPP_IMG_URL_ALTERNATE = 'https://play.rosebud.ai/assets/WhatsApp Image 2025-06-01 at 18.28.36.jpeg?ABbj';
let audioPlayCount = 0;
let currentWhatsappImageUrl = WHATSAPP_IMG_URL_INITIAL; // Will be used by showRandomWhatsappImage for the initial image
const WHATSAPP_IMG_DISPLAY_WIDTH = 300; // px (Increased from 200 to 300, a 50% increase)
const WHATSAPP_IMG_ASPECT_RATIO = 1600 / 1204; // Original height / width
const WHATSAPP_IMG_DISPLAY_HEIGHT = WHATSAPP_IMG_DISPLAY_WIDTH * WHATSAPP_IMG_ASPECT_RATIO;
// New constants for alternate image size (50% larger than original, i.e., 1.5x)
const ALTERNATE_IMG_DISPLAY_WIDTH = WHATSAPP_IMG_DISPLAY_WIDTH * 1.5;
const ALTERNATE_IMG_DISPLAY_HEIGHT = WHATSAPP_IMG_DISPLAY_HEIGHT * 1.5;
const FLASHING_IMG_CLASS = 'flashing-whatsapp-image';
const PERMANENT_IMG_CLASS = 'permanent-alternate-whatsapp-image';
const permanentAlternateImages = []; // Array to store references to permanent images
const audioSequenceNumbers = [1, 1, 2, 1, 4, 3, 1, 1, 2, 1, 5, 4, 1, 1, 8, 6, 4, 3, 2, 7, 7, 6, 4, 5, 4];
const audioSequencePaths = audioSequenceNumbers.map(num => audioAssetMap[num]);
let currentAudioIndex = 0;
let isExperienceActive = false; // Controls if interactions should play sounds
async function loadAudio(url) {
    if (audioBuffersCache[url]) {
        console.log("Audio retrieved from cache:", url);
        return audioBuffersCache[url];
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffersCache[url] = decodedBuffer; // Cache the buffer
        console.log("Audio loaded and cached successfully:", url);
        // Clear any previous error message displayed on the body
        const existingErrorMsg = document.body.querySelector('.audio-error.message-box');
        if (existingErrorMsg && existingErrorMsg.textContent.includes(url.substring(url.lastIndexOf('/') + 1))) {
            existingErrorMsg.remove();
        }
        return decodedBuffer;
    } catch (error) {
        console.error(`Error loading audio from ${url}:`, error);
        // Display error message directly on the body
        let errorMsgElement = document.body.querySelector(`.audio-error.message-box[data-url="${url}"]`);
        if (!errorMsgElement) {
            errorMsgElement = document.createElement('div');
            errorMsgElement.className = 'audio-error message-box';
            errorMsgElement.dataset.url = url; // Store URL to identify message later
            errorMsgElement.style.position = 'fixed';
            errorMsgElement.style.bottom = '20px';
            errorMsgElement.style.left = '50%';
            errorMsgElement.style.transform = 'translateX(-50%)';
            errorMsgElement.style.padding = '10px 15px';
            errorMsgElement.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
            errorMsgElement.style.color = 'white';
            errorMsgElement.style.borderRadius = '5px';
            errorMsgElement.style.zIndex = '1001'; // Ensure it's above other elements
            errorMsgElement.style.textAlign = 'center';
            document.body.appendChild(errorMsgElement);
        }
        errorMsgElement.textContent = `Failed to load sound: ${url.substring(url.lastIndexOf('/') + 1)}. See console.`;
        
        // Optional: auto-remove the message after a few seconds
        setTimeout(() => {
            if (errorMsgElement && errorMsgElement.parentNode) {
                errorMsgElement.remove();
            }
        }, 5000);
        return null; // Return null if loading failed
    }
}
async function playNextSoundInSequence() {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    const path = audioSequencePaths[currentAudioIndex];
    console.log(`Attempting to play: ${path} (index: ${currentAudioIndex})`);
    
    const bufferToPlay = await loadAudio(path); // loadAudio now handles caching
    if (bufferToPlay) {
        const source = audioContext.createBufferSource(); // Create a new source node each time
        source.buffer = bufferToPlay;
        source.connect(audioContext.destination);
        source.start(0);
        console.log(`Playing: ${path}`);
        audioPlayCount++;
        console.log(`Audio play count: ${audioPlayCount}`);
        // === Image Logic Start ===
        // Ensure any flashing image from the *previous* sound event is removed immediately
        // before deciding to show a new flashing image or a permanent alternate image for the current sound event.
        const existingFlashingImg = document.querySelector(`.${FLASHING_IMG_CLASS}`);
        if (existingFlashingImg) {
            existingFlashingImg.remove();
            console.log("Immediately removed any pre-existing flashing image.");
        }
        const isEndOfCycle = audioPlayCount > 0 && audioPlayCount % audioSequencePaths.length === 0;
        if (isEndOfCycle) {
            // End of a cycle: Add permanent alternate image.
            // The flashing image for *this* cycle's end sound is intentionally not shown.
            // Any flashing image from the *previous* sound has already been removed by the code above.
            console.log(`Audio sequence completed. Total plays: ${audioPlayCount}. Adding permanent alternate image.`);
            addPermanentAlternateImage(); // This function uses WHATSAPP_IMG_URL_ALTERNATE
        } else {
            // Not the end of a cycle: Show the new flashing initial image.
            // (showRandomWhatsappImage also has its own internal cleanup for robustness, which is fine)
            showRandomWhatsappImage(WHATSAPP_IMG_URL_INITIAL);
        }
        // === Image Logic End ===
    } else {
        console.warn(`Cannot play sound, buffer for ${path} is null or failed to load.`);
    }
    currentAudioIndex = (currentAudioIndex + 1) % audioSequencePaths.length;
}
// This function now exclusively handles the flashing initial image.
function showRandomWhatsappImage(imageUrl) {
    // Remove any existing flashing image
    const existingImg = document.querySelector(`.${FLASHING_IMG_CLASS}`);
    if (existingImg) {
        existingImg.remove();
    }
    const img = document.createElement('img');
    img.src = imageUrl; // This will be WHATSAPP_IMG_URL_INITIAL
    img.className = FLASHING_IMG_CLASS;
    img.style.position = 'fixed';
    img.style.width = `${WHATSAPP_IMG_DISPLAY_WIDTH}px`;
    img.style.height = 'auto'; // Maintain aspect ratio based on width
    img.style.zIndex = '2000'; // Ensure it's above permanent images if they have lower z-index
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    img.style.pointerEvents = 'none'; // So it doesn't interfere with background clicks
    // Calculate random position, ensuring the image is mostly on screen
    const maxTop = window.innerHeight - WHATSAPP_IMG_DISPLAY_HEIGHT;
    const maxLeft = window.innerWidth - WHATSAPP_IMG_DISPLAY_WIDTH;
    img.style.top = `${Math.max(0, Math.random() * maxTop)}px`;
    img.style.left = `${Math.max(0, Math.random() * maxLeft)}px`;
    // Random rotation
    img.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    // Fade-in and fade-out logic
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease-in-out';
    document.body.appendChild(img);
    // Force reflow for transition to apply correctly on new element
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double RAF for robustness
             img.style.opacity = '1';
        });
    });
    const FADE_DURATION_MS = 300;
    const VISIBLE_DURATION_MS = 1200; // How long it stays at full opacity
    setTimeout(() => {
        img.style.opacity = '0';
        // Remove from DOM after fade-out transition completes
        setTimeout(() => {
            if (img.parentNode) {
                img.parentNode.removeChild(img);
            }
        }, FADE_DURATION_MS);
    }, VISIBLE_DURATION_MS);
}
// This function adds a permanent alternate image to the screen.
function addPermanentAlternateImage() {
    const img = document.createElement('img');
    img.src = WHATSAPP_IMG_URL_ALTERNATE;
    img.className = PERMANENT_IMG_CLASS;
    img.style.position = 'fixed';
    img.style.width = `${ALTERNATE_IMG_DISPLAY_WIDTH}px`; // Use new width
    img.style.height = 'auto'; // Maintain aspect ratio based on width
    img.style.zIndex = '1500'; // Below flashing images (2000), above other messages
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    img.style.pointerEvents = 'none'; // So it doesn't interfere with background clicks
    // Calculate random position, ensuring the image is mostly on screen, using new dimensions
    const maxTop = window.innerHeight - ALTERNATE_IMG_DISPLAY_HEIGHT;
    const maxLeft = window.innerWidth - ALTERNATE_IMG_DISPLAY_WIDTH;
    img.style.top = `${Math.max(0, Math.random() * maxTop)}px`;
    img.style.left = `${Math.max(0, Math.random() * maxLeft)}px`;
    // Random rotation
    img.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
    // Fade-in effect
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.5s ease-in-out';
    document.body.appendChild(img);
    permanentAlternateImages.push(img); // Keep track of the permanent image
    // Force reflow for transition to apply correctly on new element
    requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double RAF for robustness
             img.style.opacity = '1';
        });
    });
    console.log(`Added permanent alternate image. Total permanent images: ${permanentAlternateImages.length}`);
}
// Event listeners
document.addEventListener('click', () => {
    if (!isExperienceActive) {
        console.log("Document clicked, but experience not active yet.");
        return;
    }
    console.log("Mouse clicked");
    playNextSoundInSequence();
});
document.addEventListener('keydown', (event) => {
    if (!isExperienceActive) {
        console.log(`Key pressed (${event.key}), but experience not active yet.`);
        return;
    }
    // Prevent playing sound for modifier keys if they are pressed alone
    if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
    console.log(`Key pressed: ${event.key}`);
    playNextSoundInSequence();
});
function createActivateButton() {
    const activateButton = document.createElement('div');
    activateButton.id = 'activate-button';
    activateButton.textContent = 'click to activate';
    activateButton.style.position = 'fixed';
    activateButton.style.top = '50%';
    activateButton.style.left = '50%';
    activateButton.style.transform = 'translate(-50%, -50%)';
    activateButton.style.padding = '30px 45px'; // Same as restart button
    activateButton.style.backgroundColor = 'lightpink'; // Pink background
    activateButton.style.color = 'crimson';       // Red text (Crimson for good contrast)
    activateButton.style.borderRadius = '10px';   // Same as restart button
    activateButton.style.cursor = 'pointer';
    activateButton.style.zIndex = '2900';         // High, but below restart button
    activateButton.style.fontFamily = 'Arial, sans-serif'; // Same as restart
    activateButton.style.fontWeight = 'bold';            // Same as restart
    activateButton.style.fontSize = '28px';              // Same as restart
    activateButton.style.userSelect = 'none';            // Same as restart
    activateButton.style.textAlign = 'center';
    activateButton.addEventListener('click', async (event) => {
        event.stopPropagation(); // Important: prevent this click from bubbling to document click
        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
                console.log("Audio context resumed by activate button.");
            } catch (err) {
                console.error("Error resuming audio context:", err);
                // Optionally, display a message to the user here
            }
        }
        isExperienceActive = true;
        activateButton.remove();
        console.log("Activate button clicked and removed. Experience is now active.");
    });
    document.body.appendChild(activateButton);
    console.log("Activate button created.");
}
function createRestartButton() {
    const restartButton = document.createElement('div');
    restartButton.id = 'restart-button';
    restartButton.textContent = 'RESTART';
    restartButton.style.position = 'fixed';
    restartButton.style.top = '20px';
    restartButton.style.right = '20px';
    restartButton.style.padding = '30px 45px'; // Further increased padding for a larger button
    restartButton.style.backgroundColor = '#ADD8E6'; // Opaque pale sky blue
    restartButton.style.color = '#0056b3'; // Darker blue text for better contrast on light blue
    restartButton.style.borderRadius = '10px'; // Adjusted border radius for new size
    restartButton.style.cursor = 'pointer';
    restartButton.style.zIndex = '3000'; // This is already higher than images (1500, 2000)
    restartButton.style.fontFamily = 'Arial, sans-serif';
    restartButton.style.fontWeight = 'bold';
    restartButton.style.fontSize = '28px'; // Further increased font size
    restartButton.style.userSelect = 'none'; // Prevent text selection
    restartButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent triggering the general click listener on body
        restartGame();
    });
    document.body.appendChild(restartButton);
}
function restartGame() {
    console.log("Restarting game...");
    // Remove all flashing images
    const flashingImages = document.querySelectorAll(`.${FLASHING_IMG_CLASS}`);
    flashingImages.forEach(img => img.remove());
    // Remove all permanent alternate images
    permanentAlternateImages.forEach(img => img.remove());
    permanentAlternateImages.length = 0; // Clear the array
    // Reset game state variables
    audioPlayCount = 0;
    currentAudioIndex = 0;
    // Remove any lingering audio error messages
    const errorMessages = document.querySelectorAll('.audio-error.message-box');
    errorMessages.forEach(msg => msg.remove());
    
    isExperienceActive = false; // Reset activation state
    // Remove activate button if it exists
    const activateButton = document.getElementById('activate-button');
    if (activateButton) {
        activateButton.remove();
    }
    // Re-evaluate activation state (e.g., show activate button if audio is suspended)
    if (audioContext.state === 'suspended') {
        // Check if an activate button already exists (should have been removed, but good practice)
        if (!document.getElementById('activate-button')) {
            createActivateButton();
        }
        console.log("Game restarted. Audio suspended, activate button shown.");
    } else {
        isExperienceActive = true; // Audio not suspended, activate immediately
        console.log("Game restarted. Audio not suspended, experience active.");
    }
    console.log("Game restarted fully. Counters reset, images cleared, activation state re-evaluated.");
}
// Initial setup
createRestartButton(); // Initialize the restart button
// Check if audio context needs user interaction to start
if (audioContext.state === 'suspended') {
    // Ensure no old text message is created
    const oldSuspendMsg = document.querySelector('.audio-suspended-message');
    if (oldSuspendMsg) {
        oldSuspendMsg.remove();
    }
    createActivateButton(); // Show the new button if audio needs user gesture
    // isExperienceActive remains false until the new button is clicked
    console.log("Audio context suspended. 'Click to activate' button shown.");
} else {
    isExperienceActive = true; // Audio context is active, experience can start immediately
    console.log("Audio context not suspended. Experience active from start.");
}
