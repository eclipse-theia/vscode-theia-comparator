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
    🗂  The Theia versions to compare will be master, v1.21.0, v1.20.0
    🗃  Grabbing content...✔️ 
    🔍 Searching on github the VSCode versions...
    🗂  The VSCode versions to compare will be main, 1.63.2, 1.62.3, 1.61.2, 1.60.2
    🗃  Grabbing content...✔️ 
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-master.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-v1.29.0.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/theia-v1.28.0.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.71.0.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.70.2.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.69.2.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.68.1.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.55.2.d.ts...
	⚙️  Analyzing /home/user/Git/vscode-theia-comparator/lib/vscode-1.53.2.d.ts...
    ⚙️  Parsing additional information from infos.yml...
    ⚙️  Generating HTML report...
    ✍️  HTML status written at /home/user/Git/vscode-theia-comparator/out/status.html
    ⚙️  Generating filtered HTML report...
    ✍️  Filtered HTML status written at /home/user/Git/vscode-theia-comparator/out/filtered-status.html
    ```

## Additional CLI options

### Using a local repository

In order to compare the state of local repositories, you may use the `theia-path` and `vscode-path` options. If these options are provided and no additional versions are provided on the command line, only the local states will be compared.

```shell
yarn run generate theia-path=/path/to/theia vscode-path=/path/to/vscode
```

In this case, only your local Theia and VSCode repositories will be compared.

```shell
yarn run generate theia-path=/path/to/theia
```

With these arguments, your local Theia will be compared with the default set of VSCode versions fetched from GitHub.

```shell
yarn run generate theia-path=/path/to/theia theia-versions=v1.27.0
```

With this input, the local copy of Theia as well as version 1.27.0 fetched from GitHub will be compared with the default set of VSCode versions fetched from GitHub.

### Defining versions for comparison

In order to control the versions used for comparison, you can pass a list of comma-separated commit references (tags, branch names, SHA's) as `theia-versions` or `vscode-versions`. At present, the references must be found in the main repository (i.e. not a fork) for each comparandum.

```shell
yarn run generate theia-versions=v1.27.0,v1.26.0,master vscode-versions=main,1.0.0
```

This input will compare the `master` branch and (tagged) versions 1.27.0 and 1.26.0 of Theia with the `main` branch and (tagged) version 1.0.0 of VSCode.

## Provide additional information

The generator can add notes for any namespace, element or sub element.
Notes are read from [conf/infos.yml](./conf/infos.yml).
An example on how these are configured is given in [conf/infos.example.yml](./conf/infos.example.yml).
