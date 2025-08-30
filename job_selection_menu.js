// --- State Management ---
const NUI_EXTRA_DELAY = 100; // Delay for NUI interactions

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
function log(message) {
    // Check if we are in a FiveM NUI environment before sending the message
    if (typeof GetParentResourceName === 'function') {
        window.parent.postMessage({ type: 'notification', text: `~b~[Job-Select]~w~ ${message}` }, '*');
    } else {
        console.log(`[LOG] ${message.replace(/~.~/g, '')}`); // Log to console for browser testing
    }
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
    await sleep(NUI_EXTRA_DELAY / 2); // Small extra delay
    return true;
}

async function waitForNuiState(key, expectedValue, errorMsg, retries = 100, timeout = 50) {
    console.log(`[DEBUG] Waiting for cache.${key} to be '${expectedValue}'`);
    await sleepUntil(() => cache[key] === expectedValue, retries, timeout, errorMsg);
    console.log(`[DEBUG] Condition met: cache.${key} is now '${expectedValue}'`);
}

async function submitMenu(choice, mod = 0) {
    console.log(`[DEBUG] Submitting menu choice: ${choice}`);
    if (typeof GetParentResourceName === 'function') {
        window.parent.postMessage({ type: "forceMenuChoice", choice, mod }, '*');
    }
    await sleep(NUI_EXTRA_DELAY);
}

// --- Main Job Selection Logic ---
const JOB_IDS = {
    "Airline Pilot": "pilot", "Bus Driver": "busdriver", "Cargo Pilot": "cargopilot",
    "EMS / Paramedic": "emergency", "Farmer": "farmer", "Firefighter": "firefighter",
    "Fisher": "fisher", "Garbage Collector": "garbage", "Helicopter Pilot": "helicopterpilot",
    "Leisure Pilot": "leisurepilot", "Mechanic": "mechanic", "PostOP Employee": "postop",
    "Street Racer": "racer", "Train Conductor": "conductor", "Unemployed": "citizen",
    "Wildlife Hunter": "hunter", "Trucker": "trucker"
};
const MAIN_JOB_NAMES = Object.keys(JOB_IDS);
const TRUCKER_SUBJOB = {
    "Commercial": "trucker_commercial", "Illegal": "trucker_illegal", "Military": "trucker_military",
    "Petrochemical": "trucker_petrochem", "Refrigerated": "trucker_fridge"
};

window.openJobSelectionMenu = function() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.remove('hidden');
        populateJobList();
        // Request fresh data when opening so the selectJob logic has the current job state
        if (typeof GetParentResourceName === 'function') {
            window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
        }
    }
}

