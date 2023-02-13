import React from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

// Simple dialog that can be used to prompt the user before committing action.
const ConfirmationDialog = ({
  open,
  handleConfirm,
  handleAbort,
  titleName,
  contentDescription,
  cancel,
  confirm,
  defaultChoice = "cancel",
}) => {
  const renderDialogActions = () => {
    return defaultChoice === "confirm" ? (
      <DialogActions>
        <Button onClick={handleAbort}>{cancel}</Button>
        <Button onClick={handleConfirm} variant="contained">
          {confirm}
        </Button>
      </DialogActions>
    ) : (
      <DialogActions>
        <Button onClick={handleConfirm}>{confirm}</Button>
        <Button onClick={handleAbort} variant="contained">
          {cancel}
        </Button>
      </DialogActions>
    );
  };

  return createPortal(
    <Dialog
      open={open}
      onClose={handleAbort}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <DialogTitle>{titleName}</DialogTitle>
      <DialogContent>
        <Typography>{contentDescription}</Typography>
      </DialogContent>
      {renderDialogActions()}
    </Dialog>,
    document.getElementById("map")
  );
};

export default ConfirmationDialog;
