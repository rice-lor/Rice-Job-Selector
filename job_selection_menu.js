// --- State Management ---
// This cache will be updated by messages from the game client.
const cache = {
    menu_open: false,
    menu: "",
    job: "N/A",
    subjob: "N/A",
    last_trucker_subjob_selected: "Commercial",
    menu_choice: ""
};

// --- NUI Interaction ---

/**
 * Sends a command to the FiveM game client.
 * @param {string} type - The command type (e.g., 'sendCommand', 'notification').
 * @param {object} data - The payload for the command.
 */
function sendNuiCommand(type, data = {}) {
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
        sendNuiCommand('getNamedData', { keys: ['job', 'subjob'] });
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
    jobListContainer.innerHTML = ''; // Clear previous list before populating

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
        // Get current job status before starting
        sendNuiCommand('getNamedData', { keys: ['job', 'subjob'] });
        await sleep(200);

        let isTruckerSelection = jobName.startsWith("Trucker");
        let targetJob = isTruckerSelection ? "trucker" : JOB_IDS[jobName];
        let targetSubjobPart = isTruckerSelection ? (jobName.match(/Trucker \((.*?)\)/)?.[1] || cache.last_trucker_subjob_selected) : null;
        
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
            await sleep(750); // Wait for command to process
            log(`~g~Set subjob to ${targetSubjobPart}`);
            
        } else {
            const notificationText = isTruckerSelection ? `Trucker (${targetSubjobPart})` : jobName;
            log(`Changing to ${notificationText}...`);
            
            // --- REVISED: Removed verification, using larger fixed delays ---
            sendNuiCommand('openMainMenu');
            await sleep(750);
            
            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_PHONE_SERVICES, mod: 0 });
            await sleep(750);

            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_JOB_CENTER, mod: 0 });
            await sleep(750);
            
            const targetJobButtonText = isTruckerSelection ? 'Trucker' : jobName;
            sendNuiCommand('forceMenuChoice', { choice: targetJobButtonText, mod: 0 });
            await sleep(1000); // Longer delay for job change to process
            
            log(`~g~Set job to ${isTruckerSelection ? 'Trucker' : jobName}`);
            
            if (isTruckerSelection && targetSubjobPart) {
                await sleep(750);
                const targetSubjobId = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                const directSubjobCommand = `item trucker_pda ${targetSubjobId.replace('trucker_', '')}`;
                sendNuiCommand('sendCommand', { command: directSubjobCommand });
                cache.last_trucker_subjob_selected = targetSubjobPart;
                await sleep(750);
                log(`~g~Set subjob to ${targetSubjobPart}`);
            }
        }
    } catch (e) {
        console.error(`[ERROR] Job selection failed:`, e);
        log(`~r~An unexpected error occurred during job selection.`);
    } finally {
        await sleep(500); 
        sendNuiCommand('forceMenuBack');
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
    
    sendNuiCommand('getData');
});

const escapeListener = (e) => {
    if (e.key === "Escape") {
        closeJobSelectionMenu(false);
        window.parent.postMessage({type: "pin"}, "*");
    }
};
window.addEventListener('keydown', escapeListener);

