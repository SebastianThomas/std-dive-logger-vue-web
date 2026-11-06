export type User = {
  id: number
  name: string
  customIconUrl?: string | null
  customBackgroundUrl?: string | null
}

/** The signed-in account's own details (backend `AccountSettings`); `createdAt` is epoch millis. */
export type AccountSettings = {
  id: number
  name: string
  email: string
  emailVerified: boolean
  createdAt: number
  pendingEmail?: string | null
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

export type CertificationAgency = {
  id: number
  name: string
  fullName?: string | null
  websiteUrl?: string | null
  description?: string | null
}

export type Certification = {
  id: number
  userId: number
  agency: CertificationAgency
  level: string
  certDate: string
  certId?: string | null
  instructorName?: string | null
  facility?: string | null
  courseLink?: string | null
  certificationLink?: string | null
}
