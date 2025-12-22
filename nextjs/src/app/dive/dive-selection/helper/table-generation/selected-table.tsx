import { DivePropertyRenderer } from "@/app/dive/DivePropertyRenderer";
import type { SetState } from '@/types/abbreviations';
import {
  ALL_PARAMS_MAP,
  type DiveWithoutProfiles
} from '@/types/dive';
import { JSX } from 'react';

/*
 *   creating table:
 *          * show selected dives in a table
 */
export default function SelectedTable({
  displayedItems,
  selectedDives,
  setSelectedDives,
}: Readonly<{
  displayedItems: (keyof DiveWithoutProfiles)[];
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>;
}>) {
  // print the table
  return (
    <article className="bg-white border-2 rounded-lg flex flex-col h-full overflow-hidden w-full">
      <header className="h-10 bg-sky-500 flex justify-center items-center border-b-2 shrink-0">
        <h1 className={`text-black text-[20px] font-bold`}>Selected dives</h1>
      </header>
      <main className="overflow-y-auto flex-1 min-h-0">
        <ShowTable
          table={selectedDives}
          displayedItems={displayedItems}
          setTable={setSelectedDives}
        />
      </main>
    </article>
  );
}

/*
 *     printing the filtered table
 */
function ShowTable({
  table,
  displayedItems,
  setTable,
}: Readonly<{
  table: DiveWithoutProfiles[];
  displayedItems: (keyof DiveWithoutProfiles)[];
  setTable: SetState<DiveWithoutProfiles[]>;
}>) {
  if (!table) {
    return <div></div>;
  }

  const handleUnselect = (rowIndex: number) => {
    const row = table[rowIndex];
    const rowId = row.id;
    setTable(table.filter((dive) => dive.id !== rowId));
  };

  function columnSelected(s: keyof DiveWithoutProfiles) {
    return displayedItems.includes(s);
  }

  const tableElement = "border border-gray-400 px-2 py-1";

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              {displayedItems.map((element, i) => (
                <th
                  key={i + "selected-header"}
                  className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-left bg-blue-200"
                >
                  {ALL_PARAMS_MAP[element]}
                </th>
              ))}
              <th className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-center bg-blue-200 w-25">unselect</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {table.map((row, rowIndex) => (
              <tr
                key={rowIndex + "selected-body"}
                className={`cursor-pointer transition-colors bg-white hover:bg-gray-50`}
              >
                {(Object.entries(DivePropertyRenderer) as ([keyof DiveWithoutProfiles, (row: DiveWithoutProfiles) => JSX.Element])[]).map(([key, value]) =>
                  columnSelected(key) && (
                    <td key={row.id + String(key)} className={tableElement}>
                      {value(row)}
                    </td>
                  )
                )}
                <td className="border border-gray-400 px-2 py-1 text-center" onClick={() => handleUnselect(rowIndex)} title="unselect">
                  <button>
                    <i className="fa-solid fa-x"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
