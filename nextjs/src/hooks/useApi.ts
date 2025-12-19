import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import { refreshAccessToken } from "../app/helper/auth/refreshToken";
import { resolveUrl } from "../app/helper/url/resolveUrl";
import { useAuth } from "../context/AuthContext";

// Extend this if required, TSLint does not like any
export type BodyType = object | string | number;

export function useApi() {
    const { auth, login, logout, setRefreshing } = useAuth();

    const withToken = (
        init?: AxiosRequestConfig,
        token?: string
    ): AxiosRequestConfig => {
        const headers: Record<string, string> = {};

        if (auth.loggedIn) {
            headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return {
            ...(init || {}),
            headers: {
                ...(init?.headers),
                ...headers,
            },
        };
    };

    const refresh = async (): Promise<string> => {
        while (auth.refreshing) {
            // wait
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if (auth.loggedIn) {
            return auth.accessToken;
        }
        setRefreshing();
        const token = await refreshAccessToken();
        if (token) {
            login(token);
            return token;
        }
        logout();
        throw new Error("Could not refresh, please log in again.");
    };

    /**
     * requestWithRetry rewritten for axios
     */
    async function requestWithRetry(
        resolvedUrl: string,
        method: string,
        init: AxiosRequestConfig | undefined,
        body?: BodyType
    ): Promise<AxiosResponse> {
        const token = auth.loggedIn && auth.accessToken || await refresh();
        if (!token) {
            throw new Error("Refreshing failed or another refresh request is outstanding.")
        }

        const firstConfig: AxiosRequestConfig = {
            ...withToken(init, token),
            method,
            url: resolvedUrl,
            data: body,
        };

        try {
            return await axios(firstConfig);
        } catch (err: unknown) {
            if (!(axios.isAxiosError(err))) {
                throw err;
            }
            if (err.response?.status !== 401) {
                throw err;
            }

            // Try refresh
            const newToken = await refresh();
            if (!newToken) throw new Error("Unauthorized: refresh failed");

            const retryConfig: AxiosRequestConfig = {
                ...withToken(init, newToken),
                method,
                url: resolvedUrl,
                data: body,
            };

            try {
                return await axios(retryConfig);
            } catch (err2: unknown) {
                if (!(err2 instanceof AxiosError)) {
                    throw err2;
                }
                if ("respone" in err2 && err2?.response?.status !== 401) {
                    throw new Error('unauthorized')
                }
                throw err2;
            }
        }
    }

    const getWithToken = async (url: string, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry(resolved, "GET", init);
    };

    const deleteWithToken = async (url: string, body?: BodyType, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry(resolved, "DELETE", init, body);
    };

    const postWithToken = async (
        url: string,
        body?: BodyType,
        init?: AxiosRequestConfig,
        contentType: string | null = "application/json"
    ) => {
        const resolved = resolveUrl(url);
        const contentTypeHeader =
            contentType === null ? {} : { "Content-Type": contentType };

        const headers: AxiosHeaders = {
            ...contentTypeHeader,
            ...(init?.headers),
        } as AxiosHeaders;

        const stringify =
            body && typeof body === "object" && contentType === "application/json";
        const payload = stringify ? JSON.stringify(body) : body;

        const initWithJson: AxiosRequestConfig = { ...init, headers };

        return requestWithRetry(resolved, "POST", initWithJson, payload);
    };

    const putWithToken = async (
        url: string,
        body?: BodyType,
        init?: AxiosRequestConfig
    ) => {
        const resolved = resolveUrl(url);

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        const initWithJson: AxiosRequestConfig = {
            ...init,
            headers: { ...(init?.headers), ...headers },
        };

        const payload =
            body && typeof body === "object" ? JSON.stringify(body) : body;

        return requestWithRetry(resolved, "PUT", initWithJson, payload);
    };

    return { getWithToken, postWithToken, putWithToken, refresh, deleteWithToken };
}

export default useApi;
