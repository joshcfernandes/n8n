import {OptionsWithUri} from "request";
import {IExecuteFunctions} from 'n8n-core';
import {IDataObject, LoggerProxy as Logger} from "n8n-workflow";

const crypto = require('crypto');

export function getCurrentTimeStamp(): string {
	const dateTime = Date.now();
	return dateTime.toString();
}

export function connectWithComma(left: string, right: string): string {
	return `${left},${right},`;
}

export function get16TimesLength(input: number): number {
	const padLength = 16;
	const remainder = input % padLength;
	return remainder ? input - remainder + padLength : input;
}

export function padWithSpaceIn16Times(data: string): string {
	const paddingLength = get16TimesLength(data.length);
	return data.padEnd(paddingLength, ' ');
}

export function encryptAES(message: string, aesKey: string): string {
	const iv = '0000000000000000';
	const cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
	cipher.write(message);
	cipher.end();

	const encrypted = cipher.read();
	return encrypted.toString('base64');
}

export function generateTokenWithAESKey(timestamp: string, email: string, aesKey: string): string {
	const data = connectWithComma(timestamp, email);
	const messageToEncrypt = padWithSpaceIn16Times(data);
	const encrypted = encryptAES(messageToEncrypt, aesKey);
	return encodeURIComponent(encrypted);
}

export class UrlParams {
	constructor(
		public gql = '',
		public fields = 'id',
		public token = '',
		public paginateBy = 25,
		public orderBy = '-id',
		public page = 1,
	) {
	}
}

export function gllueUrlBuilder(host: string, resource: string, option = 'simple_list_with_ids', urlParams: UrlParams): string {
	const baseUrl = `${host}\\rest\\${resource}\\${option}`;
	const params = [];
	if (!urlParams) {
		return baseUrl;
	}

	let gql: string;
	if (urlParams.gql !== '') {
		const groups = urlParams.gql.split('&').map((group) => {
			const [name, value] = group.split('=');
			const encodedValue = encodeURIComponent(value);
			return `${name}=${encodedValue}`;
		});
		gql = encodeURIComponent(groups.join('&'));
	} else {
		gql = urlParams.gql;
	}
	params.push(`gql=${gql}`);

	params.push(`fields=${urlParams.fields}`);
	params.push(`paginate_by=${urlParams.paginateBy}`);
	params.push(`ordering=${urlParams.orderBy}`);
	params.push(`page=${urlParams.page}`);

	if (urlParams.token !== '') {
		params.push(`private_token=${urlParams.token}`);
	} else {
		throw new Error('Private Token is required');
	}

	return `${baseUrl}?${params.join('&')}`;
}

function buildOptionWithUri(uriGenerated: string): OptionsWithUri {
	return {
		headers: {
			'Accept': 'application/json',
		},
		method: 'GET',
		uri: uriGenerated,
		json: true,
	};
}

// tslint:disable-next-line:no-any
export async function getResponseByUri(uriGenerated: string, requestMethod: any) {
	const options = buildOptionWithUri(uriGenerated);
	console.log(`request with ${options.uri}`);
	return await requestMethod(options);
}

export async function gllueApiRequest(
	this: IExecuteFunctions,
	method: string,
	api_path: string,
	query_string: IDataObject = {},
	body: IDataObject = {},
	credentials: IDataObject = {},
	) {
		credentials = Object.keys(credentials) ? credentials: await this.getCredentials('gllueApi') as IDataObject
		const options : OptionsWithUri = generateGllueApiUriOptions(credentials, method, api_path, query_string, body);
		return await this.helpers.request(options);
}

export function generateGllueApiUriOptions(
	credentials: IDataObject,
	method: string,
	apiPath: string,
	queryString: IDataObject = {},
	body: IDataObject = {},
){
	const timestamp = getCurrentTimeStamp();
	const token = generateTokenWithAESKey( timestamp, credentials.apiUsername as string, credentials.apiAesKey as string);
	const qs = Object.assign(queryString, {private_token: token});

	let uri = `${credentials.apiHost}${apiPath}?${querystring.stringify(qs)}`;
	const options : OptionsWithUri = {
		headers: {'Accept': 'application/json'},
		method: method,
		body: body,
		uri: uri,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	return options;
}

function getGllueApiUri(apiHost: string, apiPath: string, queryString: IDataObject = {}){
	let uri = `${apiHost}${apiPath}`;
	if (Object.keys(queryString).length){
		uri = `${uri}?${querystring.stringify(queryString)}`;
	}
	return uri;
}

