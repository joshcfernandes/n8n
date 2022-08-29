

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function mediumApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: IHttpRequestMethods, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: IHttpRequestOptions = {
		method,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'Accept-Charset': 'utf-8',
		},
		qs: query,
		uri: uri || `https://api.medium.com/v1${endpoint}`,
		body,
		json: true,
	};

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('mediumApi');

			options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		}
		else {
			return await this.helpers.requestOAuth2!.call(this, 'mediumOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
