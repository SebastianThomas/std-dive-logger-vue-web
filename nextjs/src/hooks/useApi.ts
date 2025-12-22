import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import { useCallback, useMemo } from "react";
import { refreshAccessToken } from "../components/globals/auth/refreshToken";
import { resolveUrl } from "../components/globals/url/resolveUrl";
import { useAuth } from "../context/AuthContext";

// Extend this if required, TSLint does not like any
export type BodyType = object | string | number;

export function useApi() {
    const { auth, login, logout, setRefreshing } = useAuth();

    const withToken = useCallback((
        init?: AxiosRequestConfig,
        token?: string
    ): AxiosRequestConfig => {
        const headers: Record<string, string> = {};
        const baseInit = init ?? {};

        if (auth.loggedIn) {
            headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return {
            ...baseInit,
            headers: {
                ...(baseInit.headers),
                ...headers,
            },
        };
    }, [auth]);

    const refresh = useCallback(async (): Promise<string> => {
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
        throw new Error("Could not refresh, please log in again.")
    }, [auth, login, logout, setRefreshing]);

    /**
     * requestWithRetry rewritten for axios
     */
    const requestWithRetry = useCallback(async function <T = unknown, D = unknown, H = object>(
        resolvedUrl: string,
        method: string,
        init: AxiosRequestConfig | undefined,
        body?: BodyType
    ): Promise<AxiosResponse<T, D, H>> {
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
            if (!(axios.isAxiosError(err)) || err.response?.status !== 401) {
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
            } catch (err: unknown) {
                if (!(err instanceof AxiosError)) {
                    throw err;
                }
                if (err.response?.status === 401) {
                    throw new Error('Unauthorized')
                }
                throw err;
            }
        }
    }, [auth, refresh, withToken]);

    const getWithToken = useCallback(async <T = unknown, H = unknown>(url: string, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry<T, undefined, H>(resolved, "GET", init);
    }, [requestWithRetry]);

    const deleteWithToken = useCallback(async <T = unknown, D = object, H = unknown>(url: string, body?: BodyType, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry<T, D, H>(resolved, "DELETE", init, body);
    }, [requestWithRetry]);

    const postWithToken = useCallback(async <T = unknown, D = object, H = unknown>(
        url: string,
        body?: BodyType,
        init?: AxiosRequestConfig,
        contentType: string | null = "application/json"
    ) => {
        const resolved = resolveUrl(url);
        const contentTypeHeader =
            contentType === null ? {} : { "Content-Type": contentType };

        const headers = {
            ...contentTypeHeader,
            ...(init?.headers),
        } as AxiosHeaders;

        const stringify =
            body && typeof body === "object" && contentType === "application/json";
        const payload = stringify ? JSON.stringify(body) : body;

        const initWithJson: AxiosRequestConfig = { ...init, headers };

        return requestWithRetry<T, H, D>(resolved, "POST", initWithJson, payload);
    }, [requestWithRetry]);

    const putWithToken = useCallback(async <T = unknown, D = object, H = unknown>(
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

        return requestWithRetry<T, H, D>(resolved, "PUT", initWithJson, payload);
    }, [requestWithRetry]);

    return useMemo(() => ({ getWithToken, postWithToken, putWithToken, refresh, deleteWithToken }), [deleteWithToken, getWithToken, postWithToken, putWithToken, refresh]);
}

export default useApi;
