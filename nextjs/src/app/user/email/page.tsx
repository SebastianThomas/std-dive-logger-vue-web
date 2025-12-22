"use client";
import { resolveUrl } from "@/components/globals/url/resolveUrl";
import axios, { isAxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ConfirmEmail() {
    const query = useSearchParams();
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        setToken(query.get('token'));
    }, [query]);

    useEffect(() => {
        if (token) {
            axios.post(resolveUrl(`/api/auth/verify-email?token=${token}`)).then((result) => {
                if (result.data.id) {
                    router.push('/auth/login');
                }
            }).catch((err) => {
                if (isAxiosError(err)) {
                    toast.error(`Could not verify your token`);
                }
            });
        }
    }, [token, router]);


    return <div>
        Validating your email token...
    </div>
}