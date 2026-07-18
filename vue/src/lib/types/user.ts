export type User = {
  id: number
  name: string
  customIconUrl?: string | null
  customBackgroundUrl?: string | null
}

export type Group = { id: number; name: string }

export type GroupMember = {
  group: {
    id: number
    name: string
  }
  role: GroupRole
}

export type InGroupRole = 'MEMBER' | 'ADMIN'
export type GroupRole = InGroupRole | 'REQUESTED' | 'DENIED'

export type UserWithRole = User & {
  role: InGroupRole
}

export type GroupRequest = {
  user: UserWithRole
  current: GroupRole
}

export type GroupWithMembers = Group & {
  admins: User[]
  members: User[]
}
