import { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { INodeExecutionData, INodeProperties } from 'n8n-workflow';

// Projection field controls the page limit maximum
// When not returning all, return the max number for the current projection parameter
const PAGE_LIMITS = {
	noAcl: 1000,
	full: 200,
};

// Define a JSON parse function here to use it in two places
async function parseJSONBody(this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	if (!requestOptions.body) requestOptions.body = {};
	const body = this.getNodeParameter('createBody') as IDataObject;

	// Parse all the JSON fields
	if (body.acl) {
		try {
			body.acl = JSON.parse(body.acl as string);
		} catch (error) {}
	}
	if (body.billing) {
		try {
			body.billing = JSON.parse(body.billing as string);
		} catch (error) {}
	}
	if (body.cors) {
		try {
			body.cors = JSON.parse(body.cors as string);
		} catch (error) {}
	}
	if (body.customPlacementConfig) {
		try {
			body.customPlacementConfig = JSON.parse(body.customPlacementConfig as string);
		} catch (error) {}
	}
	if (body.dataLocations) {
		try {
			body.dataLocations = JSON.parse(body.dataLocations as string);
		} catch (error) {}
	}
	if (body.defaultObjectAcl) {
		try {
			body.defaultObjectAcl = JSON.parse(body.defaultObjectAcl as string);
		} catch (error) {}
	}
	if (body.encryption) {
		try {
			body.encryption = JSON.parse(body.encryption as string);
		} catch (error) {}
	}
	if (body.iamConfiguration) {
		try {
			body.iamConfiguration = JSON.parse(body.iamConfiguration as string);
		} catch (error) {}
	}
	if (body.labels) {
		try {
			body.labels = JSON.parse(body.labels as string);
		} catch (error) {}
	}
	if (body.lifecycle) {
		try {
			body.lifecycle = JSON.parse(body.lifecycle as string);
		} catch (error) {}
	}
	if (body.logging) {
		try {
			body.logging = JSON.parse(body.logging as string);
		} catch (error) {}
	}
	if (body.retentionPolicy) {
		try {
			body.retentionPolicy = JSON.parse(body.retentionPolicy as string);
		} catch (error) {}
	}
	if (body.versioning) {
		try {
			body.versioning = JSON.parse(body.versioning as string);
		} catch (error) {}
	}
	if (body.website) {
		try {
			body.website = JSON.parse(body.website as string);
		} catch (error) {}
	}

	requestOptions.body = Object.assign(requestOptions.body, body);
	return requestOptions;
}

export const bucketOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Bucket',
				routing: {
					request: {
						method: 'POST',
						url: '/b/',
						qs: {
							project: '={{$parameter["projectId"]}}',
							projection: '={{$parameter["projection"]}}',
						},
						body: {
							name: '={{$parameter["bucketName"]}}',
						},
						returnFullResponse: true,
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const additionalQs = this.getNodeParameter('createAcl') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, additionalQs);
								return requestOptions;
							},
						],
					},
				},
				action: 'Create a new Bucket',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an empty Bucket',
				routing: {
					request: {
						method: 'DELETE',
						url: '={{"/b/" + $parameter["bucketName"]}}',
						returnFullResponse: true,
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const options = this.getNodeParameter('getFilters') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, options);
								return requestOptions;
							},
						],
					},
				},
				action: 'Delete an empty Bucket',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get metadata for a specific Bucket',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/b/" + $parameter["bucketName"]}}',
						returnFullResponse: true,
						qs: {
							projection: '={{$parameter["projection"]}}',
						},
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const options = this.getNodeParameter('getFilters') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, options);
								return requestOptions;
							},
						],
					},
				},
				action: 'Get a Bucket',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get list of Buckets for a given project',
				routing: {
					request: {
						method: 'GET',
						url: '/b/',
						qs: {
							project: '={{$parameter["projectId"]}}',
							prefix: '={{$parameter["prefix"]}}',
							projection: '={{$parameter["projection"]}}',
						},
					},
					send: {
						paginate: true,
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const returnAll = this.getNodeParameter('returnAll') as boolean;

								if (!returnAll) {
									const key = this.getNodeParameter('projection') as string;
									requestOptions.qs.maxResults =
										key === 'noAcl' ? PAGE_LIMITS.noAcl : PAGE_LIMITS.full;
								}
								return requestOptions;
							},
						],
					},
					operations: {
						async pagination(this, requestOptions) {
							if (!requestOptions.options.qs) requestOptions.options.qs = {};
							let executions: INodeExecutionData[] = [];
							let responseData: INodeExecutionData[];
							let nextPageToken: string | undefined = undefined;
							const returnAll = this.getNodeParameter('returnAll') as boolean;

							do {
								requestOptions.options.qs.pageToken = nextPageToken;
								responseData = await this.makeRoutingRequest(requestOptions);

								// Check for another page
								const lastItem = responseData[responseData.length - 1].json;
								nextPageToken = lastItem.nextPageToken as string | undefined;

								// Extract just the list of buckets from the page data
								responseData.forEach((page) => {
									const buckets = page.json.items as IDataObject[];
									if (buckets) {
										executions = executions.concat(buckets.map((bucket) => ({ json: bucket })));
									}
								});
								// If we don't return all, just return the first page
							} while (returnAll && nextPageToken);

							// Return all execution responses as an array
							return executions;
						},
					},
				},
				action: 'Get all Buckets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update the metadata of a bucket',
				routing: {
					request: {
						method: 'PUT',
						url: '={{"/b/" + $parameter["bucketName"]}}',
						qs: {
							project: '={{$parameter["projectId"]}}',
							projection: '={{$parameter["projection"]}}',
						},
						body: {},
						returnFullResponse: true,
					},
					send: {
						preSend: [
							async function (this, requestOptions) {
								if (!requestOptions.qs) requestOptions.qs = {};
								const additionalQs = this.getNodeParameter('createAcl') as IDataObject;
								const filters = this.getNodeParameter('getFilters') as IDataObject;

								// Merge in the options into the queryset
								requestOptions.qs = Object.assign(requestOptions.qs, additionalQs, filters);
								return requestOptions;
							},
						],
					},
				},
				action: 'Create a new Bucket',
			},
		],
		default: 'getAll',
	},
];

