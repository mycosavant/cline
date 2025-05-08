# Building Custom MCP Servers From Scratch Using Klaus: A Comprehensive Guide

This guide provides a comprehensive walkthrough of building a custom MCP (Model Context Protocol) server from scratch, leveraging the powerful AI capabilities of Klaus. The example used will be building a "GitHub Assistant Server" to illustrate the process.

## Understanding MCP and Klaus's Role in Building Servers

### What is MCP?

The Model Context Protocol (MCP) acts as a bridge between large language models (LLMs) like Claude and external tools and data. MCP consists of two key components:

-   **MCP Hosts:** These are applications that integrate with LLMs, such as Klaus, Claude Desktop, and others.
-   **MCP Servers:** These are small programs specifically designed to expose data or specific functionalities to the LLMs through the MCP.

This setup is beneficial when you have an MCP-compliant chat interface, like Claude Desktop, which can then leverage these servers to access information and execute actions.

### Why Use Klaus to Create MCP Servers?

Klaus streamlines the process of building and integrating MCP servers by utilizing its AI capabilities to:

-   **Understand Natural Language Instructions:** You can communicate with Klaus in a way that feels natural, making the development process intuitive and user-friendly.
-   **Clone Repositories:** Klaus can directly clone existing MCP server repositories from GitHub, simplifying the process of using pre-built servers.
-   **Build Servers:** Once the necessary code is in place, Klaus can execute commands like `npm run build` to compile and prepare the server for use.
-   **Handle Configuration:** Klaus manages the configuration files required for the MCP server, including adding the new server to the `Klaus_mcp_settings.json` file.
-   **Assist with Troubleshooting:** If errors arise during development or testing, Klaus can help identify the cause and suggest solutions, making debugging easier.

## Building a GitHub Assistant Server Using Klaus: A Step-by-Step Guide

This section demonstrates how to create a GitHub Assistant server using Klaus. This server will be able to interact with GitHub data and perform useful actions:

### 1. Defining the Goal and Initial Requirements

First, you need to clearly communicate to Klaus the purpose and functionalities of your server:

-   **Server Goal:** Inform Klaus that you want to build a "GitHub Assistant Server". Specify that this server will interact with GitHub data and potentially mention the types of data you are interested in, like issues, pull requests, and user profiles.
-   **Access Requirements:** Let Klaus know that you need to access the GitHub API. Explain that this will likely require a personal access token (GITHUB_TOKEN) for authentication.
-   **Data Specificity (Optional):** You can optionally tell Klaus about specific fields of data you want to extract from GitHub, but this can also be determined later as you define the server's tools.

### 2. Klaus Initiates the Project Setup

Based on your instructions, Klaus starts the project setup process:

-   **Project Structure:** Klaus might ask you for a name for your server. Afterward, it uses the MCP `create-server` tool to generate the basic project structure for your GitHub Assistant server. This usually involves creating a new directory with essential files like `package.json`, `tsconfig.json`, and a `src` folder for your TypeScript code. \
-   **Code Generation:** Klaus generates starter code for your server, including:
    -   **File Handling Utilities:** Functions to help with reading and writing files, commonly used for storing data or logs. \
    -   **GitHub API Client:** Code to interact with the GitHub API, often using libraries like `@octokit/graphql`. Klaus will likely ask for your GitHub username or the repositories you want to work with. \
    -   **Core Server Logic:** The basic framework for handling requests from Klaus and routing them to the appropriate functions, as defined by the MCP. \
-   **Dependency Management:** Klaus analyzes the code and identifies necessary dependencies, adding them to the `package.json` file. For example, interacting with the GitHub API will likely require packages like `@octokit/graphql`, `graphql`, `axios`, or similar. \
-   **Dependency Installation:** Klaus executes `npm install` to download and install the dependencies listed in `package.json`, ensuring your server has all the required libraries to function correctly. \
-   **Path Corrections:** During development, you might move files or directories around. Klaus intelligently recognizes these changes and automatically updates file paths in your code to maintain consistency.
-   **Configuration:** Klaus will modify the `Klaus_mcp_settings.json` file to add your new GitHub Assistant server. This will include:
    -   **Server Start Command:** Klaus will add the appropriate command to start your server (e.g., `npm run start` or a similar command).
    -   **Environment Variables:** Klaus will add the required `GITHUB_TOKEN` variable. Klaus might ask you for your GitHub personal access token, or it might guide you to safely store it in a separate environment file. \
-   **Progress Documentation:** Throughout the process, Klaus keeps the "Memory Bank" files updated. These files document the project's progress, highlighting completed tasks, tasks in progress, and pending tasks.

### 3. Testing the GitHub Assistant Server

Once Klaus has completed the setup and configuration, you are ready to test the server's functionality:

-   **Using Server Tools:** Klaus will create various "tools" within your server, representing actions or data retrieval functions. To test, you would instruct Klaus to use a specific tool. Here are examples related to GitHub:
    -   **`get_issues`:** To test retrieving issues, you might say to Klaus, "Klaus, use the `get_issues` tool from the GitHub Assistant Server to show me the open issues from the 'Klaus/Klaus' repository." Klaus would then execute this tool and present you with the results.
    -   **`get_pull_requests`:** To test pull request retrieval, you could ask Klaus to "use the `get_pull_requests` tool to show me the merged pull requests from the 'facebook/react' repository from the last month." Klaus would execute this tool, using your GITHUB_TOKEN to access the GitHub API, and display the requested data. \
-   **Providing Necessary Information:** Klaus might prompt you for additional information required to execute the tool, such as the repository name, specific date ranges, or other filtering criteria.
-   **Klaus Executes the Tool:** Klaus handles the communication with the GitHub API, retrieves the requested data, and presents it in a clear and understandable format.

### 4. Refining the Server and Adding More Features

Development is often iterative. As you work with your GitHub Assistant Server, you'll discover new functionalities to add, or ways to improve existing ones. Klaus can assist in this ongoing process:

-   **Discussions with Klaus:** Talk to Klaus about your ideas for new tools or improvements. For example, you might want a tool to `create_issue` or to `get_user_profile`. Discuss the required inputs and outputs for these tools with Klaus.
-   **Code Refinement:** Klaus can help you write the necessary code for new features. Klaus can generate code snippets, suggest best practices, and help you debug any issues that arise.
-   **Testing New Functionalities:** After adding new tools or functionalities, you would test them again using Klaus, ensuring they work as expected and integrate well with the rest of the server.
-   **Integration with Other Tools:** You might want to integrate your GitHub Assistant server with other tools. For instance, in the "github-Klaus-mcp" source, Klaus assists in integrating the server with Notion to create a dynamic dashboard that tracks GitHub activity. \

By following these steps, you can create a custom MCP server from scratch using Klaus, leveraging its powerful AI capabilities to streamline the entire process. Klaus not only assists with the technical aspects of building the server but also helps you think through the design, functionalities, and potential integrations.
