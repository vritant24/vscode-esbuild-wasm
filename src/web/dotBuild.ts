import * as vscode from 'vscode';
import { fileExists, logger, workspaceUri } from './utilities';
import * as esbuild from 'esbuild-wasm';

export async function parseDotBuildFile(): Promise<Partial<esbuild.BuildOptions> | undefined> {
    const dotbuild = vscode.Uri.joinPath(workspaceUri, '.esbuild.json');
    if (!(await fileExists(dotbuild.path))) {
        return undefined;
    }
    const content = await vscode.workspace.fs.readFile(dotbuild);
    const textDecoder = new TextDecoder();
    const json = JSON.parse(textDecoder.decode(content));
    logger.info(json);
    return parseAsESBuildOpotions(json);
}

function parseAsESBuildOpotions(json: { [key: string]: any}): Partial<esbuild.BuildOptions> {
    const options: Partial<esbuild.BuildOptions> = {};
    if (json.entryPoints) {
        options.entryPoints = json.entryPoints;
    }
    if (json.outdir) {
        options.outdir = json.outdir;
    }
    if (json.outfile) {
        options.outfile = json.outfile;
    }
    if (json.bundle) {
        options.bundle = json.bundle;
    }
    if (json.sourcemap) {
        options.sourcemap = json.sourcemap;
    }
    if (json.target) {
        options.target = json.target;
    }
    if (json.platform) {
        options.platform = json.platform;
    }
    if (json.format) {
        options.format = json.format;
    }
    if (json.external) {
        options.external = json.external;
    }
    if (json.minify) {
        options.minify = json.minify;
    }
    if (json.jsx) {
        options.jsx = json.jsx;
    }
    if (json.treeShaking) {
        options.treeShaking = json.treeShaking;
    }
    if (json.tsconfig) {
        options.tsconfig = json.tsconfig;
    }
    return options;
}
