// --- State Management ---
// This cache will be updated by messages from the game client.
const cache = {
    menu_open: false,
    menu: "",
    job: "N/A",
    subjob: "N/A",
    last_trucker_subjob_selected: "Commercial",
    menu_choice: "" // Added menu_choice to the initial cache for clarity
};

// --- NUI Interaction ---

/**
 * Sends a command to the FiveM game client.
 * @param {string} type - The command type (e.g., 'sendCommand', 'notification').
 * @param {object} data - The payload for the command.
 */
function sendNuiCommand(type, data = {}) {
    // This is the actual function that communicates with the game.
    if (window.parent !== window) {
        window.parent.postMessage({ type, ...data }, '*');
    }
    console.log(`[NUI SENT] Type: ${type}, Data: ${JSON.stringify(data)}`);
}

/**
 * Sends a formatted notification to the game client.
 * @param {string} message - The message to display.
 */
function log(message) {
    sendNuiCommand('notification', { text: `~b~[Job-Select]~w~ ${message}` });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepUntil(check, retries = 20, timeout = 100, errorMsg = "Condition not met in time.") {
    let currentRetries = retries;
    while (!check()) {
        if (currentRetries <= 0) {
            throw new Error(errorMsg);
        }
        await sleep(timeout);
        currentRetries--;
    }
    return true;
}

// --- Job Definitions ---
const NUI_MENU_PHONE_SERVICES = 'Phone / Services';
const NUI_MENU_JOB_CENTER = 'Job Center';
const JOB_IDS = {
    "Airline Pilot": "pilot", 
    "Bus Driver": "busdriver", 
    "Cargo Pilot": "cargopilot",
    "EMS / Paramedic": "emergency", 
    "Farmer": "farmer", 
    "Firefighter": "firefighter",
    "Fisher": "fisher", 
    "Garbage Collector": "garbage", 
    "Helicopter Pilot": "helicopterpilot",
    "Leisure Pilot": "leisurepilot", 
    "Mechanic": "mechanic", 
    "PostOP Employee": "postop",
    "Street Racer": "racer", 
    "Train Conductor": "conductor", 
    "Unemployed": "citizen",
    "Wildlife Hunter": "hunter", 
    "Trucker": "trucker"
};
const MAIN_JOB_NAMES = Object.keys(JOB_IDS);
const TRUCKER_SUBJOB_COMMAND_MAP = {
    "Commercial": "trucker_commercial",
    "Illegal": "trucker_illegal",
    "Military": "trucker_military",
    "Petrochemical": "trucker_petrochem",
    "Refrigerated": "trucker_fridge"
};

// --- UI Management Functions ---

function openJobSelectionMenu() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
        // Request fresh data every time the menu is opened.
        sendNuiCommand('getNamedData', { keys: ['job'] });
        sendNuiCommand('getNamedData', { keys: ['subjob'] });
    }
}

function closeJobSelectionMenu(shouldPin = true) {
    const modal = document.getElementById('jobSelectionModal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        if (shouldPin) {
            sendNuiCommand('pin');
        }
    }
}

function reloadPage() {
    window.location.reload();
}

function populateJobList() {
    const jobListContainer = document.getElementById('jobList');
    if (!jobListContainer) return;
    jobListContainer.innerHTML = '';

    MAIN_JOB_NAMES.forEach(jobName => {
        const button = document.createElement('button');
        button.className = 'job-button';
        
        if (jobName === "Trucker") {
            const container = document.createElement('div');
            container.className = 'trucker-job-container';
            button.textContent = "Trucker";
            button.className += ' trucker-main-button';
            button.onclick = () => selectJob("Trucker");
            container.appendChild(button);

            const subMenu = document.createElement('div');
            subMenu.className = 'trucker-subjobs-menu';
            Object.keys(TRUCKER_SUBJOB_COMMAND_MAP).forEach(subjob => {
                const subButton = document.createElement('button');
                subButton.className = 'subjob-button';
                subButton.textContent = subjob;
                subButton.onclick = (e) => { e.stopPropagation(); selectJob(`Trucker (${subjob})`); };
                subMenu.appendChild(subButton);
            });
            container.appendChild(subMenu);
            jobListContainer.appendChild(container);
        } else {
            button.textContent = jobName;
            button.onclick = () => selectJob(jobName);
            jobListContainer.appendChild(button);
        }
    });
}


// --- Core Application Logic ---

