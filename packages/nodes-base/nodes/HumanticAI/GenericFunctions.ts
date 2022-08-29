

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function humanticAiApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, resource: string, body: any = {}, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = await this.getCredentials('humanticAiApi');
		let options: IHttpRequestOptions ={
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: `https://api.humantic.ai/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		options.qs!.apikey = credentials.apiKey;

		if (Object.keys(options.body!).length === 0) {
			delete options.body;
		}

		const response = await this.helpers.request!(options);

		if (response.data && response.data.status === 'error') {
			throw new NodeApiError(this.getNode(), response.data);
		}

		return response;

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
