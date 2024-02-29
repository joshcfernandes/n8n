import type { INodeProperties } from 'n8n-workflow';
import { MICROSOFT_DRIVE_FILE_URL_REGEX, MICROSOFT_DRIVE_FOLDER_URL_REGEX } from './constants';

export const fileRLC: INodeProperties = {
	displayName: 'File',
	name: 'fileId',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder:
				'e.g. https://onedrive.live.com/edit.aspx?resid=170B5C65E30736A3!257&cid=170b5c65e30736a3&CT=1708697995542&OR=ItemsView',
			extractValue: {
				type: 'regex',
				regex: MICROSOFT_DRIVE_FILE_URL_REGEX,
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: MICROSOFT_DRIVE_FILE_URL_REGEX,
						errorMessage: 'Not a valid Microsoft Drive File URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 170B5C65E30736A3!257',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\!%21]{5,}',
						errorMessage: 'Not a valid Microsoft Drive File ID',
					},
				},
			],
			url: '=https://onedrive.live.com/...',
		},
	],
	description: 'The file to operate on',
};

export const folderRLC: INodeProperties = {
	displayName: 'Folder',
	name: 'folderId',
	type: 'resourceLocator',
	default: { mode: 'id', value: '', cachedResultName: '' },
	required: true,
	modes: [
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder:
				'e.g. https://onedrive.live.com/?WT.mc_id=PROD%5FOL%2DWeb%5FInApp%5FLeftNav%5FFreeOfficeBarOD&ocid=PROD%5FOL%2DWeb%5FInApp%5FLeftNav%5FFreeOfficeBarOD&id=170B5C65E30736A3%21136&cid=170B5C65E30736A3',
			extractValue: {
				type: 'regex',
				regex: MICROSOFT_DRIVE_FOLDER_URL_REGEX,
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: MICROSOFT_DRIVE_FOLDER_URL_REGEX,
						errorMessage: 'Not a valid Microsoft Drive Folder URL',
					},
				},
			],
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 170B5C65E30736A3%21136',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[a-zA-Z0-9\\!%21]{5,}',
						errorMessage: 'Not a valid Microsoft Drive Folder ID',
					},
				},
			],
			url: '=https://onedrive.live.com/...',
		},
	],
	description: 'The folder to operate on',
};

export const triggerDescription: INodeProperties[] = [
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		default: 'fileCreated',
		options: [
			{
				name: 'File Created',
				value: 'fileCreated',
				description: 'Triggered when a new file is created',
			},
			{
				name: 'File Updated',
				value: 'fileUpdated',
				description: 'Triggered when an existing file is modified',
			},
			{
				name: 'Folder Created',
				value: 'folderCreated',
				description: 'Triggered when a new folder is created',
			},
			{
				name: 'Folder Updated',
				value: 'folderUpdated',
				description: 'Triggered when an existing folder is modified',
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		description: 'Whether to return a simplified version of the response instead of the raw data',
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Watch Folder',
		name: 'watchFolder',
		description:
			'Whether to watch for the created file in a given folder, rather than the entire OneDrive',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				event: ['fileCreated'],
			},
		},
	},
	{
		displayName: 'Watch',
		name: 'watch',
		description: 'How to select which file to watch',
		type: 'options',
		default: 'anyFile',
		displayOptions: {
			show: {
				event: ['fileUpdated'],
			},
		},
		options: [
			{
				name: 'Any File',
				value: 'anyFile',
				description: 'Watch for updated files in the entire OneDrive',
			},
			{
				name: 'Inside a Folder',
				value: 'selectedFolder',
				description: 'Watch for updated files inside a selected folder',
			},
			{
				name: 'A Selected File',
				value: 'selectedFile',
				description: 'Watch a specific file for updates',
			},
		],
	},
	{
		displayName: 'Watch Folder',
		name: 'watchFolder',
		description:
			'Whether to watch for the created folder in a given folder, rather than the entire OneDrive',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				event: ['folderCreated'],
			},
		},
	},
	{
		displayName: 'Watch Folder',
		name: 'watchFolder',
		description:
			'Whether to watch for the updated folder in a given folder, rather than the entire OneDrive',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				event: ['folderUpdated'],
			},
		},
	},
	{
		...fileRLC,
		displayOptions: {
			show: {
				event: ['fileUpdated'],
				watch: ['selectedFile'],
			},
		},
	},
	{
		...folderRLC,
		displayOptions: {
			show: {
				watch: ['selectedFolder'],
			},
		},
	},
	{
		...folderRLC,
		displayOptions: {
			show: {
				watchFolder: [true],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				watch: ['selectedFolder'],
			},
		},
		options: [
			{
				displayName: 'Watch Nested Folders',
				name: 'folderChild',
				type: 'boolean',
				default: false,
				description:
					'Whether to look for modified files/folders in all nested folders, rather than only direct descendants',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				watchFolder: [true],
			},
		},
		options: [
			{
				displayName: 'Watch Nested Folders',
				name: 'folderChild',
				type: 'boolean',
				default: false,
				description:
					'Whether to look for modified files/folders in all nested folders, rather than only direct descendants',
			},
		],
	},
];
