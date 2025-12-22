"use client";

import { BasicLayout } from "@/components/globals/basic_layout";
import { RoleMenu } from "@/components/share/roleMenu";
import { useAuth } from "@/context/AuthContext";
import useApi from "@/hooks/useApi";
import {
  GroupRequest,
  GroupWithMembers,
  User,
  UserWithRole,
} from "@/types/share";
import CheckIcon from "@mui/icons-material/Check";
import CrossIcon from "@mui/icons-material/Close";
import { IconButton } from "@mui/material";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function EditGroup() {
  const { getWithToken, putWithToken } = useApi();
  const { auth } = useAuth();
  const { groupId } = useParams();
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchJoinRequests = useCallback(async () => {
    try {
      const res = await getWithToken<GroupRequest[]>("/v1/groups/requests");
      const reqArr = res.data.map(({ user }) => user);
      setRequests(reqArr);
    } catch (err: unknown) {
      console.error(err);
    }
  }, [getWithToken]);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId || !auth.loggedIn) return;

    try {
      const res = await getWithToken<GroupWithMembers>(
        `/v1/groups/${groupId}/members`
      );
      setGroupName(res.data.name);

      const allUsers: UserWithRole[] = res.data.members
        .map(
          ({ id, name }) => ({ id, name: name, role: "MEMBER" }) as UserWithRole
        )
        .concat(
          res.data.admins.map(({ id, name }) => ({ id, name, role: "ADMIN" }))
        )
        .sort((a: UserWithRole, b: UserWithRole) =>
          a.name.localeCompare(b.name)
        );
      setUsers(allUsers);

      // Check if current user is admin
      const firstAdmin = allUsers.find((user) => user.role === "ADMIN");
      if (firstAdmin !== undefined) {
        try {
          await putWithToken(
            `/v1/groups/role?id=${groupId}&userId=${Number(firstAdmin.id)}&role=ADMIN`
          );
          setIsAdmin(true);
        } catch (err) {
          console.error(err);
          setIsAdmin(false);
        }
      }
    } catch (err) {
      toast.error("Could not load group members.");
      console.error(err);
    }
  }, [groupId, auth.loggedIn, getWithToken, putWithToken]);

  useEffect(() => {
    void (async () => {
      await fetchGroupDetails();
      await fetchJoinRequests();
    })();
  }, [fetchGroupDetails, fetchJoinRequests]);

  async function changeRole(id: number, newRole: string) {
    await putWithToken(
      `/v1/groups/role?id=${groupId}&userId=${id}&role=${newRole}`
    );
    fetchGroupDetails();
  }
  async function acceptRequest(id: number) {
    await putWithToken(
      `/v1/groups/role?id=${groupId}&userId=${id}&role=MEMBER`
    );
    fetchJoinRequests();
  }
  async function declineRequest(id: number) {
    await putWithToken(
      `/v1/groups/role?id=${groupId}&userId=${id}&role=DENIED`
    );
    fetchJoinRequests();
  }

  return (
    <BasicLayout page_name={""}>
      <div
        className="bg-gray-100  bg-[url('/images/background.jpg')]
          bg-cover bg-center bg-fixed h-full
        "
      >
        <div className="flex justify-center pt-10">
          <main className="bg-white rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4">
            <h2 className="text-xl font-semibold mb-4"> {groupName} </h2>
            <h3 className="font-semibold">Members:</h3>
            <table>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.name}</td>
                    {isAdmin && (
                      <td>
                        <RoleMenu
                          userId={user.id}
                          currentRole={user.role}
                          changeRole={changeRole}
                          disabled={false}
                        ></RoleMenu>
                      </td>
                    )}
                    {!isAdmin && (
                      <td>
                        <RoleMenu
                          userId={user.id}
                          currentRole={user.role}
                          changeRole={changeRole}
                          disabled={true}
                        ></RoleMenu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isAdmin && (
              <>
                <h3 className="font-semibold">Join Requests:</h3>
                <table>
                  <tbody>
                    {requests.map((user) => (
                      <tr key={user.id}>
                        <td className="font-medium w-30 truncate">
                          {user.name}
                        </td>
                        <td className="flex gap-2">
                          <IconButton
                            aria-label="accept"
                            color="primary"
                            onClick={() => acceptRequest(user.id)}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            aria-label="decline"
                            color="primary"
                            onClick={() => declineRequest(user.id)}
                          >
                            <CrossIcon />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </main>
        </div>
      </div>
    </BasicLayout>
  );
}
