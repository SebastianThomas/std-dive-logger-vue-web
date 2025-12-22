import useApi from "@/hooks/useApi";
import type { SetState } from "@/types/abbreviations";
import type { DiveWithoutProfiles, PagedResult } from "@/types/dive";
import { ALL_PARAMS_MAP, params } from "@/types/dive";
import { useRouter } from "next/navigation";
import { useState } from "react";

/*
 *    Introduce ability to hide selected dives for page understandability
 */
function ViewSelectedDives({
  viewSelectedDives,
  toggleView,
}: Readonly<{
  viewSelectedDives: boolean;
  toggleView: SetState<boolean>;
}>) {
  return (
    <div className="h-1/3 p-1 flex justify-center items-center">
      <button
        className="w-full h-full border-2 rounded-lg bg-sky-200 flex justify-center items-center cursor-pointer hover:bg-sky-300"
        onClick={() => toggleView(!viewSelectedDives)}
      >
        {viewSelectedDives ? "Hide selected dives" : "View selected dives"}
      </button>
    </div>
  );
}

/*
 *    Traverse to the dive editing page
 *        * first store the selected dives in the local storage to retrieve them upon arrival
 */
function EditSelectedDives({
  selectedDives,
  displayedItems,
}: Readonly<{
  selectedDives: DiveWithoutProfiles[];
  displayedItems: (keyof DiveWithoutProfiles)[];
}>) {
  const router = useRouter();
  function handlePageChange() {
    router.push(
      `/dive/edit-dives?items=${displayedItems.join(",")}&dives=${selectedDives.map((d) => d.id).join(",")}`
    );
  }
  return (
    <div className="h-1/3 p-1 flex justify-center items-center">
      <button
        className="w-full h-full border-2 rounded-lg bg-sky-200 flex justify-center items-center cursor-pointer hover:bg-sky-300"
        onClick={() => handlePageChange()}
      >
        Edit selected dives <i className="fa-solid fa-pen-to-square ml-2"></i>
      </button>
    </div>
  );
}

/*
 *    Increase/Decrease the page number of the retrieved dives when clicking on two icons
 */
function EditPageNumber({
  page_nr,
  setPageNumber,
  numberOfPages,
}: Readonly<{
  page_nr: number;
  setPageNumber: SetState<number>;
  numberOfPages: number;
}>) {
  function decrementNumber() {
    if (page_nr > 1) {
      setPageNumber(page_nr - 1);
    } else {
      setPageNumber(1);
    }
  }
  function incrementNumber() {
    if (page_nr < numberOfPages) {
      setPageNumber(page_nr + 1);
    } else {
      setPageNumber(numberOfPages);
    }
  }
  return (
    <div className="h-1/3 p-1 flex justify-center items-center">
      <div className="w-full h-full flex justify-center items-center">
        <button
          type="button"
          onClick={() => decrementNumber()}
          className="cursor-pointer mr-2 bg-transparent border-none p-0 hover:opacity-70 transition-opacity"
          aria-label="Previous page"
        >
          <i className="fa-solid fa-angle-left"></i>
        </button>
        Page {numberOfPages > 0 ? page_nr : 0}/{numberOfPages}
        <button
          type="button"
          onClick={() => incrementNumber()}
          className="cursor-pointer ml-2 bg-transparent border-none p-0 hover:opacity-70 transition-opacity"
          aria-label="Next page"
        >
          <i className="fa-solid fa-angle-right"></i>
        </button>
      </div>
    </div>
  );
}

/*
 *    Build the page navigation, includes
 *        * ViewSelectedDives: to hide/show the selected dives on request
 *        * EditSelectedDives: for the ability to edit the selected dives
 *        * EditPageNumber: to fetch new dives from the backend
 */
function PageNavigation({
  page_nr,
  setPageNumber,
  numberOfPages,
  viewSelectedDives,
  toggleView,
  selectedDives,
  displayedItems,
}: Readonly<{
  page_nr: number;
  setPageNumber: SetState<number>;
  numberOfPages: number;
  viewSelectedDives: boolean;
  toggleView: SetState<boolean>;
  selectedDives: DiveWithoutProfiles[];
  displayedItems: (keyof DiveWithoutProfiles)[];
}>) {
  return (
    <article className="bg-white border-2 rounded-lg flex flex-col h-full overflow-hidden min-h-45 min-w-50">
      <header className="h-10 bg-sky-500 flex justify-center items-center border-b-2 shrink-0">
        <h1 className={`text-black text-[20px] font-bold`}>Navigation</h1>
      </header>
      <main className="overflow-y-auto flex-1 min-h-0">
        <div className="w-full h-full">
          <EditSelectedDives
            selectedDives={selectedDives}
            displayedItems={displayedItems}
          />
          <ViewSelectedDives
            viewSelectedDives={viewSelectedDives}
            toggleView={toggleView}
          />
          <EditPageNumber
            page_nr={page_nr}
            setPageNumber={setPageNumber}
            numberOfPages={numberOfPages}
          />
        </div>
      </main>
    </article>
  );
}

