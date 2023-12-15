import * as esbuild from 'esbuild-wasm/lib/browser';
import * as vscode from 'vscode';

export class EsbuildManager {
    private readonly initPromise: Promise<void>;
    private readonly logger: vscode.LogOutputChannel;
    
    constructor(context: vscode.ExtensionContext) {
        this.logger = vscode.window.createOutputChannel('esbuild', {log: true});
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
                    this.logger.error(error.text);
                }
                return;
            }

            if (result.warnings.length > 0) {
                for (let warning of result.warnings) {
                    this.logger.warn(warning.text);
                }
            }

            const workspaceUri = vscode.workspace.workspaceFolders![0].uri;

            for (let item of result.outputFiles!) {
                const uri = vscode.Uri.from({ scheme: workspaceUri.scheme, path: item.path});
                await vscode.workspace.fs.writeFile(uri, item.contents);
            }
        } catch (error) {
            console.log(error);
            if (error instanceof Error || typeof error === 'string') {
                this.logger.error(error);
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
        const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
        build.onLoad({ filter: /\.ts$/ }, async (args) => {
            try {
                const uri = vscode.Uri.from({scheme: workspaceUri.scheme, path: args.path});
                console.log(`build.onLoad ${uri}`);
                let text = await vscode.workspace.fs.readFile(uri);
                return {
                    contents: text,
                    loader: 'ts',
                };
            } catch (error) {
                console.log("build.onLoad error"); 
                console.log(error);
            }
        });
        build.onResolve({ filter: /\.ts$/ }, async (args) => {
            return {
                path: args.path,
                namespace: args.namespace,
                pluginName: 'ts-vscode-plugin',
            };
        });
    }
}