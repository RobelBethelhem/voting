import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, List, ListItem, ListItemText, IconButton, Dialog, DialogContent, DialogTitle, CircularProgress, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Document, Page, pdfjs } from 'react-pdf';


// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const SortableItem = ({ id, children, onPreview }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      <ListItem
        secondaryAction={children.props.secondaryAction}
      >
        <IconButton {...attributes} {...listeners}>
          <DragIndicatorIcon />
        </IconButton>
        <ListItemText
          primary={children.props.children[1].props.primary}
          secondary={children.props.children[1].props.secondary}
          onClick={onPreview}
          sx={{ cursor: 'pointer' }}
        />
      </ListItem>
    </div>
  );
}

const FileUploadCell = ({ value, onChange, multiple = false }) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDrop = useCallback((acceptedFiles) => {
    onChange(multiple ? [...value, ...acceptedFiles] : acceptedFiles);
  }, [onChange, value, multiple]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, multiple });

  const removeFile = (fileToRemove) => {
    onChange(value.filter(file => file !== fileToRemove));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      onChange((items) => {
        const oldIndex = items.findIndex(item => item.name === active.id);
        const newIndex = items.findIndex(item => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePreview = (file) => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setPreviewFile(file);
      setPreviewOpen(true);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setNumPages(null);
    setPageNumber(1);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('Failed to load PDF:', error);
    setLoading(false);
  };

  useEffect(() => {
    if (previewFile) {
      setLoading(true);
    }
  }, [previewFile]);

  const renderPreview = () => {
    if (!previewFile || !fileUrl) return null;

    if (previewFile.type.startsWith('image/')) {
      return (
        <img 
          src={fileUrl} 
          alt="Preview" 
          style={{ maxWidth: '100%', maxHeight: '80vh' }} 
          onLoad={() => setLoading(false)}
        />
      );
    } else if (previewFile.type === 'application/pdf') {
      return (
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          <Page pageNumber={pageNumber} />
        </Document>
      );
    }
    setLoading(false);
    return <Typography>Preview not available for this file type.</Typography>;
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  return (
    <Box>
      <Box {...getRootProps()} sx={{ border: '1px dashed grey', p: 2, textAlign: 'center' }}>
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, mb: 1 }} />
        <Typography>Drag 'n' drop some files here, or click to select files</Typography>
      </Box>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.map(file => file.name)} strategy={verticalListSortingStrategy}>
          <List>
            {value.map((file) => (
              <SortableItem key={file.name} id={file.name} onPreview={() => handlePreview(file)}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => removeFile(file)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <IconButton>
                    <DragIndicatorIcon />
                  </IconButton>
                  <ListItemText
                    primary={file.name}
                    secondary={`${file.size} bytes`}
                  />
                </ListItem>
              </SortableItem>
            ))}
          </List>
        </SortableContext>
      </DndContext>
      <Dialog open={previewOpen} onClose={closePreview} maxWidth="lg" fullWidth>
        <DialogTitle>{previewFile?.name}</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
            </Box>
          ) : (
            renderPreview()
          )}
          {previewFile && previewFile.type === 'application/pdf' && numPages && (
            <Box mt={2} display="flex" justifyContent="center" alignItems="center">
              <Button disabled={pageNumber <= 1} onClick={() => changePage(-1)}>
                Previous
              </Button>
              <Typography>
                Page {pageNumber} of {numPages}
              </Typography>
              <Button disabled={pageNumber >= numPages} onClick={() => changePage(1)}>
                Next
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FileUploadCell;