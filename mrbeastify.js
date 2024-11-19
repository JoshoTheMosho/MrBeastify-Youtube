const imagesPath = "images/";
const customImagesPath = "images/custom/";
var useAlternativeImages
var flipBlacklist // Stores flipBlackList.js
var blacklistStatus
var extensionName = chrome.runtime.getManifest().name;

// Config
var extensionIsDisabled = false
var appearChance = 1.00//%
var flipChance = 0.25//%
var imageSplit = 50;     // Percentage split between MrBeast and Custom images

// Image counters
var highestImageIndex;
var highestCustomImageIndex;

// Separate arrays to track last selected images
const lastMrBeastImages = [];
const lastCustomImages = [];
const sizeOfNonRepeat = 10; // Track last N images for no-repeat

let customImages = [];

async function loadCustomImages() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                const customImagesKeys = Object.keys(items).filter(key => key.startsWith('/images/custom/'));
                customImages = customImagesKeys.map(key => items[key]);
                resolve();
            }
        });
    });
}

// Apply the overlay
function applyOverlay(thumbnailElement, overlayImageURL, flip = false) {
    // Create a new img element for the overlay
    const overlayImage = document.createElement("img");
    overlayImage.id = extensionName;
    overlayImage.src = overlayImageURL;
    overlayImage.style.position = "absolute";
    overlayImage.style.top = overlayImage.style.left = "50%";
    overlayImage.style.width = "100%";
    overlayImage.style.transform = `translate(-50%, -50%) ${flip ? 'scaleX(-1)' : ''}`; // Center and flip the image
    overlayImage.style.zIndex = "0"; // Ensure overlay is on top but below the time indicator
    thumbnailElement.parentElement.insertBefore(overlayImage, thumbnailElement.nextSibling /*Makes sure the image doesn't cover any info, but still overlays the original thumbnail*/);
};

// Determine which image set to use based on the percentage split
function getRandomImageSource() {
    const randomizer = Math.random() * 100;
    console.log(imageSplit)
    console.log(highestCustomImageIndex)
    console.log(lastCustomImages)
    if (randomizer < imageSplit && highestCustomImageIndex > 0) {
        return { path: customImagesPath, maxIndex: highestCustomImageIndex, lastImages: lastCustomImages };
    } else {
        return { path: imagesPath, maxIndex: highestImageIndex, lastImages: lastMrBeastImages };
    }
}

// Get a random image URL from the chosen directory
function getRandomImageFromDirectory() {
    const { path, lastImages } = getRandomImageSource();
    let randomImageSrc = '';

    if (path === customImagesPath && customImages.length > 0) {
        let randomIndex = -1;

        while (lastImages.includes(randomIndex) || randomIndex < 0) {
            randomIndex = Math.floor(Math.random() * customImages.length);
        }

        lastImages.push(randomIndex);
        if (lastImages.length > sizeOfNonRepeat) {
            lastImages.shift();
        }

        randomImageSrc = customImages[randomIndex];
    } else {
        // Existing logic for built-in images
        let randomIndex = -1;

        while (lastImages.includes(randomIndex) || randomIndex < 0) {
            randomIndex = Math.floor(Math.random() * highestImageIndex) + 1;
        }

        lastImages.push(randomIndex);
        if (lastImages.length > sizeOfNonRepeat) {
            lastImages.shift();
        }

        randomImageSrc = chrome.runtime.getURL(`${path}${randomIndex}.png`);
    }

    return randomImageSrc;
}

function FindThumbnails() {
    var thumbnailImages = document.querySelectorAll("ytd-thumbnail a > yt-image > img.yt-core-image");
    var notificationImages = document.querySelectorAll('img.style-scope.yt-img-shadow[width="86"]');

    const allImages = [ // Put all the selected images into an array
        ...Array.from(thumbnailImages),
        ...Array.from(notificationImages),
    ];

    // Check whether the aspect ratio matches that of a thumbnail
    const targetAspectRatio = [16 / 9, 4 / 3];
    const errorMargin = 0.02; // Allows for 4:3, since YouTube is badly coded

    var listAllThumbnails = allImages.filter(image => {
        // Check if the height is not 0 before calculating the aspect ratio
        if (image.height === 0) {
            return false;
        }

        const aspectRatio = image.width / image.height;
        let isCorrectAspectRatio = (Math.abs(aspectRatio - targetAspectRatio[0]) < errorMargin) || (Math.abs(aspectRatio - targetAspectRatio[1]) < errorMargin);
        return isCorrectAspectRatio;
    });

    // Select all images from the recommended video screen
    var videowallImages = document.querySelectorAll(".ytp-videowall-still-image"); // Because youtube video wall images are not properly classified as images

    listAllThumbnails = listAllThumbnails.concat(Array.from(videowallImages));

    return listAllThumbnails.filter(image => {
        const parent = image.parentElement;

        // Checks whether it's a video preview
        const isVideoPreview = parent.closest("#video-preview") !== null || parent.tagName == "YTD-MOVING-THUMBNAIL-RENDERER"

        // Checks whether it's a chapter thumbnail
        const isChapter = parent.closest("#endpoint") !== null

        // Check if thumbnails have already been processed
        const processed = Array.from(parent.children).filter(child => {
            const alreadyHasAThumbnail =
                child.id && // Child has ID
                child.id.includes(extensionName);

            return (
                alreadyHasAThumbnail
                || isVideoPreview
                || isChapter
            )
        });

        return processed.length == 0;
    });
}

