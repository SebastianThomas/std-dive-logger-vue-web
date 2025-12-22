import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import { refreshAccessToken } from "../components/globals/auth/refreshToken";
import { resolveUrl } from "../components/globals/url/resolveUrl";
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
        init ??= {};

        if (auth.loggedIn) {
            headers["Authorization"] = `Bearer ${auth.accessToken}`;
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        return {
            ...init,
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
    async function requestWithRetry<T = unknown, D = unknown, H = object>(
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
    }

    const getWithToken = async <T = unknown, H = unknown>(url: string, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry<T, undefined, H>(resolved, "GET", init);
    };

    const deleteWithToken = async <T = unknown, D = object, H = unknown>(url: string, body?: BodyType, init?: AxiosRequestConfig) => {
        const resolved = resolveUrl(url);
        return requestWithRetry<T, D, H>(resolved, "DELETE", init, body);
    };

    const postWithToken = async <T = unknown, D = object, H = unknown>(
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
    };

    const putWithToken = async <T = unknown, D = object, H = unknown>(
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
    };

    return { getWithToken, postWithToken, putWithToken, refresh, deleteWithToken };
}

export default useApi;
