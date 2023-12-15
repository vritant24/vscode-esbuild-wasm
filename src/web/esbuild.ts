import * as esbuild from 'esbuild-wasm/lib/browser';
import path = require('path-browserify');
import * as vscode from 'vscode';
import { fileExists, logger, workspaceUri } from './utilities';
import { parseDotBuildFile } from './dotBuild';
import { Loader } from 'esbuild-wasm';

const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];

export class EsbuildManager {
    private readonly initPromise: Promise<void>;
    
    constructor(context: vscode.ExtensionContext) {
        this.initPromise = this.initWasm(context);
    }

    async initWasm(context: vscode.ExtensionContext) {
        const wasmpath = vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'esbuild-wasm', 'esbuild.wasm');
        const wasmContents = await vscode.workspace.fs.readFile(wasmpath);
        const module = await WebAssembly.compile(wasmContents);
        await esbuild.initialize({
            wasmModule: module,
        });
    }

    async build(dotBuildUri: vscode.Uri) {
        await this.initPromise;
        const dotFile = await parseDotBuildFile(dotBuildUri);
        if (!dotFile) {
            logger.error("No .esbuild.json file found");
            return;
        }
        try {
            let result = await esbuild.build( 
                {
                    ...dotFile,
                    plugins: [
                        new TsVSCodePlugin()
                    ],
                }
            );
            if (result.errors.length > 0) {
                for (let error of result.errors) {
                    logger.error(error.text);
                }
                return;
            }

            if (result.warnings.length > 0) {
                for (let warning of result.warnings) {
                    logger.warn(warning.text);
                }
            }

            for (let item of result.outputFiles!) {
                const uri = vscode.Uri.joinPath(workspaceUri, item.path);
                await vscode.workspace.fs.writeFile(uri, item.contents);
            }
        } catch (error) {
            console.log(error);
            if (error instanceof Error || typeof error === 'string') {
                logger.error(error);
            }
        }
    }
}

export class TsVSCodePlugin implements esbuild.Plugin {
    name: string;
    constructor() {
        this.name = 'ts-vscode-plugin';
    }
    setup(build: esbuild.PluginBuild) {
        build.onLoad({ filter: /.*/ }, async (args) => {
            try {
                const uri = vscode.Uri.from({scheme: workspaceUri.scheme, path: args.path});
                logger.info(`build.onLoad ${uri}`);
                let text = await vscode.workspace.fs.readFile(uri);
                const ext = path.extname(args.path).substring(1);
                return {
                    contents: text,
                    loader: ext as Loader,
                };
            } catch (error) {
                logger.error("build.onLoad error"); 
                console.log(error);
                if (error instanceof Error || typeof error === 'string') {
                    logger.error(error);
                }
            }
        });
    build.onResolve({ filter: /.*/ }, async (args) => {
            if (args.path.startsWith('.')) {
                // relative path

                // get parent directory of importer
                const resolvedPath = path.join(path.dirname(args.importer), args.path);
                const importerUri = vscode.Uri.from({scheme: workspaceUri.scheme, path: resolvedPath});
 
                // get path with extension
                const filePath = await getFileWithExtension(importerUri.path);
                if (!filePath) {
                    throw new Error(`File not found: ${args.path}`);
                }

                logger.info(`build.onResolve ${filePath}`);
                return {
                    path: filePath,
                    namespace: args.namespace,
                };
            }
            logger.info(`build.onResolve ${args.path}`);
            const resolvedPath = getAsWorkspacePath(args.path);
            return {
                path: resolvedPath,
                namespace: args.namespace,
                pluginName: 'ts-vscode-plugin',
            };
        });
    }
}

function getAsWorkspacePath(filepath: string) {
    const resolvedPath = path.resolve(workspaceUri.path, filepath);
    return resolvedPath;
}

async function getFileWithExtension(path: string) {
    if (await fileExists(path)) {
        return path;
    }
    for (let extension of supportedExtensions) {
        if (await fileExists(path + extension)) {
            return path + extension;
        }
    }
    return undefined;
}
