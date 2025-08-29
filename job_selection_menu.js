// --- State Management (formerly state.js) ---
const NUI_EXTRA_DELAY = 50; // Minimal delay for NUI interactions

const state = {
    NUI_EXTRA_DELAY: NUI_EXTRA_DELAY,
    // Add other minimal state properties if absolutely necessary
};

// --- NUI Interaction Functions (formerly nui.js) ---
// Minimal cache for NUI state simulation
const cache = {
    menu_open: false,
    menu_choices: [],
    prompt: false
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
        // In a real NUI environment, cache.menu_choices would be updated by game messages.
    }
    await sleep(state.NUI_EXTRA_DELAY); // Simulate extra delay after condition met
    return true;
}

// Minimal submitMenu function
async function submitMenu(choice, mod = 0) {
    // In a real NUI environment, this sends the choice to the game.
    // window.parent.postMessage({ type: "forceMenuChoice", choice, mod }, '*');
    
    // Simulate menu state change for testing
    cache.menu_open = false; // Menu closes after selection
    cache.menu_choices = []; // Choices clear
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal submitPrompt function
async function submitPrompt(value) {
    // In a real NUI environment, this sends the prompt value to the game.
    // window.parent.postMessage({ type: "forceSubmitValue", value: value.toString() }, '*');
    
    // Simulate prompt state change for testing
    cache.prompt = false; // Prompt closes after submission
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal executeActions function - now directly integrated
async function executeActions(executionActions, autoCloseMenu = true) {
    try {
        for (const { actions, amount } of executionActions) {
            for (const { action, mod } of actions) {
                // This is where we need the cache to be updated by the game.
                // For manual testing, you'd call simulateNuiMenu in the console.
                await sleepUntil(
                    () => cache.menu_open && (cache.menu_choices ?? []).findIndex(
                        (a) => (a ?? [])[0]?.replace(/(<.+?>)|(&#.+?;)/g, '') === action
                    ) !== -1,
                    300, // NUI_RETRIES (from original state.js)
                    10,  // NUI_TIMEOUT (from original state.js)
                    `Could not find option '${action}' in menu, exiting...`
                );

                await submitMenu(action, mod); // Simulate sending the choice
            }

            if (amount > 0) {
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
    // This function is for testing purposes only, so its console.log remains
    console.log(`[SIMULATING NUI] Menu '${menuName}' opened with choices:`, choicesArray);
    cache.menu_open = true;
    cache.menu_choices = choicesArray.map(choice => [choice]); // Format as array of arrays
    cache.prompt = isPrompt;
}

// --- Main Job Selection Logic ---

// Define available main jobs.
const MAIN_JOB_NAMES = [
    "Airline Pilot",
    "Bus Driver",
    "Cargo Pilot",
    "EMS / Paramedic",
    "Farmer",
    "Firefighter",
    "Fisherman",
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
            // Apply job-button class here to ensure it gets the correct styling
            truckerButton.className = 'job-button trucker-main-button'; 
            truckerButton.textContent = "Trucker";
            // If you want the main "Trucker" to also be selectable as a general job, uncomment:
            // truckerButton.onclick = () => selectJob("Trucker");
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

// Function to handle job selection and send NUI commands
async function selectJob(jobName) {
    try {
        // Step 1: Send the direct command to open the main menu
        if (typeof log === 'function') {
            log(`Sending command to open Main Menu...`);
        }
        window.parent.postMessage({ type: "openMainMenu" }, '*');
        await sleep(state.NUI_EXTRA_DELAY * 5);

        // Step 2: Navigate to "Phone / Services"
        if (typeof log === 'function') {
            log(`Selecting 'Phone / Services'...`);
        }
        window.parent.postMessage({ type: "forceMenuChoice", choice: 'Phone / Services', mod: 0 }, '*');
        await sleep(state.NUI_EXTRA_DELAY * 5);

        // Step 3: Navigate to "Job Center" (for all jobs initially)
        if (typeof log === 'function') {
            log(`Selecting 'Job Center'...`);
        }
        window.parent.postMessage({ type: "forceMenuChoice", choice: 'Job Center', mod: 0 }, '*');
        await sleep(state.NUI_EXTRA_DELAY * 5);

        // Determine the next steps based on the job type
        if (jobName.startsWith("Trucker")) { // This covers both "Trucker" and "Trucker (Subjob)"
            let actualSubjobToSelect = "";
            if (jobName === "Trucker") {
                actualSubjobToSelect = "Commercial"; // Default subjob when main "Trucker" is clicked
            } else {
                const subjobMatch = jobName.match(/Trucker \((.*?)\)/);
                actualSubjobToSelect = subjobMatch ? subjobMatch[1] : jobName;
            }

            // Select main "Trucker" job from Job Center
            if (typeof log === 'function') {
                log(`Selecting 'Trucker' (main job) from Job Center...`);
            }
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Trucker', mod: 0 }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            // Re-open Main Menu for PDA access
            if (typeof log === 'function') {
                log(`Re-sending command to open Main Menu for PDA...`);
            }
            window.parent.postMessage({ type: "openMainMenu" }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            // Navigate back to "Phone / Services"
            if (typeof log === 'function') {
                log(`Selecting 'Phone / Services' again...`);
            }
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Phone / Services', mod: 0 }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            // Navigate to "Trucker's PDA"
            if (typeof log === 'function') {
                log(`Selecting 'Trucker's PDA'...`);
            }
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Trucker\'s PDA', mod: 0 }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            // Select the subjob (Commercial or the specific one)
            if (typeof log === 'function') {
                log(`Selecting subjob '${actualSubjobToSelect}'...`);
            }
            window.parent.postMessage({ type: "forceMenuChoice", choice: actualSubjobToSelect, mod: 0 }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            log(`~g~Successfully applied for the Trucker (${actualSubjobToSelect}) job.`);

        } else {
            // For all other jobs, simply select the job name from Job Center
            if (typeof log === 'function') {
                log(`Selecting job '${jobName}' from Job Center...`);
            }
            window.parent.postMessage({ type: "forceMenuChoice", choice: jobName, mod: 0 }, '*');
            await sleep(state.NUI_EXTRA_DELAY * 5);

            log(`~g~Successfully applied for the ${jobName} job.`);
        }

    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        if (typeof log === 'function') {
            log(`~r~Job Selection failed: You don't have enough Job card or the Job is not unlocked. Error: ${e.message || 'Unknown error'}`);
        }
    }
    closeJobSelectionMenu(); // Close UI after trying to apply
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

document.addEventListener('DOMContentLoaded', () => {
    const openJobMenuBtn = document.getElementById('openJobMenuBtn');
    if (openJobMenuBtn) {
        openJobMenuBtn.addEventListener('click', openJobSelectionMenu);
    } else {
        console.error("Error: openJobMenuBtn element not found on DOMContentLoaded.");
    }
});
