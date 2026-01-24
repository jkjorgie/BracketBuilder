'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Competitor {
  id: string;
  name: string;
  description: string;
  seed: number | null;
  isEliminated: boolean;
}

interface Matchup {
  id: string;
  matchupIndex: number;
  competitor1: Competitor | null;
  competitor2: Competitor | null;
  winner: Competitor | null;
  competitor1Votes: number;
  competitor2Votes: number;
  _count?: { votes: number };
}

interface Round {
  id: string;
  roundNumber: number;
  name: string;
  isActive: boolean;
  isComplete: boolean;
  startDate: string | null;
  endDate: string | null;
  matchups: Matchup[];
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isDemo: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  currentRound: number;
  competitors: Competitor[];
  rounds: Round[];
  _count: { votes: number };
}

interface VoteSource {
  id: string;
  code: string;
  name: string;
  description: string | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
}

type Tab = 'campaigns' | 'rounds' | 'matchups' | 'competitors' | 'sources' | 'submissions';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [voteSources, setVoteSources] = useState<VoteSource[]>([]);
  const [submissions, setSubmissions] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Use ref to track selected campaign ID without causing re-renders
  const selectedCampaignIdRef = useRef<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedCampaignIdRef.current = selectedCampaign?.id || null;
  }, [selectedCampaign]);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
        
        // Update the selected campaign with fresh data using ref
        const currentSelectedId = selectedCampaignIdRef.current;
        if (currentSelectedId) {
          const updated = data.campaigns.find((c: Campaign) => c.id === currentSelectedId);
          if (updated) {
            setSelectedCampaign(updated);
          }
        } else if (data.campaigns.length > 0) {
          setSelectedCampaign(data.campaigns[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setDataLoading(false);
    }
  }, []); // No dependencies - uses ref instead

  const fetchVoteSources = useCallback(async (campaignId?: string) => {
    try {
      const url = campaignId 
        ? `/api/admin/vote-sources?campaignId=${campaignId}`
        : '/api/admin/vote-sources';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVoteSources(data.sources);
      }
    } catch (error) {
      console.error('Failed to fetch vote sources:', error);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/admin/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Initial data fetch - only runs once when user is set
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCampaigns();
      fetchVoteSources();
    }
  }, [user, fetchCampaigns, fetchVoteSources]);

  // Fetch submissions when tab is opened
  useEffect(() => {
    if (user && activeTab === 'submissions' && !submissions) {
      fetchSubmissions();
    }
  }, [user, activeTab, submissions, fetchSubmissions]);

  // Refetch vote sources when campaign changes or sources tab is selected
  useEffect(() => {
    if (user && activeTab === 'sources' && selectedCampaign) {
      fetchVoteSources(selectedCampaign.id);
    }
  }, [user, activeTab, selectedCampaign, fetchVoteSources]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('An error occurred. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setCampaigns([]);
      setSelectedCampaign(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleCampaignActive = async (campaign: Campaign) => {
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id, isActive: !campaign.isActive }),
      });

      if (res.ok) {
        showMessage('success', `Campaign ${!campaign.isActive ? 'activated' : 'deactivated'}`);
        await fetchCampaigns();
      } else {
        showMessage('error', 'Failed to update campaign');
      }
    } catch {
      showMessage('error', 'Failed to update campaign');
    }
  };

  const handleToggleRoundActive = async (round: Round) => {
    if (!selectedCampaign) return;

    try {
      const res = await fetch('/api/admin/activate-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignSlug: selectedCampaign.slug,
          roundNumber: round.roundNumber,
          active: !round.isActive,
        }),
      });

      if (res.ok) {
        showMessage('success', `Round ${!round.isActive ? 'activated' : 'deactivated'}`);
        await fetchCampaigns();
      } else {
        showMessage('error', 'Failed to update round');
      }
    } catch {
      showMessage('error', 'Failed to update round');
    }
  };

  const handleUpdateRound = async (roundId: string, updates: Partial<Round>) => {
    try {
      const res = await fetch('/api/admin/rounds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roundId, ...updates }),
      });

      if (res.ok) {
        showMessage('success', 'Round updated');
        await fetchCampaigns();
      } else {
        showMessage('error', 'Failed to update round');
      }
    } catch {
      showMessage('error', 'Failed to update round');
    }
  };

  const handleSetWinner = async (matchupId: string, winnerId: string) => {
    try {
      const res = await fetch('/api/admin/matchups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchupId, winnerId }),
      });

      if (res.ok) {
        showMessage('success', 'Winner declared! Loser eliminated and winner advanced.');
        await fetchCampaigns();
      } else {
        showMessage('error', 'Failed to set winner');
      }
    } catch {
      showMessage('error', 'Failed to set winner');
    }
  };

  const handleAutoAdvanceRound = async (roundId: string) => {
    try {
      const res = await fetch('/api/admin/matchups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });

      if (res.ok) {
        showMessage('success', 'Round completed - winners advanced!');
        await fetchCampaigns();
      } else {
        showMessage('error', 'Failed to auto-advance round');
      }
    } catch {
      showMessage('error', 'Failed to auto-advance round');
    }
  };

  const handleToggleVoteSource = async (source: VoteSource) => {
    try {
      const res = await fetch('/api/admin/vote-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: source.id, isActive: !source.isActive }),
      });

      if (res.ok) {
        showMessage('success', `Vote source ${!source.isActive ? 'enabled' : 'disabled'}`);
        await fetchVoteSources();
      } else {
        showMessage('error', 'Failed to update vote source');
      }
    } catch {
      showMessage('error', 'Failed to update vote source');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#00B2E3] text-xl">Loading...</div>
      </div>
    );
  }

  // Login form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
              <p className="text-gray-400">GT eForms Feature Face Off</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9E18] focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9E18] focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              {loginError && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-[#FF9E18] hover:bg-[#e88f15] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">Feature Face Off Management</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm">
                {user.name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {[
              { id: 'campaigns', label: '📋 Campaigns' },
              { id: 'rounds', label: '📅 Rounds' },
              { id: 'matchups', label: '⚔️ Matchups' },
              { id: 'competitors', label: '👥 Competitors' },
              { id: 'sources', label: '🔗 Vote Sources' },
              { id: 'submissions', label: '📊 Submissions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#FF9E18] border-b-2 border-[#FF9E18]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#FF9E18] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        ) : (
          <>
            {/* Campaigns Tab */}
            {activeTab === 'campaigns' && (
              <CampaignsTab
                campaigns={campaigns}
                selectedCampaign={selectedCampaign}
                onSelectCampaign={setSelectedCampaign}
                onToggleActive={handleToggleCampaignActive}
                onRefresh={fetchCampaigns}
              />
            )}

            {/* Rounds Tab */}
            {activeTab === 'rounds' && selectedCampaign && (
              <RoundsTab
                campaign={selectedCampaign}
                onToggleActive={handleToggleRoundActive}
                onUpdateRound={handleUpdateRound}
                onAutoAdvance={handleAutoAdvanceRound}
              />
            )}

            {/* Matchups Tab */}
            {activeTab === 'matchups' && selectedCampaign && (
              <MatchupsTab
                campaign={selectedCampaign}
                onSetWinner={handleSetWinner}
              />
            )}

            {/* Competitors Tab */}
            {activeTab === 'competitors' && selectedCampaign && (
              <CompetitorsTab
                campaign={selectedCampaign}
                onRefresh={fetchCampaigns}
                showMessage={showMessage}
              />
            )}

            {/* Vote Sources Tab */}
            {activeTab === 'sources' && (
              <VoteSourcesTab
                sources={voteSources}
                selectedCampaign={selectedCampaign}
                onToggle={handleToggleVoteSource}
                onRefresh={() => fetchVoteSources(selectedCampaign?.id)}
                showMessage={showMessage}
              />
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <SubmissionsTab
                submissions={submissions}
                onRefresh={fetchSubmissions}
              />
            )}

            {(activeTab === 'rounds' || activeTab === 'matchups' || activeTab === 'competitors') && !selectedCampaign && (
              <div className="text-center py-12">
                <p className="text-gray-400">Select a campaign first from the Campaigns tab</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Campaigns Tab Component
function CampaignsTab({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  onToggleActive,
  onRefresh,
}: {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelectCampaign: (c: Campaign) => void;
  onToggleActive: (c: Campaign) => void;
  onRefresh: () => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isDemo: false,
    startDate: '',
    endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '', isDemo: false, startDate: '', endDate: '' });
    setShowCreateForm(false);
    setEditingCampaign(null);
    setError('');
  };

  const handleEdit = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description || '',
      isDemo: campaign.isDemo,
      startDate: campaign.startDate ? campaign.startDate.slice(0, 16) : '',
      endDate: campaign.endDate ? campaign.endDate.slice(0, 16) : '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${campaign.name}"? This will delete all associated data.`)) return;
    
    try {
      const res = await fetch(`/api/campaigns/${campaign.slug}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete campaign');
      }
    } catch {
      alert('Failed to delete campaign');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingCampaign 
        ? `/api/campaigns/${editingCampaign.slug}`
        : '/api/admin/campaigns';
      const method = editingCampaign ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
        }),
      });

      if (res.ok) {
        resetForm();
        onRefresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save campaign');
      }
    } catch {
      setError('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">All Campaigns</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowCreateForm(true); }}
            className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium"
          >
            + New Campaign
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={resetForm}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug (URL-friendly)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  required
                  disabled={!!editingCampaign}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDemo}
                  onChange={(e) => setFormData({ ...formData, isDemo: e.target.checked })}
                  className="rounded bg-gray-700 border-gray-600"
                />
                <span className="text-sm text-gray-300">Demo campaign</span>
              </label>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingCampaign ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className={`bg-gray-800 rounded-xl p-6 border transition-colors cursor-pointer ${
              selectedCampaign?.id === campaign.id
                ? 'border-[#FF9E18]'
                : 'border-gray-700 hover:border-gray-600'
            }`}
            onClick={() => onSelectCampaign(campaign)}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  {campaign.isActive && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      Active
                    </span>
                  )}
                  {campaign.isDemo && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-3">{campaign.description}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span>📎 Slug: <code className="text-gray-300">{campaign.slug}</code></span>
                  <span>🗳️ Votes: {campaign._count.votes}</span>
                  <span>👥 Competitors: {campaign.competitors.length}</span>
                  <span>📅 Rounds: {campaign.rounds.length}</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  🔗 URL: <code className="text-[#00B2E3]">/{campaign.slug}</code>
                </p>
                {campaign.startDate && campaign.endDate && (
                  <p className="text-gray-500 text-sm mt-1">
                    📆 {formatDate(campaign.startDate)} → {formatDate(campaign.endDate)}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => handleEdit(campaign, e)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleActive(campaign);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    campaign.isActive
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {campaign.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={(e) => handleDelete(campaign, e)}
                  className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No campaigns found. Click &quot;New Campaign&quot; to create one.
          </div>
        )}
      </div>
    </div>
  );
}

// Rounds Tab Component
function RoundsTab({
  campaign,
  onToggleActive,
  onUpdateRound,
  onAutoAdvance,
}: {
  campaign: Campaign;
  onToggleActive: (r: Round) => void;
  onUpdateRound: (id: string, updates: Partial<Round>) => void;
  onAutoAdvance: (roundId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Rounds for: {campaign.name}</h2>
          <p className="text-gray-400 text-sm">Manage round activation and progression</p>
        </div>
      </div>

      <div className="space-y-4">
        {campaign.rounds.map((round) => (
          <div
            key={round.id}
            className={`bg-gray-800 rounded-xl p-6 border ${
              round.isActive
                ? 'border-[#FF9E18]'
                : round.isComplete
                ? 'border-green-500'
                : 'border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded-full text-white font-bold">
                    {round.roundNumber}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{round.name}</h3>
                  {round.isActive && (
                    <span className="px-2 py-0.5 bg-[#FF9E18]/20 text-[#FF9E18] text-xs rounded-full animate-pulse">
                      🔴 LIVE
                    </span>
                  )}
                  {round.isComplete && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      ✓ Complete
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                  <span>⚔️ {round.matchups.length} matchup{round.matchups.length !== 1 ? 's' : ''}</span>
                  <span>
                    📊 Votes: {round.matchups.reduce((sum, m) => sum + m.competitor1Votes + m.competitor2Votes, 0)}
                  </span>
                </div>

                {/* Date inputs */}
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="datetime-local"
                      value={round.startDate ? round.startDate.slice(0, 16) : ''}
                      onChange={(e) => onUpdateRound(round.id, { startDate: e.target.value || null })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="datetime-local"
                      value={round.endDate ? round.endDate.slice(0, 16) : ''}
                      onChange={(e) => onUpdateRound(round.id, { endDate: e.target.value || null })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => onToggleActive(round)}
                  disabled={round.isComplete}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    round.isActive
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-[#FF9E18] text-white hover:bg-[#e88f15]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {round.isActive ? '⏸ Pause' : '▶️ Activate'}
                </button>

                {round.isActive && !round.isComplete && (
                  <button
                    onClick={() => onAutoAdvance(round.id)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
                  >
                    🏆 End Round
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Matchups Tab Component
function MatchupsTab({
  campaign,
  onSetWinner,
}: {
  campaign: Campaign;
  onSetWinner: (matchupId: string, winnerId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Matchups for: {campaign.name}</h2>
        <p className="text-gray-400 text-sm">View votes and manually set winners</p>
      </div>

      {/* Instructions Banner */}
      <div className="bg-[#FF9E18]/10 border border-[#FF9E18]/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">👆</span>
          <div>
            <h4 className="font-semibold text-[#FF9E18]">How to Declare a Winner</h4>
            <p className="text-gray-300 text-sm">
              Click on a competitor&apos;s card to <strong>immediately declare them the winner</strong>. 
              This will eliminate the opponent and advance the winner to the next round. 
              <span className="text-yellow-400"> This action cannot be undone!</span>
            </p>
          </div>
        </div>
      </div>

      {campaign.rounds.map((round) => (
        <div key={round.id} className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            Round {round.roundNumber}: {round.name}
            {round.isActive && (
              <span className="px-2 py-0.5 bg-[#FF9E18]/20 text-[#FF9E18] text-xs rounded-full">
                Active
              </span>
            )}
            {round.isComplete && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                Complete
              </span>
            )}
          </h3>

          <div className="grid gap-4">
            {round.matchups.map((matchup) => (
              <div
                key={matchup.id}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                {/* Matchup status indicator */}
                {!matchup.winner && matchup.competitor1 && matchup.competitor2 && (
                  <div className="text-center text-xs text-yellow-400 mb-3 flex items-center justify-center gap-2">
                    <span className="animate-pulse">●</span>
                    Click a competitor below to declare them the winner
                  </div>
                )}
                {matchup.winner && (
                  <div className="text-center text-xs text-green-400 mb-3 flex items-center justify-center gap-2">
                    <span>✓</span>
                    Winner decided
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  {/* Competitor 1 */}
                  <div className="flex-1">
                    <button
                      onClick={() => matchup.competitor1 && !matchup.winner && onSetWinner(matchup.id, matchup.competitor1.id)}
                      disabled={!!matchup.winner || !matchup.competitor1}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        matchup.winner?.id === matchup.competitor1?.id
                          ? 'bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20'
                          : matchup.winner
                          ? 'bg-gray-700/50 border-2 border-transparent opacity-50'
                          : 'bg-gray-700 hover:bg-[#FF9E18]/20 hover:border-[#FF9E18] border-2 border-gray-600 cursor-pointer hover:scale-[1.02]'
                      } disabled:cursor-not-allowed transition-transform`}
                      title={!matchup.winner && matchup.competitor1 ? `Click to declare ${matchup.competitor1.name} as winner` : ''}
                    >
                      {matchup.competitor1 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#00B2E3]">#{matchup.competitor1.seed}</span>
                            <span className="font-semibold text-white">{matchup.competitor1.name}</span>
                            {matchup.winner?.id === matchup.competitor1.id && (
                              <span className="text-green-400">🏆</span>
                            )}
                          </div>
                          <div className="text-2xl font-bold text-[#FF9E18]">
                            {matchup.competitor1Votes} <span className="text-sm text-gray-400">votes</span>
                          </div>
                          {!matchup.winner && (
                            <div className="text-xs text-gray-500 mt-2">
                              Click to declare winner →
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">TBD</span>
                      )}
                    </button>
                  </div>

                  {/* VS */}
                  <div className="text-gray-500 font-bold text-lg px-2">VS</div>

                  {/* Competitor 2 */}
                  <div className="flex-1">
                    <button
                      onClick={() => matchup.competitor2 && !matchup.winner && onSetWinner(matchup.id, matchup.competitor2.id)}
                      disabled={!!matchup.winner || !matchup.competitor2}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        matchup.winner?.id === matchup.competitor2?.id
                          ? 'bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20'
                          : matchup.winner
                          ? 'bg-gray-700/50 border-2 border-transparent opacity-50'
                          : 'bg-gray-700 hover:bg-[#FF9E18]/20 hover:border-[#FF9E18] border-2 border-gray-600 cursor-pointer hover:scale-[1.02]'
                      } disabled:cursor-not-allowed transition-transform`}
                      title={!matchup.winner && matchup.competitor2 ? `Click to declare ${matchup.competitor2.name} as winner` : ''}
                    >
                      {matchup.competitor2 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#00B2E3]">#{matchup.competitor2.seed}</span>
                            <span className="font-semibold text-white">{matchup.competitor2.name}</span>
                            {matchup.winner?.id === matchup.competitor2.id && (
                              <span className="text-green-400">🏆</span>
                            )}
                          </div>
                          <div className="text-2xl font-bold text-[#FF9E18]">
                            {matchup.competitor2Votes} <span className="text-sm text-gray-400">votes</span>
                          </div>
                          {!matchup.winner && (
                            <div className="text-xs text-gray-500 mt-2">
                              ← Click to declare winner
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">TBD</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Vote Sources Tab Component
function VoteSourcesTab({
  sources,
  selectedCampaign,
  onToggle,
  onRefresh,
  showMessage,
}: {
  sources: VoteSource[];
  selectedCampaign: Campaign | null;
  onToggle: (source: VoteSource) => void;
  onRefresh: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VoteSource | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    validFrom: '',
    validUntil: '',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '', validFrom: '', validUntil: '' });
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (source: VoteSource) => {
    setEditing(source);
    setFormData({
      code: source.code,
      name: source.name,
      description: source.description || '',
      validFrom: source.validFrom ? source.validFrom.slice(0, 16) : '',
      validUntil: source.validUntil ? source.validUntil.slice(0, 16) : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (source: VoteSource) => {
    if (!confirm(`Delete vote source "${source.name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/vote-sources?id=${source.id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('success', 'Vote source deleted');
        onRefresh();
      } else {
        showMessage('error', 'Failed to delete vote source');
      }
    } catch {
      showMessage('error', 'Failed to delete vote source');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    
    setSaving(true);

    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing 
        ? { id: editing.id, ...formData }
        : { ...formData, campaignId: selectedCampaign.id };
      
      const res = await fetch('/api/admin/vote-sources', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
        }),
      });

      if (res.ok) {
        showMessage('success', `Vote source ${editing ? 'updated' : 'created'}`);
        resetForm();
        onRefresh();
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save');
      }
    } catch {
      showMessage('error', 'Failed to save vote source');
    } finally {
      setSaving(false);
    }
  };

  // Show message if no campaign selected
  if (!selectedCampaign) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-700 rounded-full mb-4">
          <span className="text-2xl">🔗</span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Select a Campaign</h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Vote sources are campaign-specific. Please select a campaign from the Campaigns tab first to manage its vote sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Vote Sources for: {selectedCampaign.name}</h2>
          <p className="text-gray-400 text-sm">Manage voting link sources for this campaign</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium"
          >
            + New Source
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={resetForm}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editing ? 'Edit Vote Source' : 'Create Vote Source'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Code (URL parameter)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  required
                  disabled={!!editing}
                  placeholder="booth-day1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  required
                  placeholder="Booth Day 1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid From</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="pb-3 text-gray-400 font-medium text-sm">Code</th>
              <th className="pb-3 text-gray-400 font-medium text-sm">Name</th>
              <th className="pb-3 text-gray-400 font-medium text-sm">Valid Period</th>
              <th className="pb-3 text-gray-400 font-medium text-sm">Status</th>
              <th className="pb-3 text-gray-400 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sources.map((source) => (
              <tr key={source.id}>
                <td className="py-3">
                  <code className="text-[#00B2E3] bg-gray-800 px-2 py-1 rounded text-sm">
                    {source.code}
                  </code>
                </td>
                <td className="py-3 text-white">{source.name}</td>
                <td className="py-3 text-gray-400 text-sm">
                  {source.validFrom && source.validUntil ? (
                    <>
                      {formatDate(source.validFrom)} - {formatDate(source.validUntil)}
                    </>
                  ) : (
                    'Always valid'
                  )}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    source.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {source.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(source)}
                      className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onToggle(source)}
                      className={`px-3 py-1 rounded text-sm ${
                        source.isActive
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {source.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDelete(source)}
                      className="px-3 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* URL Reference */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📋 Quick Reference - Vote URLs</h3>
        <p className="text-gray-400 text-sm mb-4">Vote URLs for {selectedCampaign.name}:</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-sm">
          {sources.filter((s) => s.isActive).map((source) => (
            <div key={source.id} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${source.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
              <code className="text-gray-300">/{selectedCampaign.slug}/vote?source={source.code}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Competitors Tab Component
function CompetitorsTab({
  campaign,
  onRefresh,
  showMessage,
}: {
  campaign: Campaign;
  onRefresh: () => void;
  showMessage: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    seed: '',
    imageUrl: '',
  });
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', description: '', seed: '', imageUrl: '' });
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (competitor: Competitor) => {
    setEditing(competitor);
    setFormData({
      name: competitor.name,
      description: competitor.description,
      seed: competitor.seed?.toString() || '',
      imageUrl: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (competitor: Competitor) => {
    if (!confirm(`Delete "${competitor.name}"? This may fail if the competitor is part of active matchups.`)) return;
    
    try {
      const res = await fetch(`/api/admin/competitors?id=${competitor.id}`, { method: 'DELETE' });
      if (res.ok) {
        showMessage('success', 'Competitor deleted');
        onRefresh();
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to delete competitor');
      }
    } catch {
      showMessage('error', 'Failed to delete competitor');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing 
        ? { id: editing.id, ...formData, seed: formData.seed ? parseInt(formData.seed) : null }
        : { campaignId: campaign.id, ...formData, seed: formData.seed ? parseInt(formData.seed) : null };
      
      const res = await fetch('/api/admin/competitors', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showMessage('success', `Competitor ${editing ? 'updated' : 'created'}`);
        resetForm();
        onRefresh();
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save');
      }
    } catch {
      showMessage('error', 'Failed to save competitor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Competitors for: {campaign.name}</h2>
          <p className="text-gray-400 text-sm">Manage competitors (product features) in this campaign</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium"
          >
            + Add Competitor
          </button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={resetForm}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editing ? 'Edit Competitor' : 'Add Competitor'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  required
                  placeholder="Feature name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  rows={3}
                  required
                  placeholder="Describe this feature"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Seed Number</label>
                <input
                  type="number"
                  value={formData.seed}
                  onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                  min="1"
                  placeholder="1, 2, 3..."
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Competitors Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaign.competitors.map((competitor) => (
          <div
            key={competitor.id}
            className={`bg-gray-800 rounded-xl p-4 border ${
              competitor.isEliminated ? 'border-red-500/30 opacity-60' : 'border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {competitor.seed && (
                  <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold bg-[#00B2E3] text-white rounded-full">
                    #{competitor.seed}
                  </span>
                )}
                <h3 className="font-semibold text-white">{competitor.name}</h3>
              </div>
              {competitor.isEliminated && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  Eliminated
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-4 line-clamp-3">{competitor.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(competitor)}
                className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(competitor)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaign.competitors.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No competitors in this campaign. Click &quot;Add Competitor&quot; to create one.
        </div>
      )}
    </div>
  );
}

// Submissions Tab Component
function SubmissionsTab({
  submissions,
  onRefresh,
}: {
  submissions: any;
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCampaign, setFilterCampaign] = useState('all');

  if (!submissions) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF9E18] border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading submissions...</p>
      </div>
    );
  }

  const { votes, totalVotes } = submissions;

  // Filter votes
  const filteredVotes = votes.filter((vote: any) => {
    const matchesSearch =
      searchTerm === '' ||
      vote.voterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vote.voterEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = filterSource === 'all' || vote.source === filterSource;
    const matchesCampaign = filterCampaign === 'all' || vote.campaign.slug === filterCampaign;
    
    return matchesSearch && matchesSource && matchesCampaign;
  });

  // Get unique sources and campaigns for filter
  const uniqueSources = [...new Set(votes.map((v: any) => v.source))] as string[];
  uniqueSources.sort();
  const uniqueCampaigns = Array.from(
    new Map(votes.map((v: any) => [v.campaign.slug, { slug: v.campaign.slug, name: v.campaign.name }])).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">All Vote Submissions</h2>
          <p className="text-gray-400 text-sm">View decrypted voter information and choices</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Total Votes</div>
          <div className="text-2xl font-bold text-white mt-1">{totalVotes}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Unique Voters</div>
          <div className="text-2xl font-bold text-white mt-1">
            {new Set(votes.map((v: any) => v.voterEmail)).size}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm">Vote Sources</div>
          <div className="text-2xl font-bold text-white mt-1">{uniqueSources.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Search by Name or Email</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9E18]"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Filter by Campaign</label>
            <select
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9E18]"
            >
              <option value="all">All Campaigns</option>
              {uniqueCampaigns.map((c: any) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Filter by Source</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9E18]"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-400">
          Showing {filteredVotes.length} of {totalVotes} votes
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-700 bg-gray-900/50">
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Voter</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Email</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Source</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Campaign</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Round</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Matchup</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Selected</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-sm">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredVotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No votes found matching your filters
                  </td>
                </tr>
              ) : (
                filteredVotes.map((vote: any) => (
                  <tr key={vote.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-white text-sm">{vote.voterName}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{vote.voterEmail}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-700 px-2 py-1 rounded text-[#00B2E3]">
                        {vote.source}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{vote.campaign.name}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{vote.round.name}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">
                      {vote.matchup.competitor1} vs {vote.matchup.competitor2}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#FF9E18] font-medium text-sm">
                        {vote.selectedCompetitor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(vote.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            // Create CSV content
            const headers = ['Voter Name', 'Email', 'Source', 'Campaign', 'Round', 'Matchup', 'Selected', 'Date'];
            const rows = filteredVotes.map((vote: any) => [
              vote.voterName,
              vote.voterEmail,
              vote.source,
              vote.campaign.name,
              vote.round.name,
              `${vote.matchup.competitor1} vs ${vote.matchup.competitor2}`,
              vote.selectedCompetitor,
              new Date(vote.createdAt).toISOString(),
            ]);
            
            const csvContent = [
              headers.join(','),
              ...rows.map((row: string[]) => row.map(cell => `"${cell}"`).join(',')),
            ].join('\n');
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `submissions-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-[#FF9E18] hover:bg-[#e88f15] text-white rounded-lg text-sm font-medium"
        >
          📥 Export to CSV
        </button>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
