import * as vscode from 'vscode';

export const logger = vscode.window.createOutputChannel('esbuild', {log: true});
export const workspaceUri = vscode.workspace.workspaceFolders![0].uri;

export async function fileExists(path: string) {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.from({scheme: workspaceUri.scheme, path}));
        return true;
    } catch (error) {
        return false;
    }
} 

