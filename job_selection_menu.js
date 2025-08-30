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

let isJobSelectionOnCooldown = false; // Cooldown flag

// --- NUI Interaction Functions ---
function log(message) {
    window.parent.postMessage({ type: 'notification', text: `~b~[Job-Select]~w~ ${message}` }, '*');
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

async function waitForNuiState(key, expectedValue, errorMsg) {
    // Wait for up to 3 seconds (300 retries * 10ms)
    await sleepUntil(() => cache[key] === expectedValue, 300, 10, errorMsg);
}


// --- Job Definitions ---
const NUI_MENU_PHONE_SERVICES = 'Phone / Services';
const NUI_MENU_JOB_CENTER = 'Job Center';

const JOB_IDS = {
    "Airline Pilot": "pilot", "Bus Driver": "busdriver", "Cargo Pilot": "cargopilot",
    "EMS / Paramedic": "emergency", "Farmer": "farmer", "Firefighter": "firefighter",
    "Fisher": "fisher", "Garbage Collector": "garbage", "Helicopter Pilot": "helicopterpilot",
    "Leisure Pilot": "leisurepilot", "Mechanic": "mechanic", "PostOP Employee": "postop",
    "Street Racer": "racer", "Train Conductor": "conductor", "Unemployed": "citizen",
    "Wildlife Hunter": "hunter", "Trucker": "trucker"
};
const MAIN_JOB_NAMES = Object.keys(JOB_IDS);

const TRUCKER_SUB_JOBS = [ "Commercial", "Illegal", "Military", "Petrochemical", "Refrigerated" ];

const TRUCKER_SUBJOB_COMMAND_MAP = {
    "Commercial": "trucker_commercial", "Illegal": "trucker_illegal", "Military": "trucker_military",
    "Petrochemical": "trucker_petrochem", "Refrigerated": "trucker_fridge"
};


// --- UI Management Functions ---
function openJobSelectionMenu() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
        window.parent.postMessage({ type: 'getNamedData', keys: ['job'] }, '*');
        window.parent.postMessage({ type: 'getNamedData', keys: ['subjob'] }, '*');
    }
}

function closeJobSelectionMenu(shouldPin = true) {
    const modal = document.getElementById('jobSelectionModal');
    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        if (shouldPin) {
            window.parent.postMessage({ type: 'pin' }, '*');
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
    // Cooldown check
    if (isJobSelectionOnCooldown) {
        log("~y~Please wait before selecting another job.");
        return;
    }

    // Start cooldown
    isJobSelectionOnCooldown = true;
    document.querySelectorAll('.job-button, .subjob-button').forEach(btn => btn.disabled = true);
    setTimeout(() => {
        isJobSelectionOnCooldown = false;
        document.querySelectorAll('.job-button, .subjob-button').forEach(btn => btn.disabled = false);
        log("~g~You can now select another job.");
    }, 3000); // 3-second cooldown

    console.log(`[DEBUG] Selected job: ${jobName}`);
    log(`Selected: ${jobName}`);
    let success = false;
    try {
        window.parent.postMessage({ type: 'getNamedData', keys: ['job'] }, '*');
        window.parent.postMessage({ type: 'getNamedData', keys: ['subjob'] }, '*');
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
                success = true;
            } else {
                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption.replace('trucker_', '')}`;
                // --- FIXED: Corrected syntax for postMessage payload ---
                window.parent.postMessage({ type: 'sendCommand', command: directSubjobCommand }, '*');
                await sleep(250);
                window.parent.postMessage({ type: 'getNamedData', keys: ['subjob'] }, '*');
                await waitForNuiState('subjob', subjobCommandOption, `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Subjob changed to ${targetSubjobPart}.`);
                success = true;
            }
        } else {
            console.log(`[DEBUG] Navigating to change main job.`);
            window.parent.postMessage({ type: 'openMainMenu' }, '*');
            await sleep(500); // Add breathing room before checking
            window.parent.postMessage({ type: 'getNamedData', keys: ['menu_open'] }, '*');
            await waitForNuiState('menu_open', true, 'Main menu did not open.');

            window.parent.postMessage({ type: 'forceMenuChoice', choice: NUI_MENU_PHONE_SERVICES, mod: 0 }, '*');
            await sleep(250);
            window.parent.postMessage({ type: 'getNamedData', keys: ['menu_choice'] }, '*');
            await waitForNuiState('menu_choice', NUI_MENU_PHONE_SERVICES, `'Phone / Services' menu did not open.`);

            window.parent.postMessage({ type: 'forceMenuChoice', choice: NUI_MENU_JOB_CENTER, mod: 0 }, '*');
            await sleep(250);
            window.parent.postMessage({ type: 'getNamedData', keys: ['menu_choice'] }, '*');
            await waitForNuiState('menu_choice', NUI_MENU_JOB_CENTER, `'Job Center' menu did not open.`);
            
            const targetJobButtonText = isTruckerSelection ? 'Trucker' : jobName;
            window.parent.postMessage({ type: 'forceMenuChoice', choice: targetJobButtonText, mod: 0 }, '*');
            await sleep(250);
            window.parent.postMessage({ type: 'getNamedData', keys: ['menu_open'] }, '*');
            await waitForNuiState('menu_open', false, `Menu did not close after selecting job '${targetJobButtonText}'.`);
            
            await sleep(250);
            window.parent.postMessage({ type: 'getNamedData', keys: ['job'] }, '*');
            await waitForNuiState('job', targetJob, `Job did not change to '${targetJob}' after selection.`);
            log(`~g~Job changed to ${targetJobButtonText}.`);

            if (targetJob === 'trucker' && targetSubjobPart !== "N/A") {
                const subjobCommandOption = TRUCKER_SUBJOB_COMMAND_MAP[targetSubjobPart];
                const directSubjobCommand = `item trucker_pda ${subjobCommandOption.replace('trucker_', '')}`;
                // --- FIXED: Corrected syntax ---
                window.parent.postMessage({ type: 'sendCommand', command: directSubjobCommand }, '*');
                await sleep(250);
                window.parent.postMessage({ type: 'getNamedData', keys: ['subjob'] }, '*');
                await waitForNuiState('subjob', subjobCommandOption, `Subjob did not change to '${targetSubjobPart}' after command.`);
                
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Subjob changed to ${targetSubjobPart}.`);
            }
            success = true;
        }
        
    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        log(`~r~Job Selection failed: ${e.message || 'An unexpected error occurred.'}`);
    } finally {
        closeJobSelectionMenu(false); 
        if (success) {
             await sleep(500);
             window.parent.postMessage({ type: 'forceMenuBack' }, '*');
        }
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
    
    window.parent.postMessage({ type: 'getData' }, '*');
});

const escapeListener = (e) => {
    if (e.key === "Escape") {
        closeJobSelectionMenu(false);
        window.parent.postMessage({ type: 'pin' }, '*');
    }
};
window.addEventListener('keydown', escapeListener);

