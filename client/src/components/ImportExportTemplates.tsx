// components/ImportExportTemplates.tsx
import React from 'react';
import { templateService } from '../services/templateService';
import * as XLSX from 'xlsx';

const ImportExportTemplates: React.FC = () => {
  const handleExport = async () => {
    try {
      const response = await templateService.getTemplates(1, 1000);
      const data = response.data.templates.map(t => ({
        Name: t.name,
        Description: t.description,
        Type: t.templateType,
        'Day of Week': t.dayOfWeek || 'N/A',
        Sections: t.sectionCount,
        Dishes: t.totalDishes,
        Active: t.isActive ? 'Yes' : 'No',
        Tags: t.tags.join(', '),
        Usage: t.usageCount
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Templates');
      XLSX.writeFile(wb, 'templates_export.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        // Process and import templates
        console.log('Importing templates:', jsonData);
      } catch (error) {
        console.error('Import failed:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={handleExport}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Export Templates
      </button>
      <label className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
        Import Templates
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImport}
          className="hidden"
        />
      </label>
    </div>
  );
};