import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { apiRequest } from '../transport';

export async function baseSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let qs;
	if (paginationToken) {
		qs = {
			offset: paginationToken,
		};
	}

	const response = await apiRequest.call(this, 'GET', 'meta/bases', undefined, qs);

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const base of response.bases || []) {
			if ((base.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: base.name as string,
					value: base.id as string,
					url: `https://airtable.com/${base.id}`,
				});
			}
		}

		return {
			results,
			paginationToken: response.offset,
		};
	} else {
		return {
			results: (response.bases || []).map((base: IDataObject) => ({
				name: base.name as string,
				value: base.id as string,
				url: `https://airtable.com/${base.id}`,
			})),
			paginationToken: response.offset,
		};
	}
}

export async function tableSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('base', undefined, {
		extractValue: true,
	}) as string;

	let qs;
	if (paginationToken) {
		qs = {
			offset: paginationToken,
		};
	}

	const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`, undefined, qs);

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const table of response.tables || []) {
			if ((table.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: table.name as string,
					value: table.id as string,
					url: `https://airtable.com/${baseId}/${table.id}`,
				});
			}
		}

		return {
			results,
			paginationToken: response.offset,
		};
	} else {
		return {
			results: (response.tables || []).map((table: IDataObject) => ({
				name: table.name as string,
				value: table.id as string,
				url: `https://airtable.com/${baseId}/${table.id}`,
			})),
			paginationToken: response.offset,
		};
	}
}
