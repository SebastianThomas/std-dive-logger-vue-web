"use client";

import { BasicLayout } from "@/app/helper/basic_layout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useApi from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { RoleMenu } from "@/components/share/roleMenu";
import { IconButton } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CrossIcon from '@mui/icons-material/Close';
import { SimpleUser, User } from '@/types/share'




export default function EditGroup() {
    const { getWithToken, putWithToken } = useApi();
    const { auth } = useAuth();
    const { groupId } = useParams();
    const [groupName, setGroupName] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [requests, setRequests] = useState<SimpleUser[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    async function fetchJoinRequests() {
        try {
            const res = await getWithToken('/v1/groups/requests')
            let reqArr: SimpleUser[] = []
            res.data.forEach((genuser: { user: SimpleUser, current: string }) => {
                reqArr.push(genuser.user)
            });
            setRequests(reqArr);
        } catch (err: any) {
            console.error(err);
        }
    }

    async function fetchGroupDetails() {
        if (!groupId || !auth.loggedIn) return;

        try {
            const res = await getWithToken((`/v1/groups/${groupId}/members`))
            setGroupName(res.data.name);

            let allUsers: User[] = [];
            res.data.members.forEach((genuser: { id: string, name: string }) => {
                allUsers.push({ id: genuser.id, name: genuser.name, role: "MEMBER" })
            });
            res.data.admins.forEach((genuser: { id: string, name: string }) => {
                allUsers.push({ id: genuser.id, name: genuser.name, role: "ADMIN" })
            });
            allUsers.sort((a: User, b: User) => a.name.localeCompare(b.name));
            setUsers(allUsers);
        } catch (err) {
            //TODO: handle error
            console.error(err);
        }
    }
    async function checkIfAdmin() {
        const firstAdmin = users.find(user => user.role == "ADMIN");

        if (firstAdmin == undefined) return;
        try {
            const res = await putWithToken(`/v1/groups/role?id=${groupId}&userId=${Number(firstAdmin.id)}&role=ADMIN`)
            setIsAdmin(true);
        } catch (err) {
            setIsAdmin(false);
        }
    }

    useEffect(() => {
        checkIfAdmin()
    }
        , [users]);


    useEffect(() => {
        fetchGroupDetails();
        fetchJoinRequests();
    }, [groupId, auth.loggedIn]);

    async function changeRole(id: string, newRole: string) {
        const res = await putWithToken(`/v1/groups/role?id=${groupId}&userId=${id}&role=${newRole}`)
        fetchGroupDetails();
    }
    async function acceptRequest(id: string) {
        const res = await putWithToken(`/v1/groups/role?id=${groupId}&userId=${id}&role=MEMBER`)
        fetchJoinRequests();
    }
    async function declineRequest(id: string) {
        const res = await putWithToken(`/v1/groups/role?id=${groupId}&userId=${id}&role=DENIED`)
        fetchJoinRequests();
    }

    return (
        <BasicLayout page_name={""} >
            <div className="bg-gray-100  bg-[url('/images/background.jpg')]
          bg-cover bg-center bg-fixed h-full
        ">
                <div className="flex justify-center pt-10">
                    <main className="bg-white rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4">
                        <h2 className="text-xl font-semibold mb-4"> {groupName} </h2>
                        <h3 className="font-semibold">Members:</h3>
                        <table>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} >
                                        <td className="font-medium">{user.name}</td>
                                        {isAdmin &&
                                            <td>
                                                <RoleMenu userId={user.id} currentRole={user.role} changeRole={changeRole} disabled={false}></RoleMenu>
                                            </td>
                                        }
                                        {!isAdmin &&
                                            <td>
                                                <RoleMenu userId={user.id} currentRole={user.role} changeRole={changeRole} disabled={true}></RoleMenu>
                                            </td>
                                        }
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {isAdmin &&
                            <>
                                <h3 className="font-semibold">Join Requests:</h3>
                                <table>
                                    <tbody>
                                        {requests.map((user) => (
                                            <tr key={user.id} >
                                                <td className="font-medium w-30 truncate">{user.name}</td>
                                                <td className="flex gap-2">
                                                    <IconButton aria-label="accept" color="primary" onClick={() => acceptRequest(user.id)}>
                                                        <CheckIcon />
                                                    </IconButton>
                                                    <IconButton aria-label="decline" color="primary" onClick={() => declineRequest(user.id)}>
                                                        <CrossIcon />
                                                    </IconButton>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        }
                    </main>
                </div>
            </div>
        </BasicLayout >
    );
}