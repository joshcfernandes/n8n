import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function lingvaNexApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('lingvaNexApi');
		let options: OptionsWithUri = {
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			method,
			qs,
			body,
			uri: uri || `https://api-b2b.backenster.com/b1/api/v3${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		const response = await this.helpers.request(options);

		if (response.err !== null) {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
