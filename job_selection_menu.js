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
    menu: "" // Added to track current menu name
};

// Function to append messages to the custom log display
function appendToLog(message) {
    const logDisplay = document.getElementById('jobLogDisplay');
    if (!logDisplay) {
        // Fallback to console if log display element is not found
        console.warn("jobLogDisplay element not found in HTML. Logging to browser console only.");
        console.log(message.replace(/~[rgwy~]/g, ''));
        return;
    }

    const logEntry = document.createElement('div');
    logEntry.className = 'log-message';

    // Basic color parsing from NUI style codes (~r~, ~g~, ~y~, ~w~)
    if (message.includes('~r~')) {
        logEntry.classList.add('error');
    } else if (message.includes('~g~')) {
        logEntry.classList.add('success');
    } else if (message.includes('~y~')) {
        logEntry.classList.add('warning');
    } else if (message.includes('~w~')) {
        logEntry.classList.add('info');
    } else {
        logEntry.classList.add('info'); // Default to info
    }

    // Remove NUI color codes for display
    logEntry.textContent = message.replace(/~[rgwy~]/g, '');

    logDisplay.appendChild(logEntry);
    logDisplay.scrollTop = logDisplay.scrollHeight; // Auto-scroll to bottom
    console.log(message.replace(/~[rgwy~]/g, '')); // Still log to browser console for deeper debugging
}

// Minimal log function (now uses appendToLog)
function log(message) {
    appendToLog(message);
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
            log(`~r~sleepUntil timed out: ${errorMsg}`); // Log to custom display
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
    log(`Submitting menu choice: ${choice}, mod: ${mod}`); // Log to custom display
    // In a real NUI environment, this sends the choice to the game.
    // window.parent.postMessage({ type: "forceMenuChoice", choice, mod }, '*');
    
    // Simulate menu state change for testing
    cache.menu_open = false; // Menu closes after selection
    cache.menu_choices = []; // Choices clear
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal submitPrompt function
async function submitPrompt(value) {
    log(`Submitting prompt value: ${value}`); // Log to custom display
    // In a real NUI environment, this sends the prompt value to the game.
    // window.parent.postMessage({ type: "forceSubmitValue", value: value.toString() }, '*');
    
    // Simulate prompt state change for testing
    cache.prompt = false; // Prompt closes after submission
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal executeActions function - now directly integrated
async function executeActions(executionActions, autoCloseMenu = true) {
    try {
        log("Simulating NUI executeActions..."); // Log to custom display
        
        for (const { actions, amount } of executionActions) {
            for (const { action, mod } of actions) {
                log(`  Waiting for menu option: '${action}'`); // Log to custom display
                
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
                log(`  Waiting for prompt to enter amount: ${amount}`); // Log to custom display
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
            log("Simulating NUI menu close."); // Log to custom display
            // window.parent.postMessage({ type: 'forceMenuBack' }, '*'); // Actual NUI close command
        }
    } catch (e) {
        console.error('Error during executeActions simulation:', e); // Keep console.error
        log(`~r~Error during executeActions simulation: ${e.message || 'Unknown error'}`); // Log to custom display
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
    // No console.log here, use the custom log function
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
        log("Job selection menu opened."); // Log to custom display
    } else {
        console.error("Error: jobSelectionModal element not found."); // Keep console.error
        log("~r~Error: Job selection modal element not found."); // Log to custom display
    }
}

// Function to close the job selection menu
function closeJobSelectionMenu() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.add('hidden');
        log("Job selection menu closed."); // Log to custom display
    }
}

// Function to dynamically populate the job list in the modal
function populateJobList() {
    const jobListContainer = document.getElementById('jobList');
    if (!jobListContainer) {
        console.error("Error: jobList element not found in HTML."); // Keep console.error
        log("~r~Error: Job list container not found."); // Log to custom display
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
    log("Job list populated."); // Log to custom display
}

// Function to handle job selection and send NUI commands
async function selectJob(jobName) {
    log(`Selected job: ${jobName}`); // Log to custom display

    try {
        // Step 1: Send the direct command to open the main menu
        log(`Sending command to open Main Menu...`);
        window.parent.postMessage({ type: "openMainMenu" }, '*');
        await sleep(500); // Delay changed to 500ms

        // Step 2: Navigate to "Phone / Services"
        log(`Selecting 'Phone / Services'...`);
        window.parent.postMessage({ type: "forceMenuChoice", choice: 'Phone / Services', mod: 0 }, '*');
        await sleep(500); // Delay changed to 500ms

        // Step 3: Navigate to "Job Center" (for all jobs initially)
        log(`Selecting 'Job Center'...`);
        window.parent.postMessage({ type: "forceMenuChoice", choice: 'Job Center', mod: 0 }, '*');
        await sleep(500); // Delay changed to 500ms

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
            log(`Selecting 'Trucker' (main job) from Job Center...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Trucker', mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            // Re-open Main Menu for PDA access
            log(`Re-sending command to open Main Menu for PDA...`);
            window.parent.postMessage({ type: "openMainMenu" }, '*');
            await sleep(500); // Delay changed to 500ms

            // Navigate back to "Phone / Services"
            log(`Selecting 'Phone / Services' again...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Phone / Services', mod: 0 }, '*');
            await sleep(500); // Delay changed to 500ms

            // Navigate to "Trucker's PDA"
            log(`Selecting 'Trucker's PDA'...`);
            window.parent.postMessage({ type: "forceMenuChoice", choice: 'Trucker\'s PDA', mod: 0 }, '*');
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

            log(`Successfully applied for the ${jobName} job.`);
        }

    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e); // Keep console.error
        log(`~r~Job Selection failed: You don't have enough Job card or the Job is not unlocked. Error: ${e.message || 'Unknown error'}`);
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
