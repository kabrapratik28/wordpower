# ✨ WordPower: Improve Your Writing

**Improve Your Writing — 100% Private, Free & Open Source, Powered by On-Device AI**

WordPower is a Chrome extension that helps you improve your writing by leveraging the power of local, on-device AI. All processing is done on your machine, ensuring your data remains private. This extension is free, open-source, and uses [Ollama](https://ollama.com/) to run large language models locally.

## Features

*   **100% Private:** Your text never leaves your computer.
*   **Free & Open Source:** No subscriptions, no ads. The code is available for you to inspect and contribute to.
*   **On-Device AI:** Powered by Ollama, running language models directly on your machine.
*   **Seamless Integration:** Works within your Chrome browser, wherever you write.

## How It Works

WordPower uses Ollama to run powerful language models on your device. When you select text and activate the extension, it sends a prompt to your local Ollama instance and streams the response back to you. This allows for a fast and private way to get AI-powered writing assistance.

## Getting Started with Local Development

To get started with developing WordPower locally, you'll need to have Node.js and pnpm installed.

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    This will create a `wxt-dist` directory with the unpacked extension. You can load this directory into Chrome using the "Load unpacked" option in the Extensions page (`chrome://extensions`).

3.  **Build the extension:**
    ```bash
    pnpm build
    ```
    This will build the extension for production and create a `.output` directory containing the bundled extension.

## Enabling Ollama for Web UI

For the extension to communicate with your local Ollama instance, you need to enable Cross-Origin Resource Sharing (CORS).

**Note:** The following instructions allow any website to access your Ollama instance. For better security, you can restrict access to the extension's ID by replacing `*` with `chrome-extension://<your-extension-id>`.

### macOS

1.  Open the Terminal app.
2.  Run the following command:
    ```bash
    launchctl setenv OLLAMA_ORIGINS "*"
    ```
3.  Restart the Ollama application.

### Windows

1.  Quit Ollama from the system tray.
2.  Search for "environment variables" in the Start menu and select "Edit environment variables for your account".
3.  Under "User variables", click "New...".
4.  Set "Variable name" to `OLLAMA_ORIGINS` and "Variable value" to `*`.
5.  Click OK and restart the Ollama application.

### Linux

1.  Open your terminal and edit the Ollama systemd service file:
    ```bash
    sudo systemctl edit ollama.service
    ```
2.  Add the following lines:
    ```ini
    [Service]
    Environment="OLLAMA_ORIGINS=*"
    ```
3.  Save the file, then reload systemd and restart Ollama:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl restart ollama
    ```

## Architecture

The project is structured as a standard web extension using the `wxt` framework.

*   `entrypoints/`: This is the heart of the extension.
    *   `content.tsx`: The content script that gets injected into web pages and is responsible for the floating prompt UI.
    *   `background.ts`: The background script that handles communication with Ollama.
    *   `popup/`: The UI for the extension's popup.
    *   `prompt-settings/`: The UI for the extension's settings page.
    *   `components/`: Shared React components used across different entrypoints.
    *   `utils/`: Utility functions, constants, and hooks.
*   `public/`: Static assets like the extension icon.
*   `assets/`: Other assets like CSS and SVGs.
*   `wxt.config.ts`: The configuration file for the `wxt` framework, used to define the extension's manifest.
*   `package.json`: Defines project scripts and dependencies.
*   `tsconfig.json`: TypeScript configuration.

## Contributing

We welcome contributions! If you'd like to help improve WordPower, please feel free to:

*   Report bugs and suggest features by opening an issue.
*   Submit pull requests with bug fixes or new features.

## License

This project is licensed under the MIT License.