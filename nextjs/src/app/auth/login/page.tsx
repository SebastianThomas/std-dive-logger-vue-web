"use client";

import { BasicLayout } from "@/components/globals/basic_layout";
import { resolveUrl } from "@/components/globals/url/resolveUrl";
import { useAuth } from "@/context/AuthContext";
import "@fortawesome/fontawesome-free/css/all.css";
import axios, { AxiosResponse } from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from "react-toastify";

export async function postLogin(email: string, password: string) {
  return await fetch(resolveUrl(`/api/auth/login`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function postMagicLoginToken(token: string): Promise<AxiosResponse<{ accessToken: string }, string>> {
  return await axios.post(resolveUrl(`/api/auth/login/magic`), { token }, { withCredentials: true })
}

export default function Login() {
  const router = useRouter();
  const query = useSearchParams();
  const { auth, login } = useAuth();
  const [magicToken, setMagicToken] = useState<string | null>(query.get('token'));

  const redirectAfterLogin = useCallback(() => {
    router.push(query.get(`from`) || "/");
  }, [router, query]);

  useEffect(() => {
    setMagicToken(query.get('token'));
  }, [query])

  useEffect(() => {
    if (magicToken) {
      (async () => {
        try {
          const result = await postMagicLoginToken(magicToken);
          login(result.data.accessToken);
          redirectAfterLogin();
        } catch (err) {
          console.error(err);
          toast.error('Could not log you in using the given token.')
        }
      })();
    }
  }, [magicToken, login, redirectAfterLogin])

  useEffect(() => {
    if (auth) {
      if (auth.loggedIn && !auth.refreshing) {
        redirectAfterLogin();
        return;
      }
    }
  }, [auth, router, redirectAfterLogin]);

  if (auth.loggedIn) {
    return <>Continuing your previous session...</>;
  }

  const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget)
    const password = formData.get('password')
    const email = formData.get('email')

    try {
      const res = await postLogin(email as string, password as string);

      if (!res.ok) {
        throw new Error(`Login failed with result ${res.status}`);
      }

      const data = await res.json();
      const { accessToken } = data as { accessToken: string };

      login(accessToken);

      redirectAfterLogin();
    } catch (err) {
      console.error(err);
      toast.error(`Could not log in, please check your email and password.`)
    }
  }
  return (
    <BasicLayout page_name={""} requiresAuth={false}>
      <div
        className="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
        style={{ minHeight: 'calc(100vh - 80px)' }}
      >
        <main className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <article>
            <header className="mb-6 text-center">
              <h1 className="text-black text-3xl md:text-4xl font-bold">Login</h1>
            </header>
            <form onSubmit={handleSubmitLogin} className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="email" className="mb-1 font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  placeholder="Enter email address"
                  pattern=".+"
                  className="pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="flex flex-col">
                <label htmlFor="password" className="mb-1 font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  pattern=".+"
                  className="pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div className="flex justify-center">
                <input
                  type="submit"
                  value="Login"
                  className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition cursor-pointer"
                />
              </div>
            </form>

            <div className="mt-4 text-center">
              <Link href="/auth/magic-login">
                <button className="text-sky-600 hover:underline">
                  Use Magic Link Login
                </button>
              </Link>
            </div>
          </article>
        </main>
      </div>
    </BasicLayout >
  );
}

