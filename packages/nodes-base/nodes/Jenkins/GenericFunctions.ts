

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

export async function jenkinsApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, uri: string, qs: IDataObject = {}, body: any = '', option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('jenkinsApi');
	let options: IHttpRequestOptions ={
		headers: {
			'Accept': 'application/json',
		},
		method,
		auth: {
			username: credentials.username as string,
			password: credentials.apiKey as string,
		},
		uri: `${tolerateTrailingSlash(credentials.baseUrl as string)}${uri}`,
		json: true,
		qs,
		body,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function tolerateTrailingSlash(baseUrl: string) {
	return baseUrl.endsWith('/')
		? baseUrl.substr(0, baseUrl.length - 1)
		: baseUrl;
}
