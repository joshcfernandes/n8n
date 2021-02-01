import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated or unauthenticated API request to Reddit.
 */
export async function redditApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	const resource = this.getNodeParameter('resource', 0) as string;

	const authRequired = ['profile', 'post', 'postComment'].includes(resource);

	qs.api_type = 'json';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: authRequired ? `https://oauth.reddit.com/${endpoint}` : `https://www.reddit.com/${endpoint}`,
		qs,
		json: true,
	};

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (authRequired) {
		let response;

		try {
			response = await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options);
		} catch (error) {
			if (error.response.body && error.response.body.message) {
				const message = error.response.body.message;
				throw new Error(`Reddit error response [${error.statusCode}]: ${message}`);
			}
		}

		if ((response.errors && response.errors.length !== 0) || (response.json && response.json.errors && response.json.errors.length !== 0)) {
			const errors = response?.errors || response?.json?.errors;
			const errorMessage = errors.map((error: []) => error.join('-'));

			throw new Error(`Reddit error response [400]: ${errorMessage.join('|')}`);
		}

		return response;

	} else {
		return await this.helpers.request.call(this, options);
	}
}

/**
 * Make an unauthenticated API request to Reddit and return all results.
 */
export async function redditApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	let responseData;
	const returnData: IDataObject[] = [];

	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	do {
		responseData = await redditApiRequest.call(this, method, endpoint, qs);
		if (!Array.isArray(responseData)) {
			qs.after = responseData.data.after;
		}

		if (endpoint === 'api/search_subreddits.json') {
			responseData.subreddits.forEach((child: any) => returnData.push(child)); // tslint:disable-line:no-any
		} else if (resource === 'postComment' && operation === 'getAll') {
			responseData[1].data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any
		} else {
			responseData.data.children.forEach((child: any) => returnData.push(child.data)); // tslint:disable-line:no-any
		}

		if (qs.limit && responseData.data.children.length >= qs.limit) {
			return returnData;
		}

	} while (responseData.data && responseData.data.after);

	return returnData;
}

/**
 * Handles a large Reddit listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	qs: IDataObject = {},
	requestMethod: 'GET' | 'POST' = 'GET',
): Promise<any> { // tslint:disable-line:no-any

	let responseData;

	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
	} else {
		const limit = this.getNodeParameter('limit', i);
		qs.limit = limit;
		responseData = await redditApiRequestAllItems.call(this, requestMethod, endpoint, qs);
		responseData = responseData.slice(0, limit);
	}

	return responseData;
}
