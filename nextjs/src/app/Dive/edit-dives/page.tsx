"use client";

import { BasicLayout } from "@/app/helper/basic_layout";
import useApi from "@/hooks/useApi";
import "@fortawesome/fontawesome-free/css/all.css";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Dive, DiveWithoutProfiles } from '@/types/dive';
import SelectedDives from "./table-generation/selected-table";
import type { SetState } from '@/types/abbreviations';

function DeleteDivesButton({
  enterDeleteProcess,
  selectedDives

}: Readonly<{
  enterDeleteProcess: SetState<boolean>;
  selectedDives: DiveWithoutProfiles[];
}>) {
  return (
    <div>
      <div 
        className="flex p-4 sm:min-w-[250px] sm:max-w-[250px] md:min-w-[250px] md:max-w-[250px] text-2xl font-semibold bg-sky-400 border-2 border-black rounded-lg flex-col items-center justify-center cursor-pointer hover:bg-sky-500 transition-colors m-8" 
        onClick={() => {
          if(selectedDives.length !== 0) 
            enterDeleteProcess(true) 
          else 
            toast.error("Please select at least one dive");
        }}
      >
        <span>Permanently</span>
        <span>delete selected</span>
        <span>dives</span>
      </div>
    </div>
  );
}

function MergeDivesButton({
  selectedDives,
  setSelectedDives,
  setDiveSummaries
}: Readonly<{
  selectedDives: DiveWithoutProfiles[];
  setSelectedDives: SetState<DiveWithoutProfiles[]>;
  setDiveSummaries: SetState<DiveWithoutProfiles[]>;
}>) {
  const { postWithToken } = useApi();
  async function merge(selectedDives: DiveWithoutProfiles[], postWithToken: any) {
    if(selectedDives.length === 2) {
      // merge dives
      const diveId = selectedDives[0].id;
      const sndId = selectedDives[1].id;
      setDiveSummaries(prev =>
        prev.filter(r => r.id !== diveId && r.id !== sndId)
      );

      setSelectedDives([]);
      try {
        const response = await postWithToken(
          `/v1/dives/${diveId}/profiles/merge?toAddDiveId=${sndId}&keepToAddDive=${false}`,
          {
            id: sndId
          }
        );
        const data: Dive = response.data;
        const { profiles, ...rest } = data;
        setDiveSummaries(prev => [...prev, rest]);
        toast.success("Dives merged successfully");
      } catch (error) {
        toast.error('Failed to merge dives');
      }
    } else {
      toast.error('please select two dives to merge them');
    }
  }

  return (
    <>
      <div 
        className="flex p-4 sm:min-w-[250px] sm:max-w-[250px] md:min-w-[250px] md:max-w-[250px] text-2xl font-semibold bg-sky-400 border-2 border-black rounded-lg flex-col items-center justify-center cursor-pointer hover:bg-sky-500 transition-colors m-8" 
        onClick={() => merge(selectedDives, postWithToken)}
      >
        <span>Merge</span>
        <span>selected</span>
        <span>dives</span>
      </div>
    </>
  );
}

/*
 * landing page when trying to edit dives
 */
const Edit = () => {
  const [diveSummaries, setDiveSummaries] = useState<DiveWithoutProfiles[]>([]);
  const [displayedItems, setDisplayedItems] = useState<(keyof DiveWithoutProfiles)[]>(["id", "number", "customIdentifier"]);
  const { getWithToken } = useApi();
  const searchParams = useSearchParams();
  const [selectedDives, setSelectedDives] = useState<DiveWithoutProfiles[]>([]);
  const [ deleteProcess, enterDeleteProcess ] = useState(false);
  
  useEffect(() => {
    const items = searchParams.get('items');
    if (items) {
      setDisplayedItems(items.split(',') as (keyof DiveWithoutProfiles)[]);
    } else {
      toast.error('Using default displayed columns for the table');
    }
  }, [searchParams]);

  useEffect(() => {
    const dives = searchParams.get('dives');
    (async () => {
      if (dives) {
        const result = await getWithToken(`/v1/dives/ids?ids=${dives}`);
        setDiveSummaries(result.data);
      } else {
        toast.error('No dives selected');
      }
    })()
  }, [searchParams]);

  const { deleteWithToken } = useApi();
  const handleDelete = async () => {
    try{
      await Promise.all(selectedDives.map(dive => deleteWithToken(`/v1/dives/${dive.id}`)));
      setDiveSummaries(prev => prev.filter(dive => !selectedDives.some(d => dive.id === d.id)));
      setSelectedDives([]);
      toast.success("Selected dives successfully deleted");
    } catch (error) {
      toast.error("Failed to delete dives");
    }
  }

  // build the DOM
  return (
    <BasicLayout page_name="" requiresAuth={false}>
      <main className="bg-white">
        <div className="w-full h-screen">
          <div className="max-h-1/2 p-4 h-min-0">
            <SelectedDives
              displayedItems={displayedItems}
              diveSummaries={diveSummaries}
              selectedDives={selectedDives}
              setSelectedDives={setSelectedDives}
            />
          </div>
          <div className="p-4 flex flex-wrap p-4 w-full items-center justify-center">
            <MergeDivesButton
              selectedDives={selectedDives}
              setSelectedDives={setSelectedDives}
              setDiveSummaries={setDiveSummaries}
            />
            <DeleteDivesButton
              enterDeleteProcess={enterDeleteProcess}
              selectedDives={selectedDives}
            />
            {deleteProcess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">
                            Confirm Delete
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete dive{(selectedDives.length === 1) ? "" : "s"} {" "}
                            {selectedDives.map(d => `#${d.number}`).join(", ")}
                            ? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                                onClick={() => enterDeleteProcess(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                                onClick={() => {
                                    handleDelete();
                                    enterDeleteProcess(false);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </BasicLayout>
  );
}
export default Edit;