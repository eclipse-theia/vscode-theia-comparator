# Eclipse Theia vs VS Code API Comparator

[![API Compatibility](https://img.shields.io/badge/API_Compatibility-Status_Report-blue.svg?style=flat-curved)](https://eclipse-theia.github.io/vscode-theia-comparator/status.html)
[![API Compatibility](https://img.shields.io/badge/API_Compatibility-Filtered_Status_Report_(unsupported_only)-blue.svg?style=flat-curved)](https://eclipse-theia.github.io/vscode-theia-comparator/filtered-status.html)

## Overview

The repository contains the source code to generate a status report regarding the compatibility
between the [Eclipse Theia](https://github.com/eclipse-theia/theia) framework, and the
[VS Code Extension API](https://code.visualstudio.com/api/references/vscode-api).

## Prerequisites

The environment variable `GITHUB_TOKEN` must be defined with a valid GitHub token.
The tool grabs files remotely, and checks the latest versions using the [GraphQL](https://docs.github.com/en/graphql) GitHub API.

## Creating the Report

1. Build the tool:

    ```
    $ yarn
    ```

2. Generate the report:

    ```
    $ yarn run generate
    ```

    Example output:


    ```
    $ node lib/index.js
    🔍 Searching on github the Theia versions...
    🗂  The Theia versions to compare will be master, v1.21.0, v1.20.0
    🗃  Grabbing content...✔️ 
    🔍 Searching on github the VSCode versions...
    🗂  The VSCode versions to compare will be main, 1.63.2, 1.62.3, 1.61.2, 1.60.2
    🗃  Grabbing content...✔️ 
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-main.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.63.2.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.62.3.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.61.2.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.60.2.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/conf/vscode-theia.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-master.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/conf/vscode-theia.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-v1.21.0.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/conf/vscode-theia.d.ts...
    ⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-v1.20.0.d.ts...
    ⚙️  Parsing additional information from infos.yml...
    ⚙️  Generating HTML report...
    ✍️  HTML status written at /home/user/Git/vscode-theia-comparator/out/status.html
    ⚙️  Generating filtered HTML report...
    ✍️  Filtered HTML status written at /home/user/Git/vscode-theia-comparator/out/filtered-status.html
    ```

## Provide additional information

The generator can add notes for any namespace, element or sub element.
Notes are read from [conf/infos.yml](./conf/infos.yml).
An example on how these are configured is given in [conf/infos.example.yml](./conf/infos.example.yml).
