import state from './state.js';

// Minimal cache for NUI state simulation
const cache = {
    menu_open: false,
    menu_choices: [],
    prompt: false
};

// Minimal log function
export function log(message) {
    console.log(message.replace(/~[rgwy~]/g, '')); // Remove color codes for console output
    // In a real NUI environment, this would send a notification to the game.
    // window.parent.postMessage({ type: 'notification', text: message }, '*');
}

// Minimal sleep function
export function sleep(ms) {
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
        // For standalone testing, you'd manually manipulate 'cache' for different states.
    }
    await sleep(state.NUI_EXTRA_DELAY); // Simulate extra delay after condition met
    return true;
}

// Minimal submitMenu function
async function submitMenu(choice, mod = 0) {
    console.log(`Submitting menu choice: ${choice}, mod: ${mod}`);
    // In a real NUI environment, this sends the choice to the game.
    // window.parent.postMessage({ type: 'forceMenuChoice', choice, mod }, '*');
    
    // Simulate menu state change for testing
    cache.menu_open = false; // Menu closes after selection
    cache.menu_choices = []; // Choices clear
    await sleep(state.NUI_EXTRA_DELAY);
}

// Minimal submitPrompt function
async function submitPrompt(value) {
    console.log(`Submitting prompt value: ${value}`);
    // In a real NUI environment, this sends the prompt value to the game.
    // window.parent.postMessage({ type: 'forceSubmitValue', value: value.toString() }, '*');
    
    // Simulate prompt state change for testing
    cache.prompt = false; // Prompt closes after submission
    await sleep(state.NUI_EXTRA_DELAY);
}


// Minimal executeActions function
export async function executeActions(executionActions, autoCloseMenu = true) {
    try {
        // Simulate NUI actions
        console.log("Simulating NUI executeActions...");
        
        // For testing purposes, manually set initial menu state if needed
        // For example, to simulate 'Phone / Services' being open:
        // cache.menu_open = true;
        // cache.menu_choices = [['Phone / Services'], ['Another Option']];
        // You'd need to simulate subsequent menu_choices based on the expected flow.

        for (const { actions, amount } of executionActions) {
            for (const { action, mod } of actions) {
                // Simulate waiting for the menu to be open and choice available
                console.log(`  Waiting for menu option: '${action}'`);
                // For a real test, you'd need to ensure 'cache.menu_open' and 'cache.menu_choices'
                // are updated by the game client to reflect the menu state.
                // For this minimal setup, we'll assume the option is always available for demonstration.
                // In a real scenario, this sleepUntil would rely on actual game messages.
                
                // Simplified sleepUntil for minimal testing:
                await sleep(state.NUI_EXTRA_DELAY * 2); // Simulate some processing time
                
                // In a full NUI app, this would be:
                // await sleepUntil(
                //     () => cache.menu_open && (cache.menu_choices ?? []).findIndex(
                //         (a) => (a ?? [])[0]?.replace(/(<.+?>)|(&#.+?;)/g, '') === action
                //     ) !== -1,
                //     300, // NUI_RETRIES
                //     10,  // NUI_TIMEOUT
                //     `Could not find option '${action}' in menu, exiting...`
                // );

                await submitMenu(action, mod); // Simulate sending the choice
            }

            if (amount > 0) {
                console.log(`  Waiting for prompt to enter amount: ${amount}`);
                // Simplified sleepUntil for minimal testing:
                await sleep(state.NUI_EXTRA_DELAY * 2); // Simulate some processing time
                
                // In a full NUI app, this would be:
                // await sleepUntil(
                //     () => cache.prompt === true,
                //     300, // NUI_RETRIES
                //     10,  // NUI_TIMEOUT
                //     'Could not find prompt, exiting...'
                // );
                await submitPrompt(amount); // Simulate submitting the amount
            }
            await sleep(state.NUI_EXTRA_DELAY);
        }

        await sleep(state.NUI_EXTRA_DELAY * 5); // Final delay
        if (autoCloseMenu) {
            console.log("Simulating NUI menu close.");
            // window.parent.postMessage({ type: 'forceMenuBack' }, '*'); // Actual NUI close command
        }
    } catch (e) {
        console.error('Error during executeActions simulation:', e);
        return false;
    }
    return true;
}

// Export cache for external manipulation during testing if needed
export { cache };