function sortByDiveOrder<T extends string>(arr: T[], order: readonly T[]): T[] {
  const index = new Map(order.map((key, i) => [key, i]));
  return [...arr].sort((a, b) => {
    const ia = index.get(a) ?? 0;
    const ib = index.get(b) ?? 0;
    return ia - ib;
  });
}

const DIVE_KEY_ORDER: (keyof DiveWithoutProfiles)[] = [
  "id",
  "user",
  "number",
  "customIdentifier",
  "previewImage",
  "site",
  "buddiesDives",
  "namedBuddies",
];

/*
 *    creates table to select which parameters to display in the two tables
 */
export function ParameterSelection({
  displayedItems,
  setItems,
}: Readonly<{
  displayedItems: (keyof DiveWithoutProfiles)[];
  setItems: SetState<(keyof DiveWithoutProfiles)[]>;
}>) {
  // toggle the parameters in the list between clicked and unclicked
  const toggleParam = (param: keyof DiveWithoutProfiles) => {
    if (displayedItems.includes(param)) {
      setItems(displayedItems.filter((p) => p !== param));
    } else {
      setItems((prev) => sortByDiveOrder([...prev, param], DIVE_KEY_ORDER));
    }
  };
  // display the parameter list
  return (
    <div className="overflow-y-auto flex-1">
      <div className="space-y-0">
        {params.map((param: keyof DiveWithoutProfiles, index: number) => (
          <div key={param}>
            <button
              className={`p-3 cursor-pointer transition-colors ${displayedItems.includes(param)
                ? "bg-sky-200 hover:bg-sky-300"
                : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => toggleParam(param)}
            >
              <p className="font-medium">{ALL_PARAMS_MAP[param]}</p>
            </button>
            {index < params.length - 1 && (
              <div className="border-b border-gray-400"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
 *    creates table to select which parameter will be sorted
 */
export function SortingSelection({
  sortingParameter,
  setParameter,
}: Readonly<{
  sortingParameter: keyof DiveWithoutProfiles;
  setParameter: SetState<keyof DiveWithoutProfiles>;
}>) {
  // display the parameter list
  return (
    <div className="overflow-y-auto flex-1">
      <div className="space-y-0">
        {params.map((param: keyof DiveWithoutProfiles, index: number) => (
          <div key={param}>
            <button
              className={`p-3 cursor-pointer transition-colors ${sortingParameter === param
                ? "bg-sky-200 hover:bg-sky-300"
                : "bg-gray-200 hover:bg-gray-300"
                }`}
              onClick={() => setParameter(param)}
            >
              {ALL_PARAMS_MAP[param]}
            </button>
            {index < params.length - 1 && (
              <div className="border-b border-gray-400"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchProperty({
  setFullTable,
  setPageNumber,
  setNumberOfPages,
  searchValue,
  setSearchValue,
}: Readonly<{
  setFullTable: SetState<DiveWithoutProfiles[]>;
  setPageNumber: SetState<number>;
  setNumberOfPages: SetState<number>;
  searchValue: string;
  setSearchValue: SetState<string>;
}>) {
  const { getWithToken } = useApi();

  const handleApply = async () => {
    const response = await getWithToken<PagedResult<DiveWithoutProfiles>>(
      `/v1/dives/search?query=${searchValue}`
    );
    const data = response.data;
    setFullTable(data.result);
    setPageNumber(1);
    setNumberOfPages(data.totalPages);
    setSearchValue("");
  };

  return (
    <div className="flex flex-1 min-h-0 h-full">
      <div className="p-4 w-full h-full flex">
        <div className="hidden lg:block lg:w-1/2 p-4 h-full">
          <h2 className="text-xl font-bold mb-4">Search Property</h2>
          <p className="text-gray-600">
            Enter input for dive search{" "}
            <i
              className="fa-solid fa-circle-info"
              title="Locate dives even with partial or imprecise input."
            ></i>
          </p>
        </div>
        <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:mr-4 h-full">
          <div className="flex flex-col min-h-0 lg:mr-4 h-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full border rounded p-2 mb-2"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button
              className="w-full bg-sky-400 hover:bg-sky-500 text-white font-semibold py-2 rounded"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 *    Creates the search bar, changeable between
 *        * Parameter selection
 *        * Filtering
 *        * Sorting
 */
function SearchBar({
  displayedItems,
  setItems,
  setFullTable,
  setPageNumber,
  setNumberOfPages,
  searchValue,
  setSearchValue,
}: Readonly<{
  displayedItems: (keyof DiveWithoutProfiles)[];
  setItems: SetState<(keyof DiveWithoutProfiles)[]>;
  setFullTable: SetState<DiveWithoutProfiles[]>;
  setPageNumber: SetState<number>;
  setNumberOfPages: SetState<number>;
  searchValue: string;
  setSearchValue: SetState<string>;
}>) {
  const options = [
    { id: "parameters", label: "Parameter Selection" },
    { id: "search", label: "Search Property" },
  ] as const;
  type OptionId = (typeof options)[number]["id"];

  // hook to distinguish between the three possible situations
  const [selectedOption, setSelectedOption] = useState<OptionId>("parameters");

  return (
    <article className="bg-white border-2 rounded-lg flex flex-col h-full overflow-hidden min-h-45 min-w-55">
      <header className="h-10 bg-sky-500 flex justify-center items-center border-b-2 shrink-0">
        <h1 className={`text-black text-[20px] font-bold`}>Search dives</h1>
      </header>
      <main className="overflow-y-auto flex flex-1">
        <div className="w-1/4 h-full border-r-2 border-gray-300 min-w-25">
          {options.map((option) => (
            <button
              key={option.id}
              className={`p-4 h-1/2 cursor-pointer transition-colors border-b border-gray-200 flex items-center ${selectedOption === option.id
                ? "bg-sky-200 hover:bg-sky-300"
                : "bg-white hover:bg-gray-100"
                }`}
              onClick={() => setSelectedOption(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="w-3/4 h-full overflow-hidden flex flex-col">
          {selectedOption === "parameters" && (
            <div className="flex flex-1 min-h-0 h-full">
              <div className="hidden lg:block lg:w-1/2 p-4 h-full">
                <h2 className="text-xl font-bold mb-4">Parameter Selection</h2>
                <p className="text-gray-600">
                  Select which parameters to display in your search results.
                </p>
              </div>
              <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:mr-4 h-full">
                <ParameterSelection
                  displayedItems={displayedItems}
                  setItems={setItems}
                />
              </div>
            </div>
          )}

          {selectedOption === "search" && (
            <SearchProperty
              setFullTable={setFullTable}
              setPageNumber={setPageNumber}
              setNumberOfPages={setNumberOfPages}
              searchValue={searchValue}
              setSearchValue={setSearchValue}
            />
          )}
        </div>
      </main>
    </article>
  );
}

/*
 *    creates the search and navigation bars
 */
export default function DiveSearch({
  page_nr,
  setPageNumber,
  numberOfPages,
  viewSelectedDives,
  toggleView,
  displayedItems,
  setItems,
  selectedDives,
  setFullTable,
  setNumberOfPages,
  searchValue,
  setSearchValue,
}: Readonly<{
  page_nr: number;
  setPageNumber: SetState<number>;
  numberOfPages: number;
  viewSelectedDives: boolean;
  toggleView: SetState<boolean>;
  displayedItems: (keyof DiveWithoutProfiles)[];
  setItems: SetState<(keyof DiveWithoutProfiles)[]>;
  selectedDives: DiveWithoutProfiles[];
  setFullTable: SetState<DiveWithoutProfiles[]>;
  setNumberOfPages: SetState<number>;
  searchValue: string;
  setSearchValue: SetState<string>;
}>) {
  return (
    <div className="flex h-full">
      <div className="w-1/2 lg:w-1/4 h-full ">
        <PageNavigation
          page_nr={page_nr}
          setPageNumber={setPageNumber}
          numberOfPages={numberOfPages}
          viewSelectedDives={viewSelectedDives}
          toggleView={toggleView}
          selectedDives={selectedDives}
          displayedItems={displayedItems}
        />
      </div>
      <div className="w-1/2 lg:w-3/4 h-full ml-2">
        <SearchBar
          displayedItems={displayedItems}
          setItems={setItems}
          setFullTable={setFullTable}
          setPageNumber={setPageNumber}
          setNumberOfPages={setNumberOfPages}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
      </div>
    </div>
  );
}
