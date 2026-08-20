// components/TemplatePreview.tsx
import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Template } from '../types/template.types';

interface TemplatePreviewProps {
  open: boolean;
  template: Template | null;
  onClose: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ open, template, onClose }) => {
  if (!template) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Preview: {template.name}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <div className="space-y-4">
          {template.sections.map((section) => (
            <div key={section._id} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{section.name}</h3>
              {section.description && (
                <p className="text-gray-500 text-sm">{section.description}</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {section.dishIds.map((dishId) => (
                  <div key={dishId} className="bg-gray-50 p-2 rounded">
                    {/* Dish name would be fetched here */}
                    <span className="text-sm">Dish {dishId.slice(-4)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreview;