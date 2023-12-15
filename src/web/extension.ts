// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EsbuildManager } from './esbuild';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const esb = new EsbuildManager(context);
	vscode.commands.registerCommand('esb.build', async () => {
		try {
			await esb.build();
		} catch (error) {
			console.log(error);
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
