// components/SectionManager.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragHandle as DragIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import type { Template, Dish, TemplateSection } from '../types/template.types';

interface SectionManagerProps {
  template: Template;
  availableDishes: Dish[];
  onAddSection: (sectionData: { name: string; description?: string; dishIds?: string[] }) => void | Promise<void>;
  onRemoveSection: (sectionId: string) => void | Promise<void>;
  onAddDish: (templateId: string, sectionId: string, dishId: string) => void | Promise<void>;
  onRemoveDish: (templateId: string, sectionId: string, dishId: string) => void | Promise<void>;
  onReorderSections: (templateId: string, sectionOrder: string[]) => void | Promise<void>;
}

const SectionManager: React.FC<SectionManagerProps> = ({
  template,
  availableDishes,
  onAddSection,
  onRemoveSection,
  onAddDish,
  onRemoveDish,
  onReorderSections,
}) => {
  const [isAddSectionOpen, setIsAddSectionOpen] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>('');
  const [newSectionDescription, setNewSectionDescription] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<TemplateSection | null>(null);
  const [isAddDishOpen, setIsAddDishOpen] = useState<boolean>(false);
  const [selectedDishId, setSelectedDishId] = useState<string>('');

  const handleAddSection = (): void => {
    if (newSectionName.trim()) {
      onAddSection({
        name: newSectionName.trim(),
        description: newSectionDescription.trim(),
      });
      setNewSectionName('');
      setNewSectionDescription('');
      setIsAddSectionOpen(false);
    }
  };

  const handleAddDish = (): void => {
    if (selectedDishId && selectedSection) {
      onAddDish(template._id, selectedSection._id, selectedDishId);
      setSelectedDishId('');
      setIsAddDishOpen(false);
    }
  };

  const handleDragEnd = (result: DropResult): void => {
    if (!result.destination) return;

    const items = Array.from(template.sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const sectionOrder = items.map((section) => section._id);
    onReorderSections(template._id, sectionOrder);
  };

  const getDishById = (dishId: string): Dish | undefined => {
    return availableDishes.find((d) => d._id === dishId);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {template.sections.length} Sections • {template.totalDishes} Total Dishes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsAddSectionOpen(true)}
        >
          Add Section
        </Button>
      </Box>

      {/* Sections List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <Box {...provided.droppableProps} ref={provided.innerRef}>
              {template.sections.map((section, index) => (
                <Draggable key={section._id} draggableId={section._id} index={index}>
                  {(provided) => (
                    <Paper
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{ mb: 2, p: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box {...provided.dragHandleProps}>
                          <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {section.name}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({section.dishIds.length} dishes)
                          </Typography>
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.isVisible}
                              onChange={() => {
                                console.log('Toggle visibility for section:', section._id);
                              }}
                              size="small"
                            />
                          }
                          label={section.isVisible ? 'Visible' : 'Hidden'}
                          labelPlacement="start"
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedSection(section);
                            setIsAddDishOpen(true);
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveSection(section._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      {section.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {section.description}
                        </Typography>
                      )}

                      {/* Dishes in section */}
                      {section.dishIds.length > 0 ? (
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            margin: -0.5,
                          }}
                        >
                          {section.dishIds.map((dishId) => {
                            const dish = getDishById(dishId);
                            return dish ? (
                              <Box
                                key={dishId}
                                sx={{
                                  padding: 0.5,
                                  flex: '1 1 calc(33.333% - 8px)',
                                  minWidth: '180px',
                                  maxWidth: '100%',
                                }}
                              >
                                <Card 
                                  variant="outlined"
                                  sx={{ 
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                  }}
                                >
                                  <CardContent sx={{ py: 1, flex: 1 }}>
                                    <Typography variant="body2" noWrap>
                                      {dish.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {dish.price ? `$${dish.price}` : 'Price not set'}
                                    </Typography>
                                  </CardContent>
                                  <CardActions sx={{ py: 0, px: 1, justifyContent: 'flex-end' }}>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => onRemoveDish(template._id, section._id, dishId)}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </CardActions>
                                </Card>
                              </Box>
                            ) : null;
                          })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No dishes in this section
                        </Typography>
                      )}
                    </Paper>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add Section Dialog */}
      <Dialog open={isAddSectionOpen} onClose={() => setIsAddSectionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Section</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Section Name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            margin="normal"
            placeholder="e.g., Appetizers, Main Course, Desserts"
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={newSectionDescription}
            onChange={(e) => setNewSectionDescription(e.target.value)}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddSectionOpen(false)}>Cancel</Button>
          <Button onClick={handleAddSection} variant="contained" disabled={!newSectionName.trim()}>
            Add Section
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dish Dialog */}
      <Dialog open={isAddDishOpen} onClose={() => setIsAddDishOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Dish to {selectedSection?.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={availableDishes}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Dish"
                margin="normal"
                fullWidth
              />
            )}
            onChange={(_, value) => setSelectedDishId(value?._id || '')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDishOpen(false)}>Cancel</Button>
          <Button onClick={handleAddDish} variant="contained" disabled={!selectedDishId}>
            Add Dish
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SectionManager;