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
        const baseDir = path.dirname(dotBuildUri.path);
        if (!dotFile) {
            logger.error("No .esbuild.json file found");
            return;
        }
        try {
            let result = await esbuild.build( 
                {
                    ...dotFile,
                    plugins: [
                        new TsVSCodePlugin(baseDir)
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

            const baseDirUri = vscode.Uri.from({scheme: workspaceUri.scheme, path: baseDir});
            for (let item of result.outputFiles!) {
                const uri = vscode.Uri.joinPath(baseDirUri, item.path);
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
    readonly #basePath: string;
    
    constructor(basePath: string) {
        this.name = 'ts-vscode-plugin';
        this.#basePath = basePath;
    }

    setup = (build: esbuild.PluginBuild) => {
        const basePath = this.#basePath;
        const baseNodeModulesPath = path.join(basePath, 'node_modules');

        build.onLoad({ filter: /.*/ }, async (args) => {
            try {
                const resolvedPath = resolveBasePath(basePath, args.path);
                const uri = vscode.Uri.from({scheme: workspaceUri.scheme, path: resolvedPath});
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
                   return;
                }

                logger.info(`build.onResolve ${filePath}`);
                return {
                    path: filePath,
                    namespace: args.namespace,
                };
            }

            // check externals
            const set = new Set(build.initialOptions.external ?? []);

            if (set.has(args.path)) {
                // external path
                return undefined; 
            }

            // if node module
            if (path.extname(args.path) === '') {
                // get path from node_modules
                const pathInNodeModules = await resolveNodeModulesPath(baseNodeModulesPath, args.path);
                if (!pathInNodeModules) {
                    logger.error(`build.onResolve ${args.path} not found in node_modules`);
                    return;
                }

                return {
                    path: pathInNodeModules,
                    namespace: args.namespace,
                };
                
            }

            logger.info(`build.onResolve ${args.path}`);
            const resolvedPath = resolveBasePath(basePath, args.path);
            return {
                path: resolvedPath,
                namespace: args.namespace,
                pluginName: 'ts-vscode-plugin',
            };
        });
    };
}

async function resolveNodeModulesPath(basePath: string, filepath: string) {
    // try to resolve as js file
    const pathInNodeModules = path.join(basePath, filepath + ".js");
    if (await fileExists(pathInNodeModules)) {
        return pathInNodeModules;
    }

    // try to resolve as folder with index.js
    const pathInNodeModulesIndex = path.join(basePath, filepath, "index.js");
    if (await fileExists(pathInNodeModulesIndex)) {
        return pathInNodeModulesIndex;
    }

    return undefined;
}

function resolveBasePath(basePath: string, filepath: string) {
    const resolvedPath = path.resolve(basePath, filepath);
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
