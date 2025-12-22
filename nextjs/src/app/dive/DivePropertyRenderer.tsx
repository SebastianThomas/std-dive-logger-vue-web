import type { DiveWithoutProfiles } from '@/types/dive'
import Image from 'next/image'
import { JSX } from 'react'

export const DivePropertyRenderer: Record<keyof DiveWithoutProfiles, (row: DiveWithoutProfiles) => JSX.Element> = {
  id: (row: DiveWithoutProfiles) => <span>{row.id}</span>,
  number: (row: DiveWithoutProfiles) => <span>{row.number}</span>,
  customIdentifier: (row: DiveWithoutProfiles) => <span>{row.customIdentifier}</span>,
  previewImage: (row: DiveWithoutProfiles) =>
    <Image
      src={row.previewImage}
      alt={`Preview of dive ${row.id}`}
      width={100}
      height={40}
    />,
  site: (row: DiveWithoutProfiles) => <span>{row.site.name + " (" + row.site.latitude + "°N," + row.site.longitude + "°E)"}</span>,
  buddiesDives: (row: DiveWithoutProfiles) =>
    <span>
      {row.buddiesDives.map(({ buddy }, j) =>
        // TODO: Implement route to diveId
        <div key={j + "buddy-dive"}> {buddy.name}</div>
      )}
    </span >,
  namedBuddies: (row: DiveWithoutProfiles) =>
    <span>
      {row.namedBuddies.map((name, j) =>
        <div key={j + "name"}>{name}</div>
      )}
    </span>,
  user: (row) => <span>{row.user.name}</span>
}