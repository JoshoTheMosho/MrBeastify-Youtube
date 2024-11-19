var extensionIsDisabled
var appearChance
var flipChance

// Function to load settings from Chrome storage
function loadSettings() {
    chrome.storage.local.get({
        extensionIsDisabled: false,
        appearChance: 1.00,
        flipChance: 0.25,
        imageSplit: 50
    }, function (data) {
        document.getElementById('disableExtension').checked = !data.extensionIsDisabled;
        document.getElementById('appearChance').value = data.appearChance * 100;
        document.getElementById('flipChance').value = data.flipChance * 100;
        document.getElementById('imageSplit').value = data.imageSplit;
        document.getElementById('splitPercentage').textContent = `${data.imageSplit}%`;
    });
}

// Function to save settings to Chrome storage
function saveSettings() {
    const data = {
        extensionIsDisabled: !document.getElementById('disableExtension').checked,
        appearChance: parseInt(document.getElementById('appearChance').value) / 100,
        flipChance: parseInt(document.getElementById('flipChance').value) / 100,
        imageSplit: parseInt(document.getElementById('imageSplit').value)
    };

    chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving settings:", chrome.runtime.lastError);
        } else {
            console.log("Settings saved successfully.");
        }
    });
}

function ChangeNameInHeading() {
    // Get the extension name
    let extensionName = chrome.runtime.getManifest().name;

    // Remove "youtube" (case-insensitive) from the extension name and trim
    extensionName = extensionName.replace(/youtube/i, '').trim();

    // Replace "MrBeastify" in the title with the cleaned extension name
    const titleElement = document.getElementById('extension-title');
    titleElement.textContent = titleElement.textContent.replace('TITLE', extensionName);
}

function populateUploadedImages() {
    const uploadedImagesListModal = document.getElementById('uploadedImagesListModal');
    uploadedImagesListModal.innerHTML = ''; // Clear the list before populating

    chrome.storage.local.get(null, (items) => {
        const customImagesKeys = Object.keys(items).filter(key => key.startsWith('/images/custom/'));
        const displayedImages = new Set(); // Use a Set to track displayed images

        customImagesKeys.forEach(key => {
            if (!displayedImages.has(key)) { // Check if the image has already been displayed
                const listItem = document.createElement('li');
                listItem.textContent = key; // Display the file name

                const img = document.createElement('img');
                img.src = items[key]; // Use the image content as the source
                img.width = 50; // Set a width for display
                img.alt = key;

                // Create delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = function () {
                    chrome.storage.local.remove(key, function () {
                        console.log(`${key} deleted successfully`);
                        uploadedImagesListModal.removeChild(listItem);
                        displayedImages.delete(key); // Remove from the Set
                    });
                };

                listItem.appendChild(img);
                listItem.appendChild(deleteButton);
                uploadedImagesListModal.appendChild(listItem);

                displayedImages.add(key); // Add the image to the Set
            }
        });
    });
}


// Update the showImageModal function to populate images when showing the modal
function showImageModal() {
    populateUploadedImages(); // Populate images before showing
    const modal = document.getElementById('imageModal');
    modal.style.display = 'block';
}

// Function to close the modal
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
}


// Function to get the current index for naming the custom images
async function getCurrentCustomImageIndex() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(null, (items) => {
            const customImagesKeys = Object.keys(items).filter(key => key.startsWith('/images/custom/'));
            resolve(customImagesKeys.length + 1); // Return the next index
        });
    });
}

// // Handle file uploads and deletions
// document.getElementById('customImages').addEventListener('change', async function (event) {
//     const files = event.target.files;
//     const uploadStatus = document.getElementById('uploadStatus');
//     // uploadStatus.textContent = ''; // Clear any previous messages

//     for (const file of files) {
//         const reader = new FileReader();
//         reader.onload = async function (e) {
//             const fileContent = e.target.result;
//             const currentIndex = await getCurrentCustomImageIndex();

//             // Automatically name the file as `index.png` based on the current number of images
//             const fileName = `/images/custom/${currentIndex}.png`;

//             // Save image content to Chrome storage
//             chrome.storage.local.set({ [fileName]: fileContent }, function () {
//                 console.log(`${fileName} saved successfully`);

//                 // Display the uploaded image in the modal list
//                 const uploadedImagesListModal = document.getElementById('uploadedImagesListModal');
//                 const listItem = document.createElement('li');
//                 listItem.textContent = fileName; // Display the file name

//                 const img = document.createElement('img');
//                 img.src = fileContent; // Use the file content as the image source
//                 img.width = 50; // Set a width for display
//                 img.alt = file.name;

//                 // Create delete button
//                 const deleteButton = document.createElement('button');
//                 deleteButton.textContent = 'Delete';
//                 deleteButton.onclick = function () {
//                     // Remove image from storage
//                     chrome.storage.local.remove(fileName, function () {
//                         console.log(`${fileName} deleted successfully`);

//                         // Remove list item from modal
//                         uploadedImagesListModal.removeChild(listItem);
//                     });
//                 };

//                 listItem.appendChild(img);
//                 listItem.appendChild(deleteButton); // Add delete button to the list item
//                 uploadedImagesListModal.appendChild(listItem);
//             });
//         };
//         reader.readAsDataURL(file); // Convert image to base64 format for storage
//     }
// });

// Event listener for opening the modal
document.getElementById('customImages').addEventListener('change', async function (event) {
    const files = event.target.files;
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            const fileContent = e.target.result;
            const currentIndex = await getCurrentCustomImageIndex();

            // Automatically name the file as `index.png` based on the current number of images
            const fileName = `/images/custom/${currentIndex}.png`;

            // Save image content to Chrome storage
            chrome.storage.local.set({ [fileName]: fileContent }, function () {
                console.log(`${fileName} saved successfully`);
                alert(`${file.name} uploaded successfully!`); // Feedback to the user

                // Display the uploaded image in the modal list
                const uploadedImagesListModal = document.getElementById('uploadedImagesListModal');
                const listItem = document.createElement('li');
                listItem.textContent = fileName; // Display the file name

                const img = document.createElement('img');
                img.src = fileContent; // Use the file content as the image source
                img.width = 50; // Set a width for display
                img.alt = file.name;

                listItem.appendChild(img);
                uploadedImagesListModal.appendChild(listItem);
            });
        };
        reader.readAsDataURL(file); // Convert image to base64 format for storage
    }
});


// Handle image split (MrBeast vs Custom)
document.getElementById('imageSplit').addEventListener('input', function () {
    const splitValue = this.value;
    document.getElementById('splitPercentage').textContent = `${splitValue}%`;

    // Save the split value to Chrome storage
    chrome.storage.local.set({ imageSplit: splitValue }, function () {
        console.log(`Image split set to ${splitValue}%`);
    });
});

// Call loadSettings() when the page loads
document.addEventListener('DOMContentLoaded', loadSettings);

// Add input event listeners to all input fields to trigger autosave
document.getElementById('disableExtension').addEventListener('input', saveSettings);
document.getElementById('appearChance').addEventListener('input', saveSettings);
document.getElementById('flipChance').addEventListener('input', saveSettings);
document.getElementById('imageSplit').addEventListener('input', saveSettings);
document.getElementById('openModalButton').addEventListener('click', showImageModal);
document.getElementById('closeModalButton').addEventListener('click', closeImageModal);

document.addEventListener('DOMContentLoaded', ChangeNameInHeading);
