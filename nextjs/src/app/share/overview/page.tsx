"use client";

import { BasicLayout } from "@/app/helper/basic_layout";
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import GroupJoinIcon from '@mui/icons-material/Login';
import ScubaIcon from '@mui/icons-material/ScubaDiving';
import EditIcon from '@mui/icons-material/Edit';
import { useState, useEffect } from "react";
import useApi from "@/hooks/useApi";
import { IconButton, Button, Tooltip, Popover } from "@mui/material";
import GroupPopover from "@/components/share/groupPopover";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { GroupMember } from "@/types/share"

export default function GroupOverview() {
    const [groups, setGroups] = useState<GroupMember[]>([]);
    const [anchorElAdd, setAnchorElAdd] = useState<HTMLButtonElement | null>(null);
    const [anchorElJoin, setAnchorElJoin] = useState<HTMLButtonElement | null>(null);


    const { getWithToken } = useApi();
    const { postWithToken } = useApi();
    const router = useRouter();



    async function joinGroup(groupName: string): Promise<boolean> {
        try {
            const res = await postWithToken((`/v1/groups/${groupName}/join`), {}, {}, "application/json");
            console.log(res.data);
            toast.success("joined successfully!");
            fetchGroups();
            return true;
        } catch (err: any) {
            const backendMessage: string = err.response?.data?.detail
            if (backendMessage?.includes("already requested")) {
                toast.error("You already requested to be a member of this group.");
            } else {
                toast.error("Failed to create group. Please try again.");
            }
            console.error(err);
            return false;
        }
    }

    async function addGroup(groupName: string): Promise<boolean> {
        try {
            const res = await postWithToken(("/v1/groups"), { name: groupName }, {}, "application/json");
            toast.success("Group created successfully!");
            fetchGroups();
            return true;
        } catch (err: any) {
            const backendMessage: string = err.response?.data?.detail
            if (backendMessage?.includes("A group with this name already exists.")) {
                toast.error("A group with this name already exists.");
            } else {
                toast.error("Failed to create group. Please try again.");
            }
            console.error(err);
            return false;
        }
    }

    function showDive(id: number) {
        //TODO: push to Dives of this Group
        console.log("showDive of group with id: ", id)
    }
    function editGroup(id: number) {
        router.push(`/share/${id}/edit`);
    }

    async function fetchGroups() {
        try {
            const res = await getWithToken('/v1/groups')
            setGroups(res.data.result)
        } catch (err: any) {
            console.error(err)
        }
    }
    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <BasicLayout page_name={""} >
            <div className="bg-gray-100  bg-[url('/images/background.jpg')]
          bg-cover bg-center bg-fixed h-full
        ">
                <div className="flex justify-center pt-10">
                    <main className="bg-white rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4">
                        <div className="flex justify-between">
                            <h3 className="text-3xl font-semibold pb-8">Your groups</h3>
                            <div className="flex gap-4 align-center pb-8">
                                <Button variant="outlined" startIcon={<GroupAddIcon />} onClick={(e) => setAnchorElAdd(e.currentTarget)}>
                                    new group
                                </Button>
                                <GroupPopover anchorEl={anchorElAdd} onClose={() => setAnchorElAdd(null)} onSubmit={addGroup} label="group name" type="new" />
                                <Button variant="outlined" startIcon={<GroupJoinIcon />} onClick={(e) => setAnchorElJoin(e.currentTarget)}>
                                    join group
                                </Button>
                                <GroupPopover anchorEl={anchorElJoin} onClose={() => setAnchorElJoin(null)} onSubmit={joinGroup} label="group name" type="join" />
                            </div>
                        </div>
                        <ul className="flex flex-col gap-4">
                            {groups.map((agroup) => (
                                <li className="flex justify-between" key={agroup.group.id}>
                                    <div className="flex flex-col">
                                        <p className="text-lg">{agroup.group.name}</p>
                                        <p className="text-sm text-gray-500">{agroup.role}</p>
                                    </div>
                                    <div>
                                        {/* SHOW as soon as Backend is ready
                                        <Tooltip title="show dives">
                                            <IconButton aria-label="show dives" onClick={() => showDive(agroup.group.id)} >
                                                <ScubaIcon />
                                            </IconButton>
                                        </Tooltip>
                                        */}
                                        <Tooltip title="edit group">
                                            <IconButton aria-label="edit group" onClick={() => editGroup(agroup.group.id)}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </main>
                </div>
            </div>
        </BasicLayout >
    );
}