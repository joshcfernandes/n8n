import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SetV1 } from './v1/SetV1.node';
import { SetV2 } from './v2/SetV2.node';

export class SetVariable extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Set Variable',
			name: 'setVariable',
			icon: 'fa:pen',
			group: ['input'],
			description: 'Update Variables',
			defaultVersion: 3.3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SetV1(baseDescription),
			2: new SetV1(baseDescription),
			3: new SetV2(baseDescription),
			3.1: new SetV2(baseDescription),
			3.2: new SetV2(baseDescription),
			3.3: new SetV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
