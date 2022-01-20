import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

//https://www.contentful.com/developers/docs/references/authentication/
export class ContentfulApi implements ICredentialType {
	name = 'contentfulApi';
	displayName = 'Contenful API';
	documentationUrl = 'contentful';
	properties: INodeProperties[] = [
		{
			displayName: 'Space ID',
			name: 'spaceId',
			type: 'string',
			default: '',
			required: true,
			description: 'The id for the Contentful space.',
			hint: 'Temporary credential test <b> bold me me </b> yo <a href="https://n8n.io">click me</a> very long message sjsjd dkjsfjdsk ljdsk dsj lsjd lkfdjs s',
		},
		{
			displayName: 'Content Delivery API Access token',
			name: 'ContentDeliveryaccessToken',
			type: 'string',
			default: '',
			description: 'Access token that has access to the space. Can be left empty if only Delivery API should be used.',
		},
		{
			displayName: 'Content Preview API Access token',
			name: 'ContentPreviewaccessToken',
			type: 'string',
			default: '',
			description: 'Access token that has access to the space. Can be left empty if only Preview API should be used.',
		},
	];
}
