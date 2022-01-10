# Eclipse Theia vs VS Code API Comparator

[![API Compatibility](https://img.shields.io/badge/API_Compatibility-Status_Report-blue.svg?style=flat-curved)](https://eclipse-theia.github.io/vscode-theia-comparator/status.html)

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
    🗂  The Theia versions to compare will be master, v0.3.19, v0.3.18
    🗃  Grabbing content...✔️
    🔍 Searching on github the VSCode versions...
    🗂  The VSCode versions to compare will be master, 1.31.0, 1.30.2, 1.29.1, 1.28.2
    🗃  Grabbing content...✔️
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/vscode-master.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/vscode-1.31.0.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/vscode-1.30.2.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/vscode-1.29.1.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/vscode-1.28.2.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/vscode-theia.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/theia-master.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/vscode-theia.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/theia-v0.3.19.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/vscode-theia.d.ts...
    ⚙️  Analyzing /Users/benoitf/Documents/git/theia/theia-checker/lib/theia-v0.3.18.d.ts...
    ✍️  HTML status written at /Users/benoitf/Documents/git/theia/theia-checker/lib/status.html
    ✨  Done in 10.51s.
    ```

## Provide additional information

The generator can add notes for any namespace, element or sub element.
Notes are read from [conf/infos.yml](./conf/infos.yml).
An example on how these are configured is given in [conf/infos.example.yml](./conf/infos.example.yml).
