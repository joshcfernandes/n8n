import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';



/**
 * Make an API request to Sms77
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {string} method
 * @param {Endpoint} endpoint
 * @param {object | undefined} data
 * @returns {Promise<any>}
 */
export async function sms77ApiRequest(this: IHookFunctions | IExecuteFunctions, method: IHttpRequestMethods, endpoint: string, body: IDataObject, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: IHttpRequestOptions = {
		headers: {
			SentWith: 'n8n',
		},
		qs,
		uri: `https://gateway.sms77.io/api${endpoint}`,
		json: true,
		method,
	};

	if (Object.keys(body).length) {
		options.form = body;
		body.json = 1;
	}

	const response = await this.helpers.requestWithAuthentication.call(this, 'sms77Api', options);

	if (response.success !== '100') {
		throw new NodeApiError(this.getNode(), response, { message: 'Invalid sms77 credentials or API error!' });
	}

	return response;
}
