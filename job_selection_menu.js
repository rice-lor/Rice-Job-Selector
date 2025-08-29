// --- State Management (formerly state.js) ---
const NUI_EXTRA_DELAY = 10; // Minimal delay for NUI interactions

const state = {
    NUI_EXTRA_DELAY: NUI_EXTRA_DELAY,
    // Add other minimal state properties if absolutely necessary
};

// --- NUI Interaction Functions (formerly nui.js) ---
// Minimal cache for NUI state simulation
const cache = {
    menu_open: false,
    menu_choices: [],
    prompt: false,
    menu: "", // Added to track current menu name
    // Job-related data for Trucker subjobs
    job: "N/A", // Only keep 'job'
    subjob: "N/A", // Only keep 'subjob'
    last_trucker_subjob_selected: "N/A" // Default for trucker subjob
};

// Minimal log function
function log(message) {
    // In a real NUI environment, this would send a notification to the game.
    // window.parent.postMessage({ type: 'notification', text: message }, '*');
}

// Minimal sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Minimal sleepUntil function for NUI state checks
async function sleepUntil(check, retries, timeout, errorMsg) {
    let currentRetries = retries;
    while (!check()) {
        if (currentRetries <= 0) {
            console.warn(`sleepUntil timed out: ${errorMsg}`);
            throw new Error(errorMsg);
        }
        await sleep(timeout);
        currentRetries--;
    }
    await sleep(state.NUI_EXTRA_DELAY); // Simulate extra delay after condition met
    return true;
}