window.closeJobSelectionMenu = function() {
    const modal = document.getElementById('jobSelectionModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function populateJobList() {
    const jobListContainer = document.getElementById('jobList');
    if (!jobListContainer) return;
    jobListContainer.innerHTML = '';

    MAIN_JOB_NAMES.forEach(jobName => {
        const buttonContainer = document.createElement('div');
        const button = document.createElement('button');
        button.className = 'job-button';
        button.textContent = jobName;

        if (jobName === "Trucker") {
            buttonContainer.className = 'trucker-job-container';
            button.className += ' trucker-main-button';
            button.onclick = () => selectJob("Trucker");
            buttonContainer.appendChild(button);

            const subjobsMenu = document.createElement('div');
            subjobsMenu.className = 'trucker-subjobs-menu';

            Object.keys(TRUCKER_SUBJOB).forEach(subjob => {
                const subjobButton = document.createElement('button');
                subjobButton.className = 'subjob-button';
                subjobButton.textContent = subjob;
                subjobButton.onclick = (event) => {
                    event.stopPropagation();
                    selectJob(`Trucker (${subjob})`);
                };
                subjobsMenu.appendChild(subjobButton);
            });
            buttonContainer.appendChild(subjobsMenu);
        } else {
            button.onclick = () => selectJob(jobName);
            buttonContainer.appendChild(button);
        }
        jobListContainer.appendChild(buttonContainer);
    });
}

async function selectJob(jobName) {
    console.log(`[DEBUG] Selected job: ${jobName}`);
    closeJobSelectionMenu();

    if (typeof GetParentResourceName !== 'function') {
        log("This functionality is only available in the FiveM game environment.");
        return;
    }

    try {
        window.parent.postMessage({ type: "getNamedData", keys: ['job', 'subjob'] }, "*");
        await sleep(150);

        let isTruckerSelection = jobName.startsWith("Trucker");
        let targetJob = isTruckerSelection ? "trucker" : JOB_IDS[jobName];
        let targetSubjobPart = isTruckerSelection ? (jobName.match(/\((.*?)\)/)?.[1] || cache.last_trucker_subjob_selected || Object.keys(TRUCKER_SUBJOB)[0]) : null;
        const targetSubjobId = targetSubjobPart ? TRUCKER_SUBJOB[targetSubjobPart] : null;

        if (cache.job === targetJob) {
            if (isTruckerSelection) {
                if (cache.subjob === targetSubjobId) {
                    log(`~y~Job already set to ${jobName}.`);
                    return;
                }
                log(`~b~Job is correct, changing subjob to ${targetSubjobPart}...`);
                const directSubjobCommand = `item trucker_pda ${targetSubjobId}`;
                window.parent.postMessage({ type: "sendCommand", command: directSubjobCommand }, '*');
                await waitForNuiState('subjob', targetSubjobId, `Subjob did not change to '${targetSubjobPart}'.`);
                cache.last_trucker_subjob_selected = targetSubjobPart;
                log(`~g~Subjob changed to ${targetSubjobPart}.`);
            } else {
                log(`~y~Job already set to ${jobName}.`);
            }
            return;
        }

        log(`~b~Changing job to ${isTruckerSelection ? 'Trucker' : jobName}...`);
        window.parent.postMessage({ type: "openMainMenu" }, '*');
        await submitMenu('Phone / Services');
        await submitMenu('Job Center');
        
        const targetJobButtonText = isTruckerSelection ? 'Trucker' : jobName;
        await submitMenu(targetJobButtonText);

        await waitForNuiState('job', targetJob, `Job did not change to '${targetJob}'.`);
        log(`~g~Job changed to ${targetJobButtonText}.`);

        if (targetJob === 'trucker' && targetSubjobPart) {
            log(`~b~Setting subjob to ${targetSubjobPart}...`);
            const directSubjobCommand = `item trucker_pda ${targetSubjobId}`;
            window.parent.postMessage({ type: "sendCommand", command: directSubjobCommand }, '*');
            await waitForNuiState('subjob', targetSubjobId, `Subjob did not change to '${targetSubjobPart}'.`);
            cache.last_trucker_subjob_selected = targetSubjobPart;
            log(`~g~Subjob changed to ${targetSubjobPart}.`);
        }

    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        log(`~r~Job Selection failed. Error: ${e.message || 'Unknown error'}`);
    } finally {
        if (typeof GetParentResourceName === 'function') {
            window.parent.postMessage({ type: "forceMenuBack" }, '*');
        }
        await sleep(100);
    }
}

window.reloadPage = function() {
    window.location.reload();
}

// --- Event Listeners and Initial Setup ---
window.addEventListener("message", (event) => {
    const evt = event.data;
    if (!evt || !evt.data) return;

    for (const key in evt.data) {
        if (cache[key] !== evt.data[key]) {
            cache[key] = evt.data[key];

            if (key === 'subjob' && cache.job === "trucker") {
                const subjobName = Object.keys(TRUCKER_SUBJOB).find(
                    name => TRUCKER_SUBJOB[name] === evt.data[key]
                );
                if (subjobName) {
                    cache.last_trucker_subjob_selected = subjobName;
                }
            }
        }
    }
});

const escapeListener = (e) => {
    if (e.key === "Escape") {
        closeJobSelectionMenu();
        if(typeof GetParentResourceName === 'function') {
            window.parent.postMessage({ type: "pin" }, "*");
        }
    }
};
window.addEventListener('keydown', escapeListener);

document.addEventListener('DOMContentLoaded', () => {
    const openJobMenuBtn = document.getElementById('openJobMenuBtn');
    if (openJobMenuBtn) {
        openJobMenuBtn.addEventListener('click', openJobSelectionMenu);
    }
    
    if (typeof GetParentResourceName === 'function') {
        openJobMenuBtn.style.display = 'none';
        // This is where you would listen for a message from your LUA script to open the menu
        // Example:
        // window.addEventListener('message', function(event) {
        //     if (event.data.type === 'openJobMenu') {
        //         openJobSelectionMenu();
        //     }
        // });
    }
});

