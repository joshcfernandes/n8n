import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IWebhookFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function driftApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	let options: IHttpRequestOptions = {
		headers: {},
		method,
		body,
		qs: query,
		uri: uri || `https://driftapi.com${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('driftApi');

			options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'driftOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
