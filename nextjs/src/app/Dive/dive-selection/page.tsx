"use client";

import type { DiveWithoutProfiles } from '@/types/dive';
import { BasicLayout } from "@/app/helper/basic_layout";
import "@fortawesome/fontawesome-free/css/all.css";
import { useState } from "react";
import DiveSearch from "./helper/dive-search";
import SearchTable from "./helper/table-generation/search-table";
import SelectedDives from "./helper/table-generation/selected-table";

/*
 * landing page when trying to edit dives
 */
const DiveSelection: React.FC = () => {
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [displayedItems, setDisplayedItems] = useState<(keyof DiveWithoutProfiles)[]>([
    "id", "number", "customIdentifier",
  ])
  const [selectedDives, setSelectedDives] = useState<DiveWithoutProfiles[]>([]);
  const [numberOfPages, setNumberOfPages] = useState<number>(0);
  const [viewSelectedDives, setViewSelectedDives] = useState<boolean>(false);
  const [fullTable, setFullTable] = useState<DiveWithoutProfiles[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [viewShared, setViewShared] = useState(false);

  return (
    <BasicLayout page_name="" requiresAuth={true}>
      <main className="flex relative w-full h-full">
        <div className={`bg-sky-100 text-black flex`}>
          <div className="flex-1 p-4">
            <div className="h-1/3 min-h-[200px] pb-4 flex">
              <div className="w-full h-full pb-4 pr-2">
                <DiveSearch
                  page_nr={pageNumber}
                  setPageNumber={setPageNumber}
                  numberOfPages={numberOfPages}
                  viewSelectedDives={viewSelectedDives}
                  toggleView={setViewSelectedDives}
                  displayedItems={displayedItems}
                  setItems={setDisplayedItems}
                  selectedDives={selectedDives}
                  setFullTable={setFullTable}
                  setNumberOfPages={setNumberOfPages}
                  searchValue={searchValue}
                  setSearchValue={setSearchValue}
                />
              </div>
            </div>
            <div className="pb-2">
              <button
                type="button"
                onClick={() => setViewShared((prev) => !prev)}
                className={`
    px-4 py-2 rounded-md border text-sm font-medium transition 
    ${viewShared
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}
  `}
              >
                {viewShared ? "Viewing shared dives" : "View shared dives"}
              </button>
            </div>
            <div className={`${viewSelectedDives ? "h-1/3" : "h-2/3"} flex pb-4`}>
              <SearchTable
                page_nr={pageNumber}
                displayedItems={displayedItems}
                selectedDives={selectedDives}
                setSelectedDives={setSelectedDives}
                setNumberOfPages={setNumberOfPages}
                fullTable={fullTable}
                setFullTable={setFullTable}
                searchValue={searchValue}
                viewShared={viewShared}
              />
            </div>
            {
              viewSelectedDives &&
              <div className="h-1/3 pb-4 flex">
                <SelectedDives
                  displayedItems={displayedItems}
                  selectedDives={selectedDives}
                  setSelectedDives={setSelectedDives}
                />
              </div>
            }
          </div>
        </div>
      </main>
    </BasicLayout >
  );

}
export default DiveSelection;