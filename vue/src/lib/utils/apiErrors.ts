import axios from 'axios'

/** Pulls the human-readable ProblemDetail `detail` out of a failed request, if present - the
 * backend's RestControllerAdvice traits (see utils/advice on the backend) put a specific,
 * actionable message there (e.g. "trimming this range would leave fewer than 2 measurements"). */
export function extractErrorDetail(err: unknown): string {
  if (axios.isAxiosError(err) && err.response) {
    const data = err.response.data as { detail?: string; title?: string }
    return data.detail ?? data.title ?? 'Please try again.'
  }
  return 'Please try again.'
}
