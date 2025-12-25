"use client";

import { BasicLayout } from "@/components/globals/basic_layout";
import { resolveUrl } from "@/components/globals/url/resolveUrl";
import { useAuth } from "@/context/AuthContext";
import "@fortawesome/fontawesome-free/css/all.css";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from "react-toastify";

export async function postMagicLogin(email: string) {
    const res = await axios.post(resolveUrl(`/api/auth/login/magic/create`), { email }, {
        withCredentials: true
    });
    return res;
}

export default function Login() {
    const router = useRouter();
    const query = useSearchParams();
    const { auth } = useAuth();

    const [email, setEmail] = useState<string>('');

    const redirectAfterLogin = useCallback(() => {
        router.push(query.get(`from`) || "/");
    }, [router, query]);

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

        try {
            const res = await postMagicLogin(email);

            if (res.status >= 300) {
                throw new Error('Could not create login link.')
            }
            toast.info(`Link sent to your inbox.`)
            setTimeout(() => router.push('/'), 3000);
        } catch (err) {
            console.error(err);
            toast.error(`Could not create a login link for ${email}`)
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
                            <h1 className="text-black text-3xl md:text-4xl font-bold">Magic Login</h1>
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
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="yourEmail@google.com"
                                    pattern=".+@.+"
                                    className="pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                                />
                            </div>

                            <div className="flex justify-center">
                                <input
                                    type="submit"
                                    value="Send Email with Token"
                                    className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition cursor-pointer"
                                />
                            </div>
                        </form>

                        <div className="mt-4 text-center">
                            <Link href="/auth/login">
                                <button className="text-sky-600 hover:underline">
                                    Use your password
                                </button>
                            </Link>
                        </div>
                    </article>
                </main>
            </div>
        </BasicLayout>

    );
}

