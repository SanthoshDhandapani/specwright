interface DeleteListDialogProps {
  listName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteListDialog({ listName, onConfirm, onCancel }: DeleteListDialogProps) {
  return (
    <div
      data-testid="delete-list-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-xl font-bold text-white">Delete List</h2>
        <p className="mb-6 text-gray-400">
          Are you sure you want to delete <strong className="text-white">{listName}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            data-testid="delete-list-cancel"
            onClick={onCancel}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            data-testid="delete-list-confirm"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
