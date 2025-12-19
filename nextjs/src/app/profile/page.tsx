"use client"

import { toast } from "react-toastify";
import { useRouter } from "next/navigation"
import { BasicLayout } from "../helper/basic_layout";
import useApi from "@/hooks/useApi";
import { useEffect, useState } from "react";

export default function UserProfile() {
    const { getWithToken, postWithToken } = useApi();
    const router = useRouter();
    const [user, setUser] = useState<{ id: number; name: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeregisterModal, setShowDeregisterModal] = useState(false);


    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await getWithToken('/v1/users/');
                setUser(res.data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load user profile");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);
    async function handleDeregister() {
        try {
            const res = await postWithToken('/api/auth/deregister');

            if (res.status !== 200) {
                throw new Error("Deregistration failed");
            }

            localStorage.removeItem("token");
            toast.success("Account deregistered successfully");
            router.push("/auth/login");
        } catch (err) {
            console.error(err);
            toast.error("Failed to deregister account");
        }
    }
    return (
        <BasicLayout page_name="User Profile">
            <div
                className="bg-gray-100 bg-[url('/images/background.jpg')] bg-cover bg-center bg-fixed flex justify-center items-start pt-20 px-6 md:px-10"
                style={{ minHeight: 'calc(100vh - 80px)' }}
            >
                <main className="max-w-5xl w-full mx-auto p-6">
                    <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">

                        {/* Header */}
                        <div className="flex items-center gap-6">
                            {/* Profile Picture Placeholder */}
                            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl font-semibold">
                                {user?.name?.charAt(0).toUpperCase() ?? "?"}
                            </div>

                            {/* User Info */}
                            <div>
                                <h1 className="text-2xl font-semibold">User Profile</h1>
                                {user && (
                                    <p className="text-gray-700 mt-1">
                                        <strong>Username:</strong> {user.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Account Section */}
                        <section className="space-y-2">
                            <h2 className="text-lg font-medium">Account</h2>

                            {!user && <p>Loading...</p>}

                            {user && (
                                <p>
                                    <strong>User ID:</strong> {user.id}
                                </p>
                            )}
                        </section>

                        {/* Danger Zone */}
                        <section className="border-t pt-6 space-y-4">
                            <h2 className="text-lg font-medium text-red-600">
                                Permanently Delete Account
                            </h2>

                            <button
                                onClick={() => setShowDeregisterModal(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Delete Account
                            </button>
                        </section>

                    </div>
                </main>
            </div>

            {/* Deregister Modal */}
            {showDeregisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-red-600">
                            Deregister Account
                        </h3>

                        <p className="text-gray-700">
                            Are you sure you want to permanently delete your account?
                            This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeregisterModal(false)}
                                className="px-4 py-2 rounded border"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={async () => {
                                    setShowDeregisterModal(false);
                                    await handleDeregister();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Deregister
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BasicLayout>
    );
}