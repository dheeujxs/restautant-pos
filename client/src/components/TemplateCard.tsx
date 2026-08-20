// components/TemplateCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  ViewList as SectionsIcon,
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { Template, TemplateType } from '../types/template.types';

interface TemplateCardProps {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onManageSections: () => void;
  onToggleActive: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onManageSections,
  onToggleActive,
}) => {
  const getTypeColor = (type: TemplateType): 'primary' | 'secondary' | 'warning' | 'success' | 'default' => {
    switch (type) {
      case 'daily':
        return 'primary';
      case 'weekly':
        return 'secondary';
      case 'special':
        return 'warning';
      case 'seasonal':
        return 'success';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'daily':
        return <CalendarIcon fontSize="small" />;
      case 'weekly':
        return <CalendarIcon fontSize="small" />;
      default:
        return <CategoryIcon fontSize="small" />;
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {template.name}
          </Typography>
          <FormControlLabel
            control={<Switch checked={template.isActive} onChange={onToggleActive} size="small" />}
            label={template.isActive ? 'Active' : 'Inactive'}
            labelPlacement="top"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={getTypeIcon(template.templateType)}
            label={template.templateType.charAt(0).toUpperCase() + template.templateType.slice(1)}
            size="small"
            color={getTypeColor(template.templateType)}
          />
          {template.isDefault && <Chip label="Default" size="small" color="info" />}
          {template.dayOfWeek && <Chip label={template.dayOfWeek} size="small" variant="outlined" />}
        </Box>

        {template.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {template.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>{template.sectionCount}</strong> Sections
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>{template.totalDishes}</strong> Total Dishes
          </Typography>
          {template.usageCount > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Used <strong>{template.usageCount}</strong> times
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            {template.tags && template.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {template.tags.slice(0, 3).map((tag: string, index: number) => (
                  <Chip key={index} label={tag} size="small" variant="outlined" />
                ))}
                {template.tags.length > 3 && (
                  <Chip label={`+${template.tags.length - 3}`} size="small" />
                )}
              </Box>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Updated {formatDistanceToNow(new Date(template.updatedAt))} ago
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
        <Box>
          <Tooltip title="Manage Sections">
            <IconButton size="small" onClick={onManageSections}>
              <SectionsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate">
            <IconButton size="small" onClick={onDuplicate}>
              <DuplicateIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

export default TemplateCard;