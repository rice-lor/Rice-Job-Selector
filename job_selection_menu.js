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
    menu_choice: "", // Added to track last menu choice
    // Job-related data for Trucker subjobs - simplified
    job: "N/A", // Only keep 'job'
    subjob: "N/A", // Only keep 'subjob'
    last_trucker_subjob_selected: "N/A" // Default for trucker subjob
};

// Minimal log function
function log(message) {
    // In a real NUI environment, this would send a notification to the game.
    window.parent.postMessage({ type: 'notification', text: `~b~[Job-Select]~w~ ${message}` }, '*');
}

// Minimal sleep function - still useful for short pauses where no state change is expected
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
        await sleep(10); // Use a small, fixed interval for polling within sleepUntil
        currentRetries--;
    }
    await sleep(10); // Small extra delay after condition met
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
    cache.menu_choice = choice; // Update last menu choice
    await sleep(10); // Small delay
}

// Minimal submitPrompt function
async function submitPrompt(value) {
    console.log(`[DEBUG] Submitting prompt value: ${value}`); // Debugging log
    // In a real NUI environment, this sends the prompt value to the game.
    // window.parent.postMessage({ type: "forceSubmitValue", value: value.toString() }, '*');
    
    // Simulate prompt state change for testing
    cache.prompt = false; // Prompt closes after submission
    await sleep(10); // Small delay
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
            await sleep(10); // Small delay
        }

        await sleep(50); // Final delay
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
// const NUI_MENU_TRUCKERS_PDA = 'Trucker\'s PDA'; // No longer used for menu navigation
const NUI_MENU_MAIN_MENU = 'Main menu'; // Constant for main menu title