// Looks for all thumbnails and applies overlay
function applyOverlayToThumbnails() {
    thumbnailElements = FindThumbnails()

    // Apply overlay to each thumbnail
    thumbnailElements.forEach((thumbnailElement) => {
        // Apply overlay and add to processed thumbnails
        const loops = Math.random() > 0.001 ? 1 : 20; // Easter egg

        for (let i = 0; i < loops; i++) {
            // Determine the image URL and whether it should be flipped
            let flip = Math.random() < flipChance;
            let baseImagePath = getRandomImageFromDirectory();
            if (flip && flipBlacklist && flipBlacklist.includes(baseImagePath)) {
                if (useAlternativeImages) {
                    baseImagePath = `textFlipped/${baseImagePath}`;
                }
                flip = false;
            }

            const overlayImageURL = Math.random() < appearChance ?
                baseImagePath :
                ""; // Just set the url to "" if we don't want MrBeast to appear lol

            applyOverlay(thumbnailElement, overlayImageURL, flip);
        }
    });

}

// Get the URL of an image
function getImageURL(path, index) {
    return chrome.runtime.getURL(`${path}${index}.png`);
}

// Checks if an image exists in the image folder
async function checkImageExistence(path, index) {
    console.log("Checking image existence for", path, index)
    const testedURL = getImageURL(path, index)

    return fetch(testedURL)
        .then(() => {
            return true
        }).catch(error => {
            return false
        })
}

////////////////////////
//  BrandonXLF Magic  //
////////////////////////

// Defines the N size of last images that will not be repeated.
const size_of_non_repeat = 8
// List of the index of the last N selected images.
const last_indexes = Array(size_of_non_repeat)

var highestImageIndex;
// Fetch the highest index of images in a folder
async function getHighestImageIndex(path) {
    let i = 4;
    while (await checkImageExistence(path, i)) {
        i *= 2;
    }
    let min = i <= 4 ? 1 : i / 2;
    let max = i;

    while (min <= max) {
        let mid = Math.floor((min + max) / 2);
        if (await checkImageExistence(path, mid)) {
            min = mid + 1;
        } else {
            max = mid - 1;
        }
    }

    return max;
}

////////////////////////
//  BrandonXLF Magic  //
////////////////////////

function GetFlipBlocklist() {
    fetch(chrome.runtime.getURL(`${imagesPath}flip_blacklist.json`))
        .then(response => response.json())
        .then(data => {
            useAlternativeImages = data.useAlternativeImages;
            flipBlacklist = data.blacklistedImages;

            blacklistStatus = "Flip blacklist found. " + (useAlternativeImages ? "Images will be substituted." : "Images won't be flipped.")
        })
        .catch((error) => {
            blacklistStatus = "No flip blacklist found. Proceeding without it."
        });
}

async function LoadConfig() {
    const df = {
        extensionIsDisabled: extensionIsDisabled,
        appearChance: appearChance,
        flipChance: flipChance,
        imageSplit: imageSplit
    };

    try {
        const config = await new Promise((resolve, reject) => {
            chrome.storage.local.get(df, (result) => {
                chrome.runtime.lastError ?
                    reject(chrome.runtime.lastError) :
                    resolve(result);
            });
        });

        // Initialize variables based on loaded configuration
        extensionIsDisabled = config.extensionIsDisabled;
        appearChance = config.appearChance;
        flipChance = config.flipChance;
        imageSplit = config.imageSplit;
    } catch (error) {
        console.error("Error loading configuration:", error);
    }
}

async function Main() {
    await LoadConfig();

    if (extensionIsDisabled) {
        console.log(`${extensionName} is disabled.`);
        return;
    }

    console.log("Getting flip blocklist");
    GetFlipBlocklist();

    console.log("Getting highest image index");
    highestImageIndex = await getHighestImageIndex(imagesPath);

    console.log("Loading custom images from storage");
    await loadCustomImages(); // Load custom images here

    console.log(`${extensionName} Loaded. ${highestImageIndex} MrBeast images found. ${customImages.length} custom images found. ${blacklistStatus}.`);

    console.log("Applying overlay to thumbnails");
    setInterval(() => applyOverlayToThumbnails(), 100);
}

Main()