async function selectJob(jobName) {
    console.log(`[ACTION] Selected job: ${jobName}`);
    try {
        // Step 1: Request fresh job data from the client to ensure our cache is up-to-date.
        sendNuiCommand('getNamedData', { keys: ['job'] });
        sendNuiCommand('getNamedData', { keys: ['subjob'] });
        await sleep(200); // Give the client a moment to respond.

        let isTruckerSelection = jobName.startsWith("Trucker");
        let targetJob = isTruckerSelection ? "trucker" : JOB_IDS[jobName];
        let targetSubjobPart = isTruckerSelection ? (jobName.match(/Trucker \((.*?)\)/)?.[1] || cache.last_trucker_subjob_selected) : null;
        
        // Case 1: Player already has the target job. We might only need to change the subjob.
        if (cache.job === targetJob) {
            const targetSubjobId = targetSubjobPart ? TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart] : null;

            if (!isTruckerSelection || cache.subjob === targetSubjobId) {
                log(`You already have the job: ${jobName}`);
                return;
            }

            log(`Changing subjob to ${targetSubjobPart}...`);
            const directSubjobCommand = `item trucker_pda ${targetSubjobId.replace('trucker_', '')}`;
            sendNuiCommand('sendCommand', { command: directSubjobCommand });
            cache.last_trucker_subjob_selected = targetSubjobPart;

            await sleepUntil(() => cache.subjob === targetSubjobId, 20, 100, `You don't have a Trucker's PDA`);
            log(`~g~Successfully changed subjob to ${targetSubjobPart}`);
            
        } else {
            // Case 2: Player has a different job. Navigate the full menu.
            const notificationText = isTruckerSelection ? `Trucker (${targetSubjobPart})` : jobName;
            log(`Changing to ${notificationText}...`);
            
            sendNuiCommand('openMainMenu');
            await sleepUntil(() => cache.menu_open, 20, 100, 'Main menu did not open.');

            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_PHONE_SERVICES, mod: 0 });
            await sleepUntil(() => cache.menu_choice === NUI_MENU_PHONE_SERVICES, 20, 100, 'Phone/Services choice not confirmed.');

            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_JOB_CENTER, mod: 0 });
            await sleepUntil(() => cache.menu_choice === NUI_MENU_JOB_CENTER, 20, 100, 'Job Center choice not confirmed.');
            
            const targetJobButtonText = isTruckerSelection ? 'Trucker' : jobName;
            sendNuiCommand('forceMenuChoice', { choice: targetJobButtonText, mod: 0 });
            await sleepUntil(() => !cache.menu_open, 20, 100, 'Menu did not close after job selection.');

            // This is the specific check for job change success.
            try {
                await sleepUntil(() => cache.job === targetJob, 20, 100, `You don't have enough job card or ${targetJob} not LVL100.`);
            } catch (jobChangeError) {
                // If this specific step fails, log the custom error and exit.
                log("~r~You don't have job card or job not reach lvl100");
                console.error(jobChangeError); // Log the technical error for debugging.
                // We return here to prevent the code from proceeding to the generic catch block.
                // The 'finally' block will still execute to close the menu.
                return; 
            }
            log(`~g~Successfully changed job to ${isTruckerSelection ? 'Trucker' : jobName}`);
            
            if (isTruckerSelection && targetSubjobPart) {
                await sleep(500);
                const targetSubjobId = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                const directSubjobCommand = `item trucker_pda ${targetSubjobId.replace('trucker_', '')}`;
                sendNuiCommand('sendCommand', { command: directSubjobCommand });
                cache.last_trucker_subjob_selected = targetSubjobPart;

                await sleepUntil(() => cache.subjob === targetSubjobId, 20, 100, `You don't have a Trucker's PDA`);
                log(`~g~Successfully changed subjob to ${targetSubjobPart}`);
            }
        }
    } catch (e) {
        console.error(`[ERROR] Job selection failed:`, e);
        log(`~r~Job selection failed: ${e.message}`);
    } finally {
        closeJobSelectionMenu(false);
    }
}

// --- Event Listeners and Initial Setup ---
window.closeJobSelectionMenu = closeJobSelectionMenu;
window.reloadPage = reloadPage;

window.addEventListener("message", (event) => {
    const data = event.data;
    
    if (data.focused === true && data.hidden === false) {
        openJobSelectionMenu();
    }
    if (data.hidden === true || data.pinned === true) {
        closeJobSelectionMenu(false);
    }
    
    for (const key in data) {
        if (cache[key] !== data[key]) {
            cache[key] = data[key];
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openJobMenuBtn');
    openBtn.addEventListener('click', openJobSelectionMenu);

    // The following lines are commented out to ensure the button is always visible,
    // even when running inside the game client.
    // if (window.parent !== window) {
    //     openBtn.style.display = 'none';
    // }
    
    sendNuiCommand('getData');
});

const escapeListener = (e) => {
    if (e.key === "Escape") {
        closeJobSelectionMenu(false);
        window.parent.postMessage({type: "pin"}, "*");
    }
};
window.addEventListener('keydown', escapeListener);