// Define available main jobs.
const MAIN_JOB_NAMES = [
    "Airline Pilot",
    "Bus Driver",
    "Cargo Pilot",
    "EMS / Paramedic",
    "Farmer",
    "Firefighter",
    "Fisher",
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

// Map subjob parts to their direct command options
const TRUCKER_SUBJOB_COMMAND_MAP = {
    "Commercial": "commercial",
    "Illegal": "illegal",
    "Military": "military",
    "Petrochemical": "petrochem",
    // "Refrigerated": "refrigerated" // Command for refrigerated is unknown
};


// Function to open the job selection menu
function openJobSelectionMenu() {
    console.log("[DEBUG] Attempting to open job selection menu."); // Debugging log
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
        // Initial getNamedData call when the menu opens to populate job data
        window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
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
    console.log("[DEBUG] Populating job list."); // Debugging log
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

// Function to display job data from cache (now only updates UI)
function displayJobData() {
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

// Helper function to wait for a specific NUI cache key to match an expected value
async function waitForNuiState(key, expectedValue, timeoutMsg) {
    const initialValue = cache[key];
    if (initialValue === expectedValue) {
        console.log(`[DEBUG] NUI state for '${key}' already '${expectedValue}'.`);
        return true;
    }

    console.log(`[DEBUG] Waiting for NUI state '${key}' to become '${expectedValue}'. Current: '${cache[key]}'...`);
    const startTime = Date.now();
    const timeoutDuration = 5000; // 5 seconds timeout for state changes

    while (cache[key] !== expectedValue) {
        if (Date.now() - startTime > timeoutDuration) {
            console.warn(`[DEBUG] Timeout waiting for NUI state '${key}' to become '${expectedValue}'. Current: '${cache[key]}'.`);
            throw new Error(timeoutMsg || `Timeout waiting for NUI state '${key}' to change.`);
        }
        window.parent.postMessage({ type: "getNamedData", keys: [key] }, "*"); // Request specific data
        await sleep(state.NUI_EXTRA_DELAY * 5); // Poll every 50ms
    }
    console.log(`[DEBUG] NUI state '${key}' is now '${expectedValue}'.`);
    return true;
}

// Function to handle job selection and send NUI commands
async function selectJob(jobName) {
    console.log(`[DEBUG] Selected job: ${jobName}`); // Debugging log
    try {
        // --- BEFORE JOB CHANGE: Request current data ---
        console.log("[DEBUG] Sending getNamedData for job/subjob (before job change)."); // Debugging log
        window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
        await sleep(500); // Give time for data to be received and cache updated

        // Step 1: Check if this is a trucker job and if we are already a trucker.
        if (jobName.startsWith("Trucker") && cache.job === "trucker") {
            const subjobMatch = jobName.match(/Trucker \((.*?)\)/);
            const targetSubjobPart = subjobMatch ? subjobMatch[1] : ""; // Fallback to empty string
            
            if (cache.subjob.toLowerCase() === targetSubjobPart.toLowerCase()) {
                 console.log(`[DEBUG] Subjob is already '${targetSubjobPart}'. Skipping command.`);
                 log(`~g~Job already set to Trucker (${targetSubjobPart}).`);
            } else {
                console.log(`[DEBUG] Subjob is different. Sending direct command.`);
                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                if (!subjobCommandOption) {
                    log(`~r~Error: Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                    throw new Error(`Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                }
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption}`;
                window.parent.postMessage({ type: "sendCommand", command: directSubjobCommand }, '*');
                await waitForNuiState('subjob', targetSubjobPart.toLowerCase(), `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.job = "trucker";
                cache.subjob = targetSubjobPart;
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Successfully applied for the Trucker (${targetSubjobPart}) job.`);
            }

            // We are done with trucker subjob logic, just close the menu.
            closeJobSelectionMenu(); 
            window.parent.postMessage({ type: "forceMenuBack" }, '*');
            await sleep(500);
            window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
            return;
        }

        // --- If not a trucker, or not already a trucker, follow the standard path ---
        
        // Step 2: Open main menu
        window.parent.postMessage({ type: "openMainMenu" }, '*');
        await waitForNuiState('menu', NUI_MENU_MAIN_MENU, `Main menu did not open.`);

        // Step 3: Navigate to Phone / Services
        window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_PHONE_SERVICES, mod: 0 }, '*');
        await waitForNuiState('menu', NUI_MENU_PHONE_SERVICES, `'Phone / Services' menu did not open.`);
        await waitForNuiState('menu_open', true, `Menu did not stay open after 'Phone / Services'.`);

        // Step 4: Navigate to Job Center
        window.parent.postMessage({ type: "forceMenuChoice", choice: NUI_MENU_JOB_CENTER, mod: 0 }, '*');
        await waitForNuiState('menu', NUI_MENU_JOB_CENTER, `'Job Center' menu did not open.`);
        await waitForNuiState('menu_open', true, `Menu did not stay open after 'Job Center'.`);
        
        // Step 5: Select the job
        let targetJobName = jobName;
        let targetSubjobPart = "N/A";
        
        if (jobName.startsWith("Trucker")) {
            targetJobName = "Trucker";
            const subjobMatch = jobName.match(/Trucker \((.*?)\)/);
            targetSubjobPart = subjobMatch ? subjobMatch[1] : "N/A";
        }

        window.parent.postMessage({ type: "forceMenuChoice", choice: targetJobName, mod: 0 }, '*');
        await waitForNuiState('menu_open', false, `Menu did not close after selecting job '${targetJobName}'.`);
        
        // Step 6: After job selection, check if it's a trucker and if a subjob needs setting
        if (targetJobName === "Trucker" && targetSubjobPart !== "N/A") {
            window.parent.postMessage({ type: "getNamedData", keys: ['subjob'] }, "*");
            await sleep(500); // Give time for data to be received and cache updated
            
            if (cache.subjob.toLowerCase() !== targetSubjobPart.toLowerCase()) {
                console.log(`[DEBUG] Subjob needs to be set. Current: '${cache.subjob}', Target: '${targetSubjobPart}'.`);

                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                if (!subjobCommandOption) {
                    log(`~r~Error: Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                    throw new Error(`Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                }
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption}`;
                window.parent.postMessage({ type: "sendCommand", command: directSubjobCommand }, '*');
                await waitForNuiState('subjob', targetSubjobPart.toLowerCase(), `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.job = "trucker";
                cache.subjob = targetSubjobPart;
                cache.last_trucker_subjob_selected = targetSubjobPart;
            } else {
                console.log(`[DEBUG] Subjob is already '${targetSubjobPart}'. No action needed.`);
            }

            log(`~g~Successfully applied for the Trucker (${targetSubjobPart}) job.`);
        } else {
             cache.job = targetJobName.toLowerCase().replace(/ /g, '_');
             cache.subjob = "N/A";
             log(`~g~Successfully applied for the ${targetJobName} job.`);
        }


    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        log(`~r~Job Selection failed: You don't have enough Job card or the Job is not unlocked. Error: ${e.message || 'Unknown error'}`);
    } finally {
        closeJobSelectionMenu(); 
        window.parent.postMessage({ type: "forceMenuBack" }, '*');
        await sleep(500); 
        window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
    }
}
