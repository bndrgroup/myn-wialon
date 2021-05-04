import axios from "axios";
import FormData from "form-data";

import { WialonError, RemoteAPIError } from "./WialonError";
import type { SVC } from "./types";
import type { TokenLoginResponse } from "./token";
import type { CoreDuplicateParams, CoreDuplicateResponse } from "./core";

export const defaultHost = "https://hst-api.wialon.com/wialon/ajax.html";

interface ExecuteMethod {
	<Response = any>(
		svc: string,
		params?: null,
		sid?: string | null,
		url?: string
	): Promise<Response>;
	<T extends SVC, Response = any>(
		svc: T,
		params?: null,
		sid?: string | null,
		url?: string
	): Promise<Response>;
	<Params = any, Response = any>(
		svc: string,
		params: Params,
		sid?: string | null,
		url?: string
	): Promise<Response>;
	<T extends SVC, Params = any, Response = any>(
		svc: T,
		params?: Params,
		sid?: string | null,
		url?: string
	): Promise<Response>;
}

export interface RemoteAPIOptions {
	auth?: TokenLoginResponse;
	host: string;
}

export abstract class RemoteAPI {
	public static buildUrl = <T extends SVC, Params>(
		url: string,
		svc: T | string,
		params?: Params,
		sid?: string
	) => {
		let composedUrl = url;
		if (svc || params || sid) {
			composedUrl += "?";
			if (svc) {
				composedUrl += `svc=${svc}`;
			}
			if (params) {
				composedUrl += `&params=${JSON.stringify(params)}`;
			}
			if (sid) {
				composedUrl += `&sid=${sid}`;
			}
		}
		return composedUrl;
	};

	public static execute: ExecuteMethod = async <
		T extends SVC,
		Params,
		Response
	>(
		svc: T | string,
		params?: Params | null,
		sid?: string | null,
		url: string = defaultHost
	): Promise<Response> => {
		const formData = new FormData();
		if (params) {
			formData.append("params", JSON.stringify(params));
		}
		if (sid) {
			formData.append("sid", sid);
		}

		const res = await axios.post<Response | RemoteAPIError>(
			RemoteAPI.buildUrl(url, svc),
			formData,
			{
				headers: { ...formData.getHeaders() },
				timeout: 0
			}
		);

		if ("error" in res.data && res.data.error) {
			throw new WialonError(res.data);
		}
		return res.data as Response;
	};

	public options: RemoteAPIOptions;

	protected constructor(
		private session: string,
		options?: Partial<RemoteAPIOptions>
	) {
		this.options = { ...options, host: options?.host || defaultHost };
	}

	public get sessionId(): string {
		return this.session;
	}

	public getAuthDetails = async () => {
		if (this.options.auth) {
			return this.options.auth;
		}
		const response = await RemoteAPI.execute<
			CoreDuplicateParams,
			CoreDuplicateResponse
		>(
			"core/duplicate",
			{ operateAs: "", continueCurrentSession: true },
			this.sessionId
		);
		this.options.auth = response;
		return response;
	};
}
