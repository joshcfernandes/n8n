import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createContext, Context, Script } from 'node:vm';
import glob from 'fast-glob';
import { DocumentationLink, jsonParse, LoggerProxy as Logger } from 'n8n-workflow';
import type {
	CodexData,
	ICredentialType,
	ICredentialTypeData,
	INodeType,
	INodeTypeData,
	INodeTypeNameVersion,
	IVersionedNodeType,
} from 'n8n-workflow';
import { CUSTOM_NODES_CATEGORY } from './Constants';
import type { n8n } from './Interfaces';

function toJSON(this: ICredentialType) {
	return {
		...this,
		authenticate: typeof this.authenticate === 'function' ? {} : this.authenticate,
	};
}

export abstract class DirectoryLoader {
	private context: Context;

	loadedNodes: INodeTypeNameVersion[] = [];

	nodeTypes: INodeTypeData = {};

	credentialTypes: ICredentialTypeData = {};

	constructor(
		protected readonly directory: string,
		private readonly excludeNodes?: string,
		private readonly includeNodes?: string,
	) {
		this.context = createContext({ require });
	}

	abstract loadAll(): Promise<void>;

	protected resolvePath(file: string) {
		return path.resolve(this.directory, file);
	}

	protected loadNodeFromFile(packageName: string, nodeName: string, filePath: string) {
		let tempNode: INodeType | IVersionedNodeType;
		let nodeVersion = 1;

		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			tempNode = this.loadClassInIsolation(filePath, nodeName);
			this.addCodex({ node: tempNode, filePath, isCustom: packageName === 'CUSTOM' });
		} catch (error) {
			Logger.error(
				`Error loading node "${nodeName}" from: "${filePath}" - ${(error as Error).message}`,
			);
			throw error;
		}

		const fullNodeName = `${packageName}.${tempNode.description.name}`;
		tempNode.description.name = fullNodeName;

		if (tempNode.description.icon?.startsWith('file:')) {
			// If a file icon gets used add the full path
			tempNode.description.icon = `file:${path.join(
				path.dirname(filePath),
				tempNode.description.icon.substr(5),
			)}`;
		}

		function isVersioned(nodeType: INodeType | IVersionedNodeType): nodeType is IVersionedNodeType {
			return 'nodeVersions' in nodeType;
		}

		if (isVersioned(tempNode)) {
			const versionedNodeType = tempNode.nodeVersions[tempNode.currentVersion];
			this.addCodex({ node: versionedNodeType, filePath, isCustom: packageName === 'CUSTOM' });
			nodeVersion = tempNode.currentVersion;

			if (versionedNodeType.description.icon?.startsWith('file:')) {
				// If a file icon gets used add the full path
				versionedNodeType.description.icon = `file:${path.join(
					path.dirname(filePath),
					versionedNodeType.description.icon.substring(5),
				)}`;
			}

			if (versionedNodeType.hasOwnProperty('executeSingle')) {
				Logger.warn(
					`"executeSingle" will get deprecated soon. Please update the code of node "${packageName}.${nodeName}" to use "execute" instead!`,
					{ filePath },
				);
			}
		} else {
			// Short renaming to avoid type issues
			const tmpNode = tempNode;
			nodeVersion = Array.isArray(tmpNode.description.version)
				? tmpNode.description.version.slice(-1)[0]
				: tmpNode.description.version;
		}

		if (this.includeNodes !== undefined && !this.includeNodes.includes(fullNodeName)) {
			return;
		}

		if (this.excludeNodes?.includes(fullNodeName)) {
			return;
		}

		this.nodeTypes[fullNodeName] = {
			type: tempNode,
			sourcePath: filePath,
		};

