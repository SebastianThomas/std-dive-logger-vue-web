import axios from "axios";
import { resolveUrl } from "../url/resolveUrl";

// Call the backend refresh endpoint which expects the refresh token cookie
// and returns a raw access token string in the response body on success.
export async function refreshAccessToken(): Promise<string | null> {
    const url = resolveUrl("/api/auth/refresh");
    try {
        console.log('Refreshing...')
        const res = await axios.post(url, undefined, { withCredentials: true, timeout: 1000 });
        console.log('Refreshed')
        const token = res.data as string;
        return token || null;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            console.error('Failed fetching', err);
        }
        console.log('Failed')
        return null;
    }
}

export default refreshAccessToken;
