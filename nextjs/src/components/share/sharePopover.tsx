"use client";

import useApi from "@/hooks/useApi";
import { PagedResult } from "@/types/dive";
import { Group, User } from "@/types/share";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CrossIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Popover from "@mui/material/Popover";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import AutocompleteInput from "../autocompleteInput";

// ---- Types ----
type View = "overview" | "add-person" | "add-group";

type Props = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  diveId: number | undefined;
};

// ---- Main component ----
export default function SharePopover({
  anchorEl,
  onClose,
  diveId,
}: Readonly<Props>) {
  const [view, setView] = useState<View>("overview");
  const [readers, setReaders] = useState<User[]>([]);
  const [groupReaders, setGroupReaders] = useState<Group[]>([]);

  const { getWithToken } = useApi();

  const open = Boolean(anchorEl);

  const fetchAllReaders = useCallback(async () => {
    if (diveId == null) return null;

    try {
      return await Promise.all([
        getWithToken<PagedResult<User>>(`/v1/dives/${diveId}/readers`),
        getWithToken<Group[]>(`/v1/dives/${diveId}/group-readers`),
      ]).then(([r, g]) => ({ readers: r.data, groups: g.data }));
    } catch (err: unknown) {
      console.log(err);
      return null;
    }
  }, [diveId, getWithToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchAllReaders();
      if (result == null) {
        return;
      }
      const { readers, groups } = result;
      if (cancelled) {
        return;
      }
      setReaders(readers.result);
      setGroupReaders(groups);
    })();
    return () => {
      cancelled = true;
    };
  }, [diveId, fetchAllReaders]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <div className="flex flex-col h-full min-h-0 max-h-70 w-70">
        {/* Header */}
        <div className="flex flex-none h-10 items-center gap-2 px-4 py-2 border-b">
          {view !== "overview" && (
            <IconButton size="small" onClick={() => setView("overview")}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <span className="font-medium text-sm">
            {view === "overview" && "Dive shared with"}
            {view === "add-person" && "Add person"}
            {view === "add-group" && "Add group"}
          </span>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {view === "overview" && (
            <Overview
              onAddPerson={() => setView("add-person")}
              onAddGroup={() => setView("add-group")}
              readers={readers}
              groupReaders={groupReaders}
              diveId={diveId}
              fetchAllReaders={fetchAllReaders}
            />
          )}

          {view === "add-person" && (
            <AddPerson diveId={diveId} fetchAllReaders={fetchAllReaders} />
          )}
          {view === "add-group" && (
            <AddGroup diveId={diveId} fetchAllReaders={fetchAllReaders} />
          )}
        </div>
      </div>
    </Popover>
  );
}

// ---- Overview ----
function Overview({
  onAddPerson,
  onAddGroup,
  diveId,
  readers,
  groupReaders,
  fetchAllReaders,
}: Readonly<{
  onAddPerson: () => void;
  onAddGroup: () => void;
  diveId: number | undefined;
  readers: User[];
  groupReaders: Group[];
  fetchAllReaders: () => void;
}>) {
  const { deleteWithToken } = useApi();

  async function deletePerson(id: number) {
    try {
      if (diveId == undefined) return;
      await deleteWithToken(`/v1/dives/${diveId}/readers`, [id], {});
      fetchAllReaders();
    } catch (err: unknown) {
      toast.error("failed to delete buddy");
      console.error(err);
      return false;
    }
  }
  async function deleteGroup(id: number | undefined) {
    try {
      if (diveId == undefined) return;
      await deleteWithToken(
        `/v1/dives/${diveId}/group-readers?groupId=${id}`,
        {},
        {}
      );
      fetchAllReaders();
    } catch (err: unknown) {
      toast.error("failed to delete group reader");
      console.error(err);
      return false;
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <Header title="People" onAdd={onAddPerson} />
        <List dense>
          {readers.map((p) => (
            <ListItem key={p.id} disablePadding>
              <div className="flex justify-between w-full">
                <ListItemText primary={p.name} />
                <IconButton size="small" onClick={() => deletePerson(p.id)}>
                  <CrossIcon fontSize="small" />
                </IconButton>
              </div>
            </ListItem>
          ))}
        </List>
      </section>

      <section>
        <Header title="Groups" onAdd={onAddGroup} />
        <List dense>
          {groupReaders.map((g) => (
            <ListItem key={g.id} disablePadding>
              <div className="flex justify-between w-full">
                <ListItemText primary={g.name} />
                <IconButton size="small" onClick={() => deleteGroup(g.id)}>
                  <CrossIcon fontSize="small" />
                </IconButton>
              </div>
            </ListItem>
          ))}
        </List>
      </section>
    </div>
  );
}

function Header({
  title,
  onAdd,
}: Readonly<{ title: string; onAdd: () => void }>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-gray-600">{title}</span>
      <IconButton size="small" onClick={onAdd}>
        <AddIcon fontSize="medium" />
      </IconButton>
    </div>
  );
}

// ---- Add person view ----
function AddPerson({
  diveId,
  fetchAllReaders,
}: Readonly<{ diveId: number | undefined; fetchAllReaders: () => void }>) {
  const { postWithToken } = useApi();

  async function handleSubmitAddPerson(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      if (diveId == undefined) return;
      const formData = new FormData(event.currentTarget);
      const diveBuddies = formData.getAll("diveBuddy") as string[];
      await postWithToken(
        `/v1/dives/${diveId}/readers`,
        diveBuddies,
        {},
        "application/json"
      );
      toast.success("successfully added dive buddy!");
      fetchAllReaders();
    } catch (err: unknown) {
      toast.error("failed add dive buddy");
      console.error(err);
    }
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmitAddPerson}>
      <AutocompleteInput
        suburl="user"
        label="enter username"
        name="diveBuddy"
        multiple={true}
      />
      <input
        type="submit"
        value="Add buddy"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200"
      />
    </form>
  );
}

// ---- Add group view  ----
function AddGroup({
  diveId,
  fetchAllReaders,
}: Readonly<{ diveId: number | undefined; fetchAllReaders: () => void }>) {
  const { postWithToken } = useApi();

  async function handleSubmitAddGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (diveId == undefined) return;
    try {
      const formData = new FormData(event.currentTarget);
      const diveGroup = formData.get("groupName") as string;
      await postWithToken(
        `/v1/dives/${diveId}/group-readers`,
        diveGroup,
        {},
        "application/json"
      );
      toast.success("successfully added groups!");
      fetchAllReaders();
    } catch (err: unknown) {
      toast.error("failed add group");
      console.error(err);
    }
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmitAddGroup}>
      <AutocompleteInput
        suburl="group"
        label="enter group name"
        name="groupName"
        multiple={false}
      />
      <input
        type="submit"
        value="Add groups"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200"
      />
    </form>
  );
}
