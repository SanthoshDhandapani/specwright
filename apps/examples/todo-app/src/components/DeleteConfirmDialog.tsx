import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface DeleteConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  todoTitle?: string;
}

export default function DeleteConfirmDialog({
  open,
  onConfirm,
  onCancel,
  todoTitle,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      data-testid="dialog-confirm-delete"
      aria-labelledby="delete-dialog-title"
    >
      <DialogTitle id="delete-dialog-title">Delete Todo</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {todoTitle
            ? `Are you sure you want to delete "${todoTitle}"? This action cannot be undone.`
            : 'Are you sure you want to delete this todo? This action cannot be undone.'}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          data-testid="btn-cancel-delete"
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          data-testid="btn-confirm-delete"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
