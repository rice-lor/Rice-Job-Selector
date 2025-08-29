import state from './state.js';
import * as nui from './nui.js';

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
    console.log("Attempting to open job selection menu."); // Debugging log
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
    console.log(`Selected job: ${jobName}`);
    closeJobSelectionMenu(); // Close the UI immediately

    try {
        // Step 1: Send the direct command to open the main menu
        if (typeof nui !== 'undefined' && typeof nui.log === 'function') {
            nui.log(`~y~[RJS]~w~ Sending command to open Main Menu...`);
        }
        window.parent.postMessage({ type: "sendCommand", command: "openMainMenu" }, '*');
        await nui.sleep(state.NUI_EXTRA_DELAY * 5); // Give game time to process command

        const executionActions = [];

        // Step 2: Always navigate to "Phone / Services" first
        executionActions.push({ actions: [{ action: 'Phone / Services', mod: 0 }], amount: 0 });

        // Determine the next steps based on the job type
        if (jobName.startsWith("Trucker (")) {
            const subjobMatch = jobName.match(/Trucker \((.*?)\)/);
            const subjobName = subjobMatch ? subjobMatch[1] : jobName; // Extract "Commercial", "Illegal", etc.

            // New sequence for Trucker subjobs:
            // 1. Phone / Services -> Trucker (main job)
            // 2. openMainMenu (direct command again)
            // 3. Phone / Services -> Trucker's PDA -> [Subjob Name]
            executionActions.push(
                { actions: [{ action: 'Phone / Services', mod: 0 }], amount: 0 },
                { actions: [{ action: 'Trucker', mod: 0 }], amount: 0 } // Select main "Trucker" job
            );

            // After selecting "Trucker", re-open main menu to access PDA
            if (typeof nui !== 'undefined' && typeof nui.log === 'function') {
                nui.log(`~y~[RJS]~w~ Re-sending command to open Main Menu for PDA...`);
            }
            window.parent.postMessage({ type: "sendCommand", command: "openMainMenu" }, '*');
            await nui.sleep(state.NUI_EXTRA_DELAY * 5); // Give game time to process command

            executionActions.push(
                { actions: [{ action: 'Phone / Services', mod: 0 }], amount: 0 },
                { actions: [{ action: 'Trucker\'s PDA', mod: 0 }], amount: 0 },
                { actions: [{ action: subjobName, mod: 0 }], amount: 0 } // Then select the subjob
            );

        } else {
            // For all other jobs, the path is Phone / Services -> Job Center -> [Job Name]
            executionActions.push(
                { actions: [{ action: 'Phone / Services', mod: 0 }], amount: 0 },
                { actions: [{ action: 'Job Center', mod: 0 }], amount: 0 },
                { actions: [{ action: jobName, mod: 0 }], amount: 0 }
            );
        }

        // Execute the actions via NUI
        if (typeof nui !== 'undefined' && typeof nui.executeActions === 'function') {
            if (await nui.executeActions(executionActions, true)) { // 'true' means autoCloseMenu
                nui.log(`~g~[RJS]~w~ Successfully applied for the ${jobName} job.`);
            } else {
                nui.log(`~r~[RJS]~w~ Job Selection failed: You don't have enough Job card or the Job is not unlocked.`);
            }
        } else {
            console.error("NUI functions not available. Cannot execute job selection.");
            alert(`Simulating job selection for: ${jobName}\n(NUI functions not loaded)`);
        }
    } catch (e) {
        console.error(`Error during job selection for ${jobName}:`, e);
        if (typeof nui !== 'undefined' && typeof nui.log === 'function') {
            nui.log(`~r~[RJS]~w~ Error selecting job: ${e.message || 'Unknown error'}`);
        }
    }
}

// Attach functions to the window object for HTML access
window.openJobSelectionMenu = openJobSelectionMenu;
window.closeJobSelectionMenu = closeJobSelectionMenu;
window.selectJob = selectJob;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and DOM content parsed."); // Confirm script loading
    const openJobMenuBtn = document.getElementById('openJobMenuBtn');
    if (openJobMenuBtn) {
        console.log("Open Job Selection button found:", openJobMenuBtn); // Confirm button found
        openJobMenuBtn.addEventListener('click', openJobSelectionMenu);
    } else {
        console.error("Error: openJobMenuBtn element not found on DOMContentLoaded.");
    }
});
