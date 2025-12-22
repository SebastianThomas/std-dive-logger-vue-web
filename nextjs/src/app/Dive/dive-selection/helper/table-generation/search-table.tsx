import { DivePropertyRenderer } from '@/app/dive/DivePropertyRenderer';
import SharePopover from '@/components/share/sharePopover';
import useApi from "@/hooks/useApi";
import type { SetState } from '@/types/abbreviations';
import { ALL_PARAMS_MAP, type DiveWithoutProfiles, type PagedResult } from '@/types/dive';
import { User } from '@/types/share';
import { AxiosResponse } from 'axios';
import { useRouter } from "next/navigation";
import { JSX, useEffect, useState } from "react";


/*
 *   creating table:
 *          * update current dive list on a change of the page number
 *          * update the filtered list whenever necessary, i.e. 
 *                * change of page number
 *                * filtering the list
 *                * adding or removing attributes like id, siteName etc
 */
export default function SearchTable({
  page_nr,
  displayedItems,
  selectedDives,
  setSelectedDives,
  setNumberOfPages,
  fullTable,
  setFullTable,
  searchValue,
  viewShared = false
}: Readonly<{
  page_nr: number;
  displayedItems: (keyof DiveWithoutProfiles)[];
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>;
  setNumberOfPages: SetState<number>;
  fullTable: DiveWithoutProfiles[];
  setFullTable: SetState<DiveWithoutProfiles[]>;
  searchValue: string;
  viewShared: boolean;
}>) {
  // table returned by requesting a dive page from the backend
  const { getWithToken } = useApi();

  // get new dives when page number updates
  useEffect(() => {
    async function getData() {
      const response: AxiosResponse<PagedResult<DiveWithoutProfiles>> = (searchValue === "") ?
        await getWithToken(`/v1/dives?page=${page_nr - 1}&includeReader=${viewShared}`) :
        await getWithToken(`/v1/dives/search?page=${page_nr - 1}&query=${searchValue}`)
      setFullTable(response.data.result);
      setNumberOfPages(response.data.totalPages);
    }
    getData();
  }, [page_nr, viewShared, getWithToken, searchValue, setFullTable, setNumberOfPages]);

  // build table
  return (
    <div className="h-full">
      <ShowTable
        table={fullTable}
        selectedDives={selectedDives}
        setSelectedDives={setSelectedDives}
        displayedItems={displayedItems}
      />
    </div>
  );
}


/*
 *     printing the table
 */
function ShowTable({
  table,
  selectedDives,
  setSelectedDives,
  displayedItems
}: Readonly<{
  table: DiveWithoutProfiles[];
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>;
  displayedItems: (keyof DiveWithoutProfiles)[];
}>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [shareDiveId, setshareDiveId] = useState<number | undefined>(undefined);

  const [myUserId, setMyUserId] = useState<number | null>(null);
  const { getWithToken } = useApi();


  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const res = await getWithToken<User>("/v1/users/");
        setMyUserId(res.data.id);
      } catch (err) {
        console.error("Failed to fetch user ID", err);
      }
    };
    fetchUserId();
  }, [getWithToken]);

  const router = useRouter();

  // when row clicked, toggle dive selection for that specific dive
  const handleRowClick = (rowIndex: number) => {
    const row = table[rowIndex];
    const rowId = row.id;

    if (selectedDives.some(r => (r.id === rowId))) {
      setSelectedDives(selectedDives.filter(r => (r.id !== rowId)));
    } else {
      setSelectedDives([...selectedDives, row]);
    }
  };

  function columnSelected(s: keyof DiveWithoutProfiles) {
    return displayedItems.includes(s)
  }
  function handleShareClick(diveId: number, e: React.MouseEvent) {
    setshareDiveId(diveId);
    setAnchorEl(e.currentTarget as HTMLElement)
  }

  if (!table) {
    return <div></div>;
  }

  const tableElement = "border border-gray-400 px-2 py-1"
  // buid the DOM
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              {displayedItems.map((element, i) => (
                <th
                  key={i + "search header"}
                  className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-left bg-blue-200"
                >
                  {ALL_PARAMS_MAP[element]}
                </th>
              ))}
              <th className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-left bg-blue-200">{/* placeholder for dive visualization buttons */}</th>
              <th className="sticky top-0 z-10 border border-gray-400 px-2 py-1 text-left bg-blue-200">{/* placeholder for dive visualization buttons */}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {table.map((row, rowIndex) =>
              <tr
                key={rowIndex + "search body"}
                onClick={() => handleRowClick(rowIndex)}
                className={`cursor-pointer transition-colors ${selectedDives.some(r => (r.id === row.id))
                  ? 'bg-sky-200 hover:bg-sky-300'
                  : 'bg-white hover:bg-gray-50'
                  }`}
              >
                {(Object.entries(DivePropertyRenderer) as ([keyof DiveWithoutProfiles, (row: DiveWithoutProfiles) => JSX.Element])[]).map(([key, value]) =>
                  columnSelected(key) && (
                    <td key={row.id + String(key)} className={tableElement}>
                      {value(row)}
                    </td>
                  )
                )}
                <td className="border border-gray-400 px-2 py-1 text-center" onClick={() => router.push(`/Dive/view/${table[rowIndex].id}`)}>
                  Visualize dive <i className="fa-solid fa-chart-line ml-2"></i>
                </td>
                {row.user.id === myUserId ?
                  <td className="border border-gray-400 px-2 py-1 text-center" onClick={(e) => handleShareClick(row.id, e)}>
                    Share dive <i className="fa-solid fa-share-nodes ml-2"></i>
                  </td>
                  :
                  <td></td>
                }
              </tr>
            )}
            <SharePopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} diveId={shareDiveId} />
          </tbody>
        </table>
      </div>
    </div>
  );
}