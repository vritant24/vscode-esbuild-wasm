// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EsbuildManager } from './esbuild';
import { dotBuildFileName, fileExists, fileUriExists, workspaceUri } from './utilities';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const esb = new EsbuildManager(context);
	vscode.commands.registerCommand('esb.build', async (arg: unknown) => {
		let dotBuildUri = arg instanceof vscode.Uri ? arg : vscode.window.activeTextEditor?.document.uri;
		if (!dotBuildUri) {
			dotBuildUri = vscode.Uri.joinPath(workspaceUri, dotBuildFileName);
		}
		if (!(await fileUriExists(dotBuildUri))) {
			vscode.window.showErrorMessage(`No .esbuild.json file found at ${dotBuildUri.path}`);
			return;
		}
		try {
			await esb.build(dotBuildUri);
		} catch (error) {
			console.log(error);
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
