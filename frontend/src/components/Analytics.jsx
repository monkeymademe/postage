import { useState, useEffect } from 'react';
import api from '../utils/api';

const Analytics = ({ postId = null }) => {
  const [summary, setSummary] = useState([]);
  const [postAnalytics, setPostAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(postId);

  useEffect(() => {
    loadSummary();
    if (selectedPost) {
      loadPostAnalytics(selectedPost);
    }
  }, [selectedPost]);

  const loadSummary = async () => {
    try {
      const response = await api.get('/analytics/summary');
      setSummary(response.data.summary || []);
    } catch (error) {
      console.error('Error loading analytics summary:', error);
    }
  };

  const loadPostAnalytics = async (postId) => {
    try {
      const response = await api.get(`/analytics/post/${postId}`);
      setPostAnalytics(response.data.analytics || []);
    } catch (error) {
      console.error('Error loading post analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalClicks = summary.reduce((sum, item) => sum + parseInt(item.total_clicks || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Overview</h2>
        
        {summary.length === 0 ? (
          <p className="text-gray-500">No analytics data yet. Generate content with source URLs to start tracking.</p>
        ) : (
          <>
            <div className="mb-6">
              <div className="text-3xl font-bold text-blue-600">{totalClicks}</div>
              <div className="text-sm text-gray-500">Total Clicks</div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Clicks by Platform</h3>
              {summary.map((item) => {
                const clicks = parseInt(item.total_clicks || 0);
                const percentage = totalClicks > 0 ? (clicks / totalClicks * 100).toFixed(1) : 0;
                
                return (
                  <div key={item.platform} className="border-b border-gray-200 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-gray-900 capitalize">
                          {item.platform}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({item.post_count} {item.post_count === 1 ? 'post' : 'posts'})
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{clicks}</div>
                        <div className="text-xs text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedPost && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Post Analytics</h2>
          
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : postAnalytics.length === 0 ? (
            <p className="text-gray-500">No tracking data for this post yet.</p>
          ) : (
            <div className="space-y-4">
              {postAnalytics.map((item) => (
                <div key={item.short_code} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-gray-900 capitalize">{item.platform}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">{item.click_count}</div>
                      <div className="text-xs text-gray-500">clicks</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                    /t/{item.short_code}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
