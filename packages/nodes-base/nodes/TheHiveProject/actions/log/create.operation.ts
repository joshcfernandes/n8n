import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { theHiveApiRequest } from '../../transport';

import { fixFieldType, prepareInputItem } from '../../helpers/utils';
import { taskRLC } from '../../descriptions';

const properties: INodeProperties[] = [
	taskRLC,
	{
		displayName: 'Fields',
		name: 'logFields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getLogFields',
				mode: 'add',
				valuesLabel: 'Fields',
			},
		},
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'string',
		placeholder: 'e.g. data, data2',
		default: 'data',
		hint: 'The names of the input fields containing the binary file data to be sent as attachments',
	},
];

const displayOptions = {
	show: {
		resource: ['log'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];
	let body: IDataObject = {};

	const dataMode = this.getNodeParameter('logFields.mappingMode', i) as string;
	const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true }) as string;
	const attachments = this.getNodeParameter('attachments', i, '') as string;

	if (dataMode === 'autoMapInputData') {
		const schema = this.getNodeParameter('logFields.schema', i) as IDataObject[];
		body = prepareInputItem(item.json, schema, i);
	}

	if (dataMode === 'defineBelow') {
		const logFields = this.getNodeParameter('logFields.value', i, []) as IDataObject;
		body = logFields;
	}

	body = fixFieldType(body);

	if (attachments) {
		const inputDataFields = attachments
			.split(',')
			.filter((field) => field)
			.map((field) => field.trim());

		const binaries = [];

		for (const inputDataField of inputDataFields) {
			const binaryData = this.helpers.assertBinaryData(i, inputDataField);
			const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);

			binaries.push({
				value: dataBuffer,
				options: {
					contentType: binaryData.mimeType,
					filename: binaryData.fileName,
				},
			});
		}

		responseData = await theHiveApiRequest.call(
			this,
			'POST',
			`/v1/task/${taskId}/log`,
			undefined,
			undefined,
			undefined,
			{
				Headers: {
					'Content-Type': 'multipart/form-data',
				},
				formData: {
					attachments: binaries,
					_json: JSON.stringify(body),
				},
			},
		);
	} else {
		responseData = await theHiveApiRequest.call(this, 'POST', `/v1/task/${taskId}/log`, body);
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