// Minimal submitMenu function
async function submitMenu(choice, mod = 0) {
    console.log(`[DEBUG] Submitting menu choice: ${choice}, mod: ${mod}`); // Debugging log
    // In a real NUI environment, this sends the choice to the game.
    // window.parent.postMessage({ type: "forceMenuChoice", choice, mod }, '*');
    
    // Simulate menu state change for testing
    cache.menu_open = false; // Menu closes after selection
    cache.menu_choices = []; // Choices clear
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal submitPrompt function
async function submitPrompt(value) {
    console.log(`[DEBUG] Submitting prompt value: ${value}`); // Debugging log
    // In a real NUI environment, this sends the prompt value to the game.
    // window.parent.postMessage({ type: "forceSubmitValue", value: value.toString() }, '*');
    
    // Simulate prompt state change for testing
    cache.prompt = false; // Prompt closes after submission
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal executeActions function - now directly integrated
async function executeActions(executionActions, autoCloseMenu = true) {
    try {
        console.log("[DEBUG] Simulating NUI executeActions..."); // Debugging log
        for (const { actions, amount } of executionActions) {
            for (const { action, mod } of actions) {
                console.log(`[DEBUG] Waiting for menu option: '${action}'`); // Debugging log
                
                await sleepUntil(
                    () => cache.menu_open && (cache.menu_choices ?? []).findIndex(
                        (a) => (a ?? [])[0]?.replace(/(<.+?>)|(&#.+?;)/g, '') === action
                    ) !== -1,
                    300, // NUI_RETRIES
                    10,  // NUI_TIMEOUT
                    `Could not find option '${action}' in menu, exiting...`
                );

                await submitMenu(action, mod); // Simulate sending the choice
            }

            if (amount > 0) {
                console.log(`[DEBUG] Waiting for prompt to enter amount: ${amount}`); // Debugging log
                await sleepUntil(
                    () => cache.prompt === true,
                    300, // NUI_RETRIES
                    10,  // NUI_TIMEOUT
                    'Could not find prompt, exiting...'
                );
                await submitPrompt(amount); // Simulate submitting the amount
            }
            await sleep(state.NUI_EXTRA_DELAY);
        }

        await sleep(state.NUI_EXTRA_DELAY * 5); // Final delay
        if (autoCloseMenu) {
            console.log("[DEBUG] Simulating NUI menu close."); // Debugging log
            // window.parent.postMessage({ type: 'forceMenuBack' }, '*'); // Actual NUI close command
        }
    } catch (e) {
        console.error('Error during executeActions simulation:', e);
        return false;
    }
    return true;
}

// Helper function to simulate NUI menu opening for testing
// Call this in your browser console to simulate the game opening a menu
function simulateNuiMenu(menuName, choicesArray, isPrompt = false) {
    console.log(`[SIMULATING NUI] Menu '${menuName}' opened with choices:`, choicesArray); // Keep for console debugging
    cache.menu_open = true;
    cache.menu_choices = choicesArray.map(choice => [choice]); // Format as array of arrays
    cache.prompt = isPrompt;
    cache.menu = menuName; // Update the menu name in cache
}

// --- Main Job Selection Logic ---

// Define NUI menu choice constants
const NUI_MENU_PHONE_SERVICES = 'Phone / Services';
const NUI_MENU_JOB_CENTER = 'Job Center';
const NUI_MENU_TRUCKERS_PDA = 'Trucker\'s PDA';

// Define available main jobs.
const MAIN_JOB_NAMES = [
    "Airline Pilot",
    "Bus Driver",
    "Cargo Pilot",
    "EMS / Paramedic",
    "Farmer",
    "Firefighter",
    "Fisher", // Corrected from "Fisherman" to "Fisher"
    "Garbage Collector",
    "Helicopter Pilot",
    "Leisure Pilot",
    "Mechanic",
    "PostOP Employee",
    "Street Racer",
    "Train Conductor",
    "Trucker", // Main "Trucker" job
    "Unemployed",
    "Wildlife Hunter"
];

// Define Trucker subjobs separately
const TRUCKER_SUB_JOBS = [
    "Commercial",
    "Illegal",
    "Military",
    "Petrochemical",
    "Refrigerated"
];

// Function to open the job selection menu
function openJobSelectionMenu() {
    console.log("[DEBUG] Attempting to open job selection menu."); // Debugging log
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
    } else {
        console.error("Error: jobSelectionModal element not found.");
    }
}

// Function to close the job selection menu
function closeJobSelectionMenu() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Function to dynamically populate the job list in the modal
function populateJobList() {
    const jobListContainer = document.getElementById('jobList');
    if (!jobListContainer) {
        console.error("Error: jobList element not found in HTML.");
        return;
    }
    jobListContainer.innerHTML = ''; // Clear previous list

    MAIN_JOB_NAMES.forEach(jobName => {
        if (jobName === "Trucker") {
            // Create a container for the Trucker button and its sub-menu
            const truckerContainer = document.createElement('div');
            truckerContainer.className = 'trucker-job-container'; // This container is purely structural

            const truckerButton = document.createElement('button');
            truckerButton.className = 'job-button trucker-main-button'; 
            truckerButton.textContent = "Trucker";
            truckerButton.onclick = () => selectJob("Trucker"); // Main trucker button is now clickable
            truckerContainer.appendChild(truckerButton);

            // Create the sub-menu for trucker jobs
            const subjobsMenu = document.createElement('div');
            subjobsMenu.id = 'truckerSubjobs';
            subjobsMenu.className = 'trucker-subjobs-menu';

            TRUCKER_SUB_JOBS.forEach(subjob => {
                const subjobButton = document.createElement('button');
                subjobButton.className = 'subjob-button';
                subjobButton.textContent = subjob;
                subjobButton.onclick = () => selectJob(`Trucker (${subjob})`); // Pass full name for NUI
                subjobsMenu.appendChild(subjobButton);
            });

            truckerContainer.appendChild(subjobsMenu);
            jobListContainer.appendChild(truckerContainer);

        } else {
            const button = document.createElement('button');
            button.className = 'job-button'; // Apply job-button class for other jobs
            button.textContent = jobName;
            button.onclick = () => selectJob(jobName);
            jobListContainer.appendChild(button);
        }
    });
}

// Function to display job data from cache
async function displayJobData() {
    // Request fresh data from the game client
    window.parent.postMessage({ type: "getData" }, "*");
    
    // Display job data based on current cache
    const displayJobElement = document.getElementById('displayJob');
    const displaySubjobElement = document.getElementById('displaySubjob');

    if (displayJobElement) {
        displayJobElement.textContent = `Job: ${cache.job || 'N/A'}`;
    }
    if (displaySubjobElement) {
        if (cache.job === "trucker") {
            displaySubjobElement.textContent = `Subjob: ${cache.subjob || 'N/A'}`;
            displaySubjobElement.style.display = 'block'; // Show subjob for trucker
        } else {
            displaySubjobElement.style.display = 'none'; // Hide subjob for other jobs
        }
    }
}

// Function to handle job selection and send NUI commands
async function selectJob(jobName) {
    try {
        // Step 1: Send the direct command to open the main menu
        log(`Sending command to open Main Menu...`);
        window.parent.postMessage({ type: "openMainMenu" }, '*');
        await sleep(500); // Delay changed to 500ms

        // Step 2: Navigate to "Phone / Services"
        log(`Selecting 'Phone / Services'...`);
        window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_PHONE_SERVICES, mod: 0 }, '*');
        await sleep(500); // Delay changed to 500ms

        // Step 3: Navigate to "Job Center" (for all jobs initially)
        log(`Selecting 'Job Center'...`);
        window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_JOB_CENTER, mod: 0 }, '*');
        await sleep(500); // Delay changed to 500ms

        // Determine the next steps based on the job type
        if (jobName.startsWith("Trucker")) { // This covers both "Trucker" and "Trucker (Subjob)"
            let actualSubjobToSelect = "";
            if (jobName === "Trucker") {
                actualSubjobToSelect = cache.last_trucker_subjob_selected;
                if (!actualSubjobToSelect || !TRUCKER_SUB_JOBS.some(sub => sub.toLowerCase() === actualSubjobToSelect.toLowerCase())) {
                    actualSubjobToSelect = "Commercial"; // Default if not found or invalid
                }
            } else {
                const subjobMatch = jobName.match(/Trucker \((.*?)\)/);
                actualSubjobToSelect = subjobMatch ? subjobMatch[1] : "Commercial"; // Fallback
            }

            // Select main "Trucker" job from Job Center
            log(`Selecting 'Trucker' (main job) from Job Center...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Trucker', mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            // Re-open Main Menu for PDA access
            log(`Re-sending command to open Main Menu for PDA...`);
            window.parent.postMessage({ type: "openMainMenu" }, '*');
            await sleep(500); // Delay changed to 500ms

            // Navigate back to "Phone / Services"
            log(`Selecting 'Phone / Services' again...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_PHONE_SERVICES, mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            // Navigate to "Trucker's PDA"
            log(`Selecting 'Trucker's PDA'...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_TRUCKERS_PDA, mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            // Select the subjob (Commercial or the specific one)
            log(`Selecting subjob '${actualSubjobToSelect}'...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: actualSubjobToSelect, mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            log(`~g~Successfully applied for the Trucker (${actualSubjobToSelect}) job.`);

        } else {
            // For all other jobs, simply select the job name from Job Center
            log(`Selecting job '${jobName}' from Job Center...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: jobName, mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            log(`~g~Successfully applied for the ${jobName} job.`);
        }

    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        log(`~r~Job Selection failed: You don't have enough Job card or the Job is not unlocked. Error: ${e.message || 'Unknown error'}`);
    }
    closeJobSelectionMenu(); // Close UI after trying to apply

    // Send forceMenuBack after successfully applying for the job
    log(`Sending 'forceMenuBack' command.`);
    window.parent.postMessage({ type: "forceMenuBack" }, '*');
    await sleep(500); // Delay after sending forceMenuBack
}

// Function to reload the page
function reloadPage() {
    window.location.reload();
}

// Attach functions to the window object for HTML access
window.openJobSelectionMenu = openJobSelectionMenu;
window.closeJobSelectionMenu = closeJobSelectionMenu;
window.selectJob = selectJob;
window.reloadPage = reloadPage; // Make reloadPage globally accessible
window.simulateNuiMenu = simulateNuiMenu; // Make simulateNuiMenu globally accessible for testing
window.displayJobData = displayJobData; // Make displayJobData globally accessible

// --- Event Listener for NUI Data Messages ---
window.addEventListener("message", (event) => {
    const evt = event.data;
    if (!evt || !evt.data) return;

    // Update cache with all incoming data
    for (const key in evt.data) {
        if (key === 'menu_choices' && typeof evt.data[key] === 'string') {
            try {
                cache[key] = JSON.parse(evt.data[key] ?? '[]');
            } catch (e) {
                console.error(`Error parsing menu_choices: ${e.message}`);
                cache[key] = [];
            }
        } else if (key === 'job') {
            cache.job = evt.data[key];
        } else if (key === 'subjob') {
            cache.subjob = evt.data[key];
            // Also update last_trucker_subjob_selected if it's a trucker subjob
            if (cache.job === "trucker" && evt.data[key] !== "N/A") {
                cache.last_trucker_subjob_selected = evt.data[key];
            }
        }
        else {
            cache[key] = evt.data[key];
        }
    }
    // Automatically update displayed job data whenever new data arrives
    displayJobData();
});


// --- Add the escapeListener and trunc function ---
const escapeListener = (e) => {
    if (e.key === "Escape") {
        // Pin the window, meaning we give control back to the game
        window.parent.postMessage({type: "pin"}, "*");
    }
};
window.addEventListener('keydown', escapeListener);

// Restrict length of data on screen, to avoid flooding the screen
const trunc = (str, len) => {
    len = len || 50;
    if (str.length > len) {
        return str.substring(0, len) + "...";
    }
    return str;
};

document.addEventListener('DOMContentLoaded', () => {
    const openJobMenuBtn = document.getElementById('openJobMenuBtn');
    if (openJobMenuBtn) {
        openJobMenuBtn.addEventListener('click', openJobSelectionMenu);
    } else {
        console.error("Error: openJobMenuBtn element not found on DOMContentLoaded.");
    }
});