		this.loadedNodes.push({
			name: fullNodeName,
			version: nodeVersion,
		});
	}

	protected loadCredentialFromFile(credentialName: string, filePath: string): void {
		let tempCredential: ICredentialType;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			tempCredential = this.loadClassInIsolation(filePath, credentialName);

			// Add serializer method "toJSON" to the class so that authenticate method (if defined)
			// gets mapped to the authenticate attribute before it is sent to the client.
			// The authenticate property is used by the client to decide whether or not to
			// include the credential type in the predefined credentials (HTTP node)
			Object.assign(tempCredential, { toJSON });

			if (tempCredential.icon?.startsWith('file:')) {
				// If a file icon gets used add the full path
				tempCredential.icon = `file:${path.join(
					path.dirname(filePath),
					tempCredential.icon.substring(5),
				)}`;
			}
		} catch (e) {
			if (e instanceof TypeError) {
				throw new Error(
					`Class with name "${credentialName}" could not be found. Please check if the class is named correctly!`,
				);
			} else {
				throw e;
			}
		}

		this.credentialTypes[tempCredential.name] = {
			type: tempCredential,
			sourcePath: filePath,
		};
	}

	private loadClassInIsolation(filePath: string, className: string) {
		if (process.platform === 'win32') {
			filePath = filePath.replace(/\\/g, '/');
		}
		const script = new Script(`new (require('${filePath}').${className})()`);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return script.runInContext(this.context);
	}

	/**
	 * Retrieves `categories`, `subcategories` and alias (if defined)
	 * from the codex data for the node at the given file path.
	 */
	private getCodex(filePath: string): CodexData {
		type Codex = {
			categories: string[];
			subcategories: { [subcategory: string]: string[] };
			resources: {
				primaryDocumentation: DocumentationLink[];
				credentialDocumentation: DocumentationLink[];
			};
			alias: string[];
		};

		const codexFilePath = `${filePath}on`; // .js to .json

		const {
			categories,
			subcategories,
			resources: allResources,
			alias,
		} = module.require(codexFilePath) as Codex;

		const resources = {
			primaryDocumentation: allResources.primaryDocumentation,
			credentialDocumentation: allResources.credentialDocumentation,
		};

		return {
			...(categories && { categories }),
			...(subcategories && { subcategories }),
			...(resources && { resources }),
			...(alias && { alias }),
		};
	}

	/**
	 * Adds a node codex `categories` and `subcategories` (if defined)
	 * to a node description `codex` property.
	 */
	private addCodex({
		node,
		filePath,
		isCustom,
	}: {
		node: INodeType | IVersionedNodeType;
		filePath: string;
		isCustom: boolean;
	}) {
		try {
			const codex = this.getCodex(filePath);

			if (isCustom) {
				codex.categories = codex.categories
					? codex.categories.concat(CUSTOM_NODES_CATEGORY)
					: [CUSTOM_NODES_CATEGORY];
			}

			node.description.codex = codex;
		} catch (_) {
			Logger.debug(`No codex available for: ${filePath.split('/').pop() ?? ''}`);

			if (isCustom) {
				node.description.codex = {
					categories: [CUSTOM_NODES_CATEGORY],
				};
			}
		}
	}
}

/**
 * Loader for source files of nodes and creds located in a custom dir,
 * e.g. `~/.n8n/custom`
 */
export class CustomDirectoryLoader extends DirectoryLoader {
	override async loadAll() {
		const filePaths = await glob('**/*.@(node|credentials).js', {
			cwd: this.directory,
			absolute: true,
		});

		for (const filePath of filePaths) {
			const [fileName, type] = path.parse(filePath).name.split('.');

			if (type === 'node') {
				this.loadNodeFromFile('CUSTOM', fileName, filePath);
			} else if (type === 'credentials') {
				this.loadCredentialFromFile(fileName, filePath);
			}
		}
	}
}

/**
 * Loader for source files of nodes and creds located in a package dir,
 * e.g. /nodes-base or community packages.
 */
export class PackageDirectoryLoader extends DirectoryLoader {
	packageJson!: n8n.PackageJson;

	override async loadAll() {
		this.packageJson = await this.readJSON<n8n.PackageJson>('package.json');

		const { n8n, name: packageName } = this.packageJson;

		if (!n8n) return;

		const { nodes, credentials } = n8n;

		if (Array.isArray(credentials)) {
			for (const credential of credentials) {
				const filePath = this.resolvePath(credential);
				const [credentialName] = path.parse(credential).name.split('.');

				this.loadCredentialFromFile(credentialName, filePath);
			}
		}

		if (Array.isArray(nodes)) {
			for (const node of nodes) {
				const filePath = this.resolvePath(node);
				const [nodeName] = path.parse(node).name.split('.');

				this.loadNodeFromFile(packageName, nodeName, filePath);
			}
		}
	}

	private async readJSON<T>(file: string): Promise<T> {
		const filePath = this.resolvePath(file);
		const fileString = await readFile(filePath, 'utf8');

		try {
			return jsonParse<T>(fileString);
		} catch (error) {
			throw new Error(`Failed to parse JSON from ${filePath}`);
		}
	}
}
