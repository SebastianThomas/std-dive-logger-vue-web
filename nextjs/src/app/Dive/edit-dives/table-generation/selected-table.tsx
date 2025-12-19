import { renderer } from '@/app/Dive/renderer';
import { ALL_PARAMS_MAP, type Dive, type DiveWithoutProfiles } from '@/types/dive';
import useApi from "@/hooks/useApi";
import type { SetState } from '@/types/abbreviations';
import { JSX } from 'react'
import { useRouter } from "next/navigation";

/*
 *   creating table:
 *          * show selected dives in a table
 */
export default function SelectedTable({
  displayedItems,
  diveSummaries,
  selectedDives,
  setSelectedDives
}: Readonly<{
  displayedItems: (keyof DiveWithoutProfiles)[];
  diveSummaries: DiveWithoutProfiles[];
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>; 
}>) {
  // print the table
  return (
    <ShowTable
      table={diveSummaries}
      displayedItems={displayedItems}
      selectedDives={selectedDives}
      setSelectedDives={setSelectedDives}
    />
  );
}


/*
 *     printing the filtered table
 */
function ShowTable({
  table,
  displayedItems,
  selectedDives,
  setSelectedDives
}: Readonly<{
  table: DiveWithoutProfiles[];
  displayedItems: (keyof DiveWithoutProfiles)[];
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>; 
}>) {
  if (!table) {
    return <div></div>;
  }

  function columnSelected(s: keyof DiveWithoutProfiles) {
    return displayedItems.includes(s)
  }

  const tableElement = "border border-gray-400 px-2 py-1"
  
  const handleRowClick = (rowIndex: number) => {
    const row = table[rowIndex];
    const rowId = row.id;

    if (selectedDives.some(r => (r.id === rowId))) {
      setSelectedDives(selectedDives.filter(r => (r.id !== rowId)));
    } else {
      setSelectedDives([...selectedDives, row]);
    }
  };
  
  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-black">
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              {displayedItems.map((element, i) => (
                <th
                  key={i + '-header-row'}
                  className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-left bg-blue-200"
                >
                  {ALL_PARAMS_MAP[element]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {table.map((row, rowIndex) =>
              <tr
                key={rowIndex + '-body-row'}
                onClick={() => handleRowClick(rowIndex)}
                className={`cursor-pointer transition-colors ${selectedDives.some(r => (r.id === row.id))
                  ? 'bg-sky-200 hover:bg-sky-300'
                  : 'bg-white hover:bg-gray-50'
                  }`}
              >
                {(Object.entries(renderer) as ([keyof DiveWithoutProfiles, (row: DiveWithoutProfiles) => JSX.Element])[]).map(([key, value]) =>
                  columnSelected(key) && (
                    <td key={row.id + String(key)} className={tableElement}>
                      {value(row)}
                    </td>
                  )
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}