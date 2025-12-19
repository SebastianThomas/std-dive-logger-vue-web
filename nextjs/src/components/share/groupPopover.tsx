"use client";
import { Popover, TextField, Box, Button } from "@mui/material";
import { useState } from "react";
import AutocompleteInput from "../autocompleteInput";

type GroupPopoverProps = {
    anchorEl: HTMLButtonElement | null;
    onClose: () => void;
    onSubmit: (groupName: string) => Promise<Boolean>;
    label: string;
    type: "new" | "join";
};


export default function GroupPopover({
    anchorEl,
    onClose,
    onSubmit,
    label,
    type
}: GroupPopoverProps) {
    const open = Boolean(anchorEl);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const groupName = formData.get("groupName") as string;

        console.log(groupName);

        try {
            const res = await onSubmit(groupName);
            if (res) {
                onClose();
            }
        } catch (err: any) {
            console.error(err);
        }
    }

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            transformOrigin={{ vertical: "top", horizontal: "center" }}
        >
            <Box
                component="form"
                onSubmit={handleSubmit}
                p={2}
                width={300}
            >
                {type == "new" &&
                    <TextField
                        label={label}
                        name="groupName"
                        fullWidth
                        size="small"
                        autoFocus
                    />
                }
                {type == "join" &&
                    <AutocompleteInput
                        suburl="group"
                        label={label}
                        name="groupName"
                    />
                }
                <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        size="small"
                    >
                        {type == "new" ? "Create" : "Join"}
                    </Button>
                </Box>
            </Box>
        </Popover>
    );
}
