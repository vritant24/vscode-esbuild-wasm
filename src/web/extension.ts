// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { EsbuildManager } from './esbuild';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	const esb = new EsbuildManager(context);
	vscode.commands.registerCommand('esb.build', async () => {
		const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
		console.log("workspaceuri: " + workspaceUri);
		const indexFile = vscode.Uri.joinPath(workspaceUri, 'index.ts');
	
		const entryPoint = indexFile.path;
		const outdir = vscode.Uri.joinPath(workspaceUri, 'out').path;
		
		try {
			await esb.build(
				entryPoint, 
				outdir, 
			);
		} catch (error) {
			console.log(error);
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
