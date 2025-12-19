import type { BuddyDive, DiveWithoutProfiles } from '@/types/dive'
import { JSX } from 'react'

export const renderer: Record<keyof DiveWithoutProfiles, (row: DiveWithoutProfiles) => JSX.Element> = {
  id: (row: DiveWithoutProfiles) => <span>{row.id}</span>,
  number: (row: DiveWithoutProfiles) => <span>{row.number}</span>,
  customIdentifier: (row: DiveWithoutProfiles) => <span>{row.customIdentifier}</span>,
  previewImage: (row: DiveWithoutProfiles) =>
    <img
      src={row.previewImage}
      alt={`Preview of dive ${row.id}`}
    />,
  site: (row: DiveWithoutProfiles) => <span>{row.site.name + " (" + row.site.latitude + "°N," + row.site.longitude + "°E)"}</span>,
  buddiesDives: (row: DiveWithoutProfiles) =>
    <span>
      {row.buddiesDives.map((bd: BuddyDive, j) =>
        <div key={j + "buddy-dive"}>{bd.buddy.name + " (id:" + bd.buddy.id + ")"}</div>
      )}
    </span>,
  namedBuddies: (row: DiveWithoutProfiles) =>
    <span>
      {row.buddiesDives.map((bd: BuddyDive, j) =>
        <div key={j + "name"}>{bd.buddy.name}</div>
      )}
    </span>,
  user: (row) => <span>{row.user.name}</span>
}