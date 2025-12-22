import { Button, Menu, MenuItem } from "@mui/material";
import { useState } from "react";

const ROLES = ["ADMIN", "MEMBER"];

type Props = {
  userId: number;
  currentRole: string;
  changeRole: (userId: number, role: string) => void;
  disabled: boolean
};

export function RoleMenu({ userId, currentRole, changeRole, disabled }: Readonly<Props>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectRole = (role: string) => {
    changeRole(userId, role);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleOpen} disabled={disabled}>
        {currentRole}
        <i
          className="fa-solid fa-chevron-down ml-2"
        ></i>
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {ROLES.map(role => (
          <MenuItem
            key={role}
            selected={role === currentRole}
            onClick={() => handleSelectRole(role)}
          >
            {role}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
