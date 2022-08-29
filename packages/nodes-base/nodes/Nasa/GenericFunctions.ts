

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError,
} from 'n8n-workflow';

export async function nasaApiRequest(this: IHookFunctions | IExecuteFunctions, method: IHttpRequestMethods, endpoint: string, qs: IDataObject, option: IDataObject = {}, uri?: string | undefined): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('nasaApi');

	qs.api_key = credentials['api_key'] as string;

	const options: IHttpRequestOptions = {
		method,
		qs,
		uri: uri || `https://api.nasa.gov${endpoint}`,
		json: true,
	};

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request(options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function nasaApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, propertyName: string, method: IHttpRequestMethods, resource: string, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.size = 20;

	let uri: string | undefined = undefined;

	do {
		responseData = await nasaApiRequest.call(this, method, resource, query, {}, uri);
		uri = responseData.links.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.links.next !== undefined
	);

	return returnData;
}


