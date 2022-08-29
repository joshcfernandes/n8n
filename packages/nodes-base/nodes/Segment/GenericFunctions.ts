import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError, } from 'n8n-workflow';

export async function segmentApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: IHttpRequestMethods, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('segmentApi');
	const base64Key =  Buffer.from(`${credentials.writekey}:`).toString('base64');
	const options: IHttpRequestOptions = {
		headers: {
			Authorization: `Basic ${base64Key}`,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri ||`https://api.segment.io/v1${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
