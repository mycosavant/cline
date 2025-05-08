# Klaus API

The Klaus extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/Klaus.d.ts` to your extension's source directory.
2. Include `Klaus.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const KlausExtension = vscode.extensions.getExtension<KlausAPI>("saoudrizwan.cline-dev.")

    if (!KlausExtension?.isActive) {
    	throw new Error("Klaus extension is not activated")
    }

    const Klaus = KlausExtension.exports

    if (Klaus) {
    	// Now you can use the API

    	// Set custom instructions
    	await Klaus.setCustomInstructions("Talk like a pirate")

    	// Get custom instructions
    	const instructions = await Klaus.getCustomInstructions()
    	console.log("Current custom instructions:", instructions)

    	// Start a new task with an initial message
    	await Klaus.startNewTask("Hello, Klaus! Let's make a new project...")

    	// Start a new task with an initial message and images
    	await Klaus.startNewTask("Use this design language", ["data:image/webp;base64,..."])

    	// Send a message to the current task
    	await Klaus.sendMessage("Can you fix the @problems?")

    	// Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
    	await Klaus.pressPrimaryButton()

    	// Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
    	await Klaus.pressSecondaryButton()
    } else {
    	console.error("Klaus API is not available")
    }
    ```

    **Note:** To ensure that the `onemind.klaus-dev` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "onemind.klaus-dev"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `Klaus.d.ts` file.