export const bucketFields: INodeProperties[] = [
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		placeholder: 'Project ID',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'getAll'],
			},
		},
		default: '',
	},
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		placeholder: 'Bucket Name',
		required: true,
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'get', 'update', 'delete'],
			},
		},
		default: '',
	},
	{
		displayName: 'Prefix',
		name: 'prefix',
		type: 'string',
		placeholder: 'Filter for Bucket Names',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getAll'],
			},
		},
		default: '',
	},
	{
		displayName: 'Projection',
		name: 'projection',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'All Properties',
				value: 'full',
			},
			{
				name: 'No ACL',
				value: 'noAcl',
			},
		],
		default: 'noAcl',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'get', 'getAll', 'update'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Filters',
		name: 'getFilters',
		type: 'collection',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['delete', 'get', 'update'],
			},
		},
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'Metageneration Match',
				name: 'ifMetagenerationMatch',
				type: 'number',
				description:
					'Only return data if the metageneration value of the Bucket matches the sent value',
				default: 0,
			},
			{
				displayName: 'Metageneration Exclude',
				name: 'ifMetagenerationNotMatch',
				type: 'number',
				description:
					'Only return data if the metageneration value of the Bucket does not match the sent value',
				default: 0,
			},
		],
	},
	{
		displayName: 'Predefined Access Control',
		name: 'createAcl',
		type: 'collection',
		noDataExpression: true,
		default: {},
		placeholder: 'Add Access Control Parameters',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Predefined ACL',
				name: 'predefinedAcl',
				type: 'options',
				default: 'authenticatedRead',
				placeholder: 'Apply a predefined set of access controls to this bucket',
				options: [
					{
						name: 'Authenticated Read',
						value: 'authenticatedRead',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Project Private',
						value: 'projectPrivate',
					},
					{
						name: 'Public Read',
						value: 'publicRead',
					},
					{
						name: 'Public Read/Write',
						value: 'publicReadWrite',
					},
				],
			},
			{
				displayName: 'Predefined Default Object ACL',
				name: 'predefinedDefaultObjectAcl',
				type: 'options',
				default: 'authenticatedRead',
				placeholder: 'Apply a predefined set of default object access controls to this bucket',
				options: [
					{
						name: 'Authenticated Read',
						value: 'authenticatedRead',
					},
					{
						name: 'Bucket Owner Full Control',
						value: 'bucketOwnerFullControl',
					},
					{
						name: 'Bucket Owner Read',
						value: 'bucketOwnerRead',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Project Private',
						value: 'projectPrivate',
					},
					{
						name: 'Public Read',
						value: 'publicRead',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Parameters',
		name: 'createBody',
		type: 'collection',
		noDataExpression: true,
		default: {},
		placeholder: 'Add Metadata Parameter',
		displayOptions: {
			show: {
				resource: ['bucket'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Access Control',
				name: 'acl',
				type: 'json',
				default: '[]',
				placeholder: 'Access controls on the Bucket',
			},
			{
				displayName: 'Billing',
				name: 'billing',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's billing configuration",
			},
			{
				displayName: 'CORS',
				name: 'cors',
				type: 'json',
				default: '[]',
				placeholder: "The bucket's Cross Origin Resource Sharing configuration",
			},
			{
				displayName: 'Custom Placement Config',
				name: 'customPlacementConfig',
				type: 'json',
				default: '{}',
				placeholder: 'The configuration for the region(s) for the Bucket',
			},
			{
				displayName: 'Data Locations',
				name: 'dataLocations',
				type: 'json',
				default: '[]',
				placeholder: 'The list of individual regions that comprise a dual-region Bucket',
			},
			{
				displayName: 'Default Event Based Hold',
				name: 'defaultEventBasedHold',
				type: 'boolean',
				default: true,
				placeholder: 'Whether or not to automatically apply an event based hold to new objects',
			},
			{
				displayName: 'Default Object ACL',
				name: 'defaultObjectAcl',
				type: 'json',
				default: '[]',
				placeholder: 'Default Access Controls for new objects when no ACL is provided',
			},
			{
				displayName: 'Encryption',
				name: 'encryption',
				type: 'json',
				default: '{}',
				placeholder: 'Encryption configuration for a bucket',
			},
			{
				displayName: 'IAM Configuration',
				name: 'iamConfiguration',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's IAM configuration",
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'json',
				default: '{}',
				placeholder: 'User provided bucket labels, in key/value pairs',
			},
			{
				displayName: 'Lifecycle',
				name: 'lifecycle',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's lifecycle configuration",
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: 'US',
				placeholder: 'The location of the bucket',
			},
			{
				displayName: 'Logging',
				name: 'logging',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's logging configuration",
			},
			{
				displayName: 'Retention Policy',
				name: 'retentionPolicy',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's retention policy",
			},
			{
				displayName: 'Recovery Point Objective',
				name: 'rpo',
				type: 'string',
				default: 'DEFAULT',
				placeholder: 'The recovery point objective for the bucket',
			},
			{
				displayName: 'Storage Class',
				name: 'storageClass',
				type: 'string',
				default: 'STANDARD',
				placeholder: "The bucket's default storage class for objects that don't define one",
			},
			{
				displayName: 'Versioning',
				name: 'versioning',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's versioning configuration",
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'json',
				default: '{}',
				placeholder: "The bucket's website configuration for when it is used to host a website",
			},
		],
	},
];
