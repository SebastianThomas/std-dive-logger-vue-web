export type GroupMember = {
    group: {
        id: number,
        name: string
    },
    role: GroupRole
};

type GroupRole = "MEMBER" | "ADMIN" | "REQUESTED" | "DENIED";

export type User = {
    id: string;
    name: string;
    role: "ADMIN" | "MEMBER";
}
export type SimpleUser = {
    id: string;
    name: string;
}