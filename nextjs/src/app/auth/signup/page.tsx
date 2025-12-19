"use client";

import { BasicLayout } from "@/app/helper/basic_layout";
import { resolveUrl } from "@/app/helper/url/resolveUrl";
import "@fortawesome/fontawesome-free/css/all.css";
import { useRouter } from "next/navigation";
import { FormEvent } from 'react';
import { toast } from "react-toastify";

export default function Signup() {
  const router = useRouter()
  const handleSubmitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget)
    const username = formData.get('username')
    const password = formData.get('password')
    const email = formData.get('email')


    try {
      const res = await fetch(resolveUrl(`/api/auth/signup`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: username }),
      });
      if (!res.ok) {
        console.error("Signup failed"); //do proper error handling later
        return;
      }

      const data = await res.json();
      if (data.id) {
        router.push('/auth/login');
        return;
      }

      console.log(data);
      throw new Error("Could not sign in");
    } catch (err) {
      console.error(err);
      toast.error(`Could not sign up, please check your inputs. You may already be registered with this email address, or the password may be too weak.`);
    }

  }
  return (
    <BasicLayout page_name="Signup" requiresAuth={false}>
      <div
        className="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
        style={{ minHeight: 'calc(100vh - 80px)' }}
      >
        <main className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <article>
            <header className="mb-6 text-center">
              <h1 className="text-black text-3xl md:text-4xl font-bold">Create Account</h1>
            </header>

            <form onSubmit={handleSubmitSignup} className="space-y-4">
              <div className="flex flex-col">
                <label htmlFor="username" className="mb-1 font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter username"
                  pattern=".+"
                  className="pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

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
                  value="Sign Up"
                  className="bg-sky-600 text-white px-6 py-2 rounded-lg hover:bg-sky-700 transition cursor-pointer"
                />
              </div>
            </form>
          </article>
        </main>
      </div>
    </BasicLayout>

  );
}

