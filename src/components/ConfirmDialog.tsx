import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
} from "@material-ui/core";
import Close from "@material-ui/icons/Close";

const ConfirmDialog = (props: {
  onClose: () => void;
  onConfirm: () => void;
  shown: boolean;
  text: string;
}) => {
  return (
    <Dialog open={props.shown} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm the action</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton>
          <Close />
        </IconButton>
      </Box>
      <DialogContent>
        <Typography>{props.text}</Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" variant="contained" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          color="secondary"
          variant="contained"
          onClick={() => {
            props.onConfirm();
            props.onClose();
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
