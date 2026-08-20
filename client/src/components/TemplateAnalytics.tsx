// pages/TemplateAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { templateService } from '../services/templateService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TemplateAnalytics: React.FC = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await templateService.getTemplates(1, 100);
      const sorted = response.data.templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);
      setTemplates(sorted);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Template Usage Analytics</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Most Used Templates</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={templates}>
            <XAxis dataKey="displayName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="usageCount" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TemplateAnalytics;