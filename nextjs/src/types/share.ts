export type User = { id: number; name: string };

export type Group = { id: number; name: string };

export type GroupMember = {
    group: {
        id: number,
        name: string
    },
    role: GroupRole
};

type InGroupRole = "MEMBER" | "ADMIN";
type GroupRole = InGroupRole | "REQUESTED" | "DENIED";

export type UserWithRole = User & {
    role: InGroupRole;
}

export type GroupRequest = {
    user: UserWithRole,
    current: GroupRole,
};

export type GroupWithMembers = Group & {
    admins: User[],
    members: User[],
};
