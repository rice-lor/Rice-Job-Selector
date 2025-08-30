// --- State Management ---
const cache = {
    menu_open: false,
    menu_choices: [],
    prompt: false,
    menu: "",
    menu_choice: "",
    job: "N/A",
    subjob: "N/A",
    last_trucker_subjob_selected: ""
};

// --- NUI Interaction Functions ---
function sendNuiCommand(type, data = {}) {
    if (window.parent !== window) {
        window.parent.postMessage({ type, ...data }, '*');
    }
    console.log(`[NUI SENT] Type: ${type}, Data: ${JSON.stringify(data)}`);
}

function log(message) {
    sendNuiCommand('notification', { text: `~b~[Job-Select]~w~ ${message}` });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    await sleep(10); // Small extra delay after condition met
    return true;
}

async function waitForNuiState(key, expectedValue, errorMsg, retries = 200, timeout = 10) {
    await sleepUntil(() => cache[key] === expectedValue, retries, timeout, errorMsg);
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

const TRUCKER_SUB_JOBS = [
    "Commercial",
    "Illegal",
    "Military",
    "Petrochemical",
    "Refrigerated"
];

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
            TRUCKER_SUB_JOBS.forEach(subjob => {
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
    console.log(`[DEBUG] Selected job: ${jobName}`);
    try {
        sendNuiCommand('getNamedData', { keys: ['job'] });
        sendNuiCommand('getNamedData', { keys: ['subjob'] });
        await sleep(200);

        let isTruckerSelection = jobName.startsWith("Trucker");
        let targetJob = isTruckerSelection ? "trucker" : (JOB_IDS[jobName] || jobName.toLowerCase().replace(/ /g, '_'));
        let targetSubjobPart = isTruckerSelection ? (jobName.match(/Trucker \((.*?)\)/)?.[1] || cache.last_trucker_subjob_selected || TRUCKER_SUB_JOBS[0]) : "N/A";
        
        if (cache.job === targetJob) {
            let isSubjobCorrect = true;
            if (targetJob === 'trucker' && targetSubjobPart !== "N/A") {
                const targetSubjobId = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                isSubjobCorrect = (cache.subjob === targetSubjobId);
            }
            if (isSubjobCorrect) {
                log(`~y~Job already set to ${jobName}.`);
            } else {
                console.log(`[DEBUG] Job is already '${targetJob}' but subjob is incorrect. Setting subjob.`);
                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                if (!subjobCommandOption) {
                    log(`~r~Error: Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                    throw new Error(`Command for Trucker subjob '${targetSubjobPart}' is unknown.`);
                }
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption.replace('trucker_', '')}`;
                sendNuiCommand('sendCommand', { command: directSubjobCommand });
                await sleep(250);
                sendNuiCommand('getNamedData', { keys: ['subjob'] });
                await waitForNuiState('subjob', subjobCommandOption, `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Subjob changed to ${targetSubjobPart}.`);
            }
        } else {
            console.log(`[DEBUG] Job is not '${targetJob}'. Navigating to change main job.`);
            sendNuiCommand('openMainMenu');
            await sleep(250);
            sendNuiCommand('getNamedData', { keys: ['menu_open'] });
            await waitForNuiState('menu_open', true, `Main menu did not open.`);

            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_PHONE_SERVICES, mod: 0 });
            await sleep(250);
            sendNuiCommand('getNamedData', { keys: ['menu_choice'] });
            await waitForNuiState('menu_choice', NUI_MENU_PHONE_SERVICES, `'Phone / Services' menu did not open.`);

            sendNuiCommand('forceMenuChoice', { choice: NUI_MENU_JOB_CENTER, mod: 0 });
            await sleep(250);
            sendNuiCommand('getNamedData', { keys: ['menu_choice'] });
            await waitForNuiState('menu_choice', NUI_MENU_JOB_CENTER, `'Job Center' menu did not open.`);
            
            const targetJobButtonText = isTruckerSelection ? 'Trucker' : jobName;
            sendNuiCommand('forceMenuChoice', { choice: targetJobButtonText, mod: 0 });
            await sleep(250);
            sendNuiCommand('getNamedData', { keys: ['menu_open'] });
            await waitForNuiState('menu_open', false, `Menu did not close after selecting job '${targetJobButtonText}'.`);
            
            await sleep(250);
            sendNuiCommand('getNamedData', { keys: ['job'] });
            await waitForNuiState('job', targetJob, `Job did not change to '${targetJob}' after selection.`);
            log(`~g~Job changed to ${targetJobButtonText}.`);

            if (targetJob === 'trucker' && targetSubjobPart !== "N/A") {
                console.log(`[DEBUG] Now a trucker. Setting subjob to '${targetSubjobPart}'.`);
                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption.replace('trucker_', '')}`;
                sendNuiCommand('sendCommand', { command: directSubjobCommand });
                await sleep(250);
                sendNuiCommand('getNamedData', { keys: ['subjob'] });
                await waitForNuiState('subjob', subjobCommandOption, `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Subjob changed to ${targetSubjobPart}.`);
            }
        }
        
    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        log(`~r~Job Selection failed: You don't have enough Job card or the Job is not unlocked. Error: ${e.message || 'Unknown error'}`);
    } finally {
        closeJobSelectionMenu(false); 
        await sleep(100);
        if (cache.menu_open) {
             sendNuiCommand('forceMenuBack');
        }
        await sleep(100); 
        sendNuiCommand('getNamedData', { keys: ['job'] });
        sendNuiCommand('getNamedData', { keys: ['subjob'] });
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
        sendNuiCommand("pin");
    }
};
window.addEventListener('keydown', escapeListener);

