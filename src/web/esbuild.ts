import * as esbuild from 'esbuild-wasm/lib/browser';
import path = require('path-browserify');
import * as vscode from 'vscode';

const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
const logger = vscode.window.createOutputChannel('esbuild', {log: true});

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

    async build(entryPoint: string, outdir: string) {
        await this.initPromise;
        try {
            let result = await esbuild.build( 
                {
                    outdir: outdir, 
                    entryPoints: [entryPoint], 
                    bundle: true, 
                    sourcemap: true, 
                    target: ['es2015'],
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
                const uri = vscode.Uri.from({ scheme: workspaceUri.scheme, path: item.path});
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
        build.onLoad({ filter: /\.ts$/ }, async (args) => {
            try {
                const uri = vscode.Uri.from({scheme: workspaceUri.scheme, path: args.path});
                logger.info(`build.onLoad ${uri}`);
                let text = await vscode.workspace.fs.readFile(uri);
                return {
                    contents: text,
                    loader: 'ts',
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
            return {
                path: args.path,
                namespace: args.namespace,
                pluginName: 'ts-vscode-plugin',
            };
        });
    }
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

async function fileExists(path: string) {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.from({scheme: workspaceUri.scheme, path}));
        return true;
    } catch (error) {
        return false;
    }
} 