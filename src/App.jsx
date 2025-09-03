import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Target, Users, TrendingUp, Calendar, X, Trash2, Download, Upload, Wifi, WifiOff } from 'lucide-react';

// Supabase client setup met jouw credentials
const SUPABASE_URL = 'https://secchxbxcoictfvihbgi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlY2NoeGJ4Y29pY3RmdmloYmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5Mjg0OTAsImV4cCI6MjA3MjUwNDQ5MH0.FwGx7rUCbiVBV8AECsPm3bAsm0yPinI0Q_TAuM7_sSU';

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async getAllMatches() {
    try {
      const response = await fetch(`${this.url}/rest/v1/matches?order=created_at.desc`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }
  }

  async insertMatch(matchData) {
    try {
      const response = await fetch(`${this.url}/rest/v1/matches`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          id: matchData.id,
          date: matchData.date,
          my_team_player1: matchData.myTeam.player1,
          my_team_player2: matchData.myTeam.player2,
          opponent_team_player1: matchData.opponentTeam.player1,
          opponent_team_player2: matchData.opponentTeam.player2,
          sets: matchData.sets,
          result: matchData.result
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error inserting match:', error);
      throw error;
    }
  }

  async deleteMatch(matchId) {
    try {
      const response = await fetch(`${this.url}/rest/v1/matches?id=eq.${matchId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
  }

  async clearAllMatches() {
    try {
      const response = await fetch(`${this.url}/rest/v1/matches`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error clearing matches:', error);
      throw error;
    }
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PadelTracker = () => {
  const [matches, setMatches] = useState([]);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMatch, setCurrentMatch] = useState({
    date: new Date().toISOString().split('T')[0],
    myTeam: { player1: '', player2: '' },
    opponentTeam: { player1: '', player2: '' },
    sets: [{ myScore: '', opponentScore: '' }],
    result: null
  });

  // Load matches from Supabase
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await supabase.getAllMatches();
      
      // Transform database format back to app format
      const transformedMatches = data.map(match => ({
        id: match.id,
        date: match.date,
        myTeam: {
          player1: match.my_team_player1,
          player2: match.my_team_player2
        },
        opponentTeam: {
          player1: match.opponent_team_player1,
          player2: match.opponent_team_player2
        },
        sets: match.sets,
        result: match.result,
        created_at: match.created_at
      }));
      
      setMatches(transformedMatches);
      setIsOnline(true);
    } catch (error) {
      console.error('Error loading matches:', error);
      setIsOnline(false);
      // Fallback to localStorage
      const savedMatches = JSON.parse(localStorage.getItem('padelMatches') || '[]');
      setMatches(savedMatches);
    } finally {
      setLoading(false);
    }
  };

  const addSet = () => {
    setCurrentMatch(prev => ({
      ...prev,
      sets: [...prev.sets, { myScore: '', opponentScore: '' }]
    }));
  };

  const removeSet = (index) => {
    if (currentMatch.sets.length > 1) {
      setCurrentMatch(prev => ({
        ...prev,
        sets: prev.sets.filter((_, i) => i !== index)
      }));
    }
  };

  const updateSet = (index, field, value) => {
    setCurrentMatch(prev => ({
      ...prev,
      sets: prev.sets.map((set, i) => 
        i === index ? { ...set, [field]: value } : set
      )
    }));
  };

  const calculateResult = (sets) => {
    let mySets = 0;
    let opponentSets = 0;
    
    sets.forEach(set => {
      if (set.myScore && set.opponentScore) {
        if (parseInt(set.myScore) > parseInt(set.opponentScore)) {
          mySets++;
        } else if (parseInt(set.opponentScore) > parseInt(set.myScore)) {
          opponentSets++;
        }
      }
    });
    
    if (mySets > opponentSets) return 'win';
    if (opponentSets > mySets) return 'loss';
    return 'draw';
  };

  const saveMatch = async () => {
    if (!currentMatch.myTeam.player1 || !currentMatch.myTeam.player2 || 
        !currentMatch.opponentTeam.player1 || !currentMatch.opponentTeam.player2) {
      alert('Vul alle spelersnamen in!');
      return;
    }

    const validSets = currentMatch.sets.filter(set => set.myScore && set.opponentScore);
    if (validSets.length === 0) {
      alert('Vul minimaal één set in!');
      return;
    }

    const result = calculateResult(validSets);
    const newMatch = {
      ...currentMatch,
      sets: validSets,
      result,
      id: Date.now(),
      created_at: new Date().toISOString()
    };

    try {
      setSaving(true);
      await supabase.insertMatch(newMatch);
      
      // Reload matches from database
      await loadMatches();
      
      setCurrentMatch({
        date: new Date().toISOString().split('T')[0],
        myTeam: { player1: '', player2: '' },
        opponentTeam: { player1: '', player2: '' },
        sets: [{ myScore: '', opponentScore: '' }],
        result: null
      });
      setShowAddMatch(false);
      
    } catch (error) {
      console.error('Error saving match:', error);
      setIsOnline(false);
      // Fallback to localStorage
      const updatedMatches = [newMatch, ...matches];
      setMatches(updatedMatches);
      localStorage.setItem('padelMatches', JSON.stringify(updatedMatches));
      
      setCurrentMatch({
        date: new Date().toISOString().split('T')[0],
        myTeam: { player1: '', player2: '' },
        opponentTeam: { player1: '', player2: '' },
        sets: [{ myScore: '', opponentScore: '' }],
        result: null
      });
      setShowAddMatch(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async (matchId) => {
    if (confirm('Weet je zeker dat je deze match wilt verwijderen?')) {
      try {
        setSaving(true);
        await supabase.deleteMatch(matchId);
        await loadMatches();
      } catch (error) {
        console.error('Error deleting match:', error);
        setIsOnline(false);
        // Fallback to localStorage
        const updatedMatches = matches.filter(match => match.id !== matchId);
        setMatches(updatedMatches);
        localStorage.setItem('padelMatches', JSON.stringify(updatedMatches));
      } finally {
        setSaving(false);
      }
    }
  };

  const clearAllData = async () => {
    if (confirm('Weet je zeker dat je ALLE matches wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      try {
        setSaving(true);
        await supabase.clearAllMatches();
        setMatches([]);
      } catch (error) {
        console.error('Error clearing all data:', error);
        setIsOnline(false);
        setMatches([]);
        localStorage.removeItem('padelMatches');
      } finally {
        setSaving(false);
      }
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(matches, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `padel-matches-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedMatches = JSON.parse(e.target.result);
          if (Array.isArray(importedMatches)) {
            setSaving(true);
            
            // Clear existing data first
            await supabase.clearAllMatches();
            
            // Insert each match
            for (const match of importedMatches) {
              await supabase.insertMatch(match);
            }
            
            // Reload from database
            await loadMatches();
            alert(`${importedMatches.length} matches succesvol geïmporteerd!`);
          } else {
            alert('Ongeldig bestandsformaat');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Fout bij het importeren van het bestand');
        } finally {
          setSaving(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // Statistics calculations
  const getStats = () => {
    const totalMatches = matches.length;
    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;
    const draws = matches.filter(m => m.result === 'draw').length;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    // Opponent statistics
    const opponentStats = {};
    matches.forEach(match => {
      const opponent = `${match.opponentTeam.player1} & ${match.opponentTeam.player2}`;
      if (!opponentStats[opponent]) {
        opponentStats[opponent] = { wins: 0, losses: 0, draws: 0, total: 0 };
      }
      opponentStats[opponent][match.result]++;
      opponentStats[opponent].total++;
    });

    // Set statistics
    let totalSetsPlayed = 0;
    let totalSetsWon = 0;
    matches.forEach(match => {
      match.sets.forEach(set => {
        totalSetsPlayed++;
        if (parseInt(set.myScore) > parseInt(set.opponentScore)) {
          totalSetsWon++;
        }
      });
    });

    const setWinRate = totalSetsPlayed > 0 ? ((totalSetsWon / totalSetsPlayed) * 100).toFixed(1) : 0;

    return {
      totalMatches,
      wins,
      losses,
      draws,
      winRate,
      opponentStats,
      totalSetsPlayed,
      totalSetsWon,
      setWinRate
    };
  };

  const stats = getStats();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Laden van matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-3 rounded-full">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Padel Tracker</h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600">Houd je padel resultaten bij</p>
                  <div className="flex items-center gap-1">
                    {isOnline ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {saving ? 'Opslaan...' : isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddMatch(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Nieuwe Match
              </button>
              
              <button
                onClick={exportData}
                disabled={matches.length === 0}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="h-5 w-5" />
                Export
              </button>
              
              <label className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                <Upload className="h-5 w-5" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
              
              {matches.length > 0 && (
                <button
                  onClick={clearAllData}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                  Wis Alles
                </button>
              )}
            </div>
          </div>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Totaal Matches</p>
                  <p className="text-2xl font-bold">{stats.totalMatches}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Gewonnen</p>
                  <p className="text-2xl font-bold">{stats.wins}</p>
                </div>
                <Trophy className="h-8 w-8 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Verloren</p>
                  <p className="text-2xl font-bold">{stats.losses}</p>
                </div>
                <Target className="h-8 w-8 text-red-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Win Rate</p>
                  <p className="text-2xl font-bold">{stats.winRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Set Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">Set Statistieken</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sets gespeeld:</span>
                  <span className="font-semibold">{stats.totalSetsPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sets gewonnen:</span>
                  <span className="font-semibold text-green-600">{stats.totalSetsWon}</span>
                </div>
                <div className="flex justify-between">
                  <span>Set win rate:</span>
                  <span className="font-semibold">{stats.setWinRate}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">Recente Form</h3>
              <div className="flex gap-1">
                {matches.slice(0, 10).map((match, index) => (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      match.result === 'win' ? 'bg-green-500' : 
                      match.result === 'loss' ? 'bg-red-500' : 'bg-gray-500'
                    }`}
                  >
                    {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Opponent Statistics */}
          {Object.keys(stats.opponentStats).length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Statistieken per Tegenstander</h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-gray-50 rounded-xl overflow-hidden">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="text-left p-3">Tegenstanders</th>
                      <th className="text-center p-3">Gespeeld</th>
                      <th className="text-center p-3">Gewonnen</th>
                      <th className="text-center p-3">Verloren</th>
                      <th className="text-center p-3">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.opponentStats).map(([opponent, oppStats]) => (
                      <tr key={opponent} className="border-t border-gray-200">
                        <td className="p-3 font-medium">{opponent}</td>
                        <td className="text-center p-3">{oppStats.total}</td>
                        <td className="text-center p-3 text-green-600">{oppStats.wins}</td>
                        <td className="text-center p-3 text-red-600">{oppStats.losses}</td>
                        <td className="text-center p-3">
                          {oppStats.total > 0 ? ((oppStats.wins / oppStats.total) * 100).toFixed(0) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Match History */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Match History
          </h2>
          
          {matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Nog geen matches gespeeld</p>
              <p>Voeg je eerste match toe om te beginnen!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        match.result === 'win' ? 'bg-green-500' : 
                        match.result === 'loss' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="font-semibold">
                        {formatDate(match.date)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        match.result === 'win' ? 'bg-green-100 text-green-800' : 
                        match.result === 'loss' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {match.result === 'win' ? 'GEWONNEN' : 
                         match.result === 'loss' ? 'VERLOREN' : 'GELIJK'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Verwijder match"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Jouw team:</p>
                      <p className="font-medium">{match.myTeam.player1} & {match.myTeam.player2}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-1">Tegenstanders:</p>
                      <p className="font-medium">{match.opponentTeam.player1} & {match.opponentTeam.player2}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600 mb-1">Sets:</p>
                      <div className="flex gap-2">
                        {match.sets.map((set, index) => (
                          <span key={index} className="bg-gray-100 px-2 py-1 rounded">
                            {set.myScore}-{set.opponentScore}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Match Modal */}
        {showAddMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Nieuwe Match Toevoegen</h2>
                <button
                  onClick={() => setShowAddMatch(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-2">Datum</label>
                  <input
                    type="date"
                    value={currentMatch.date}
                    onChange={(e) => setCurrentMatch(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Teams */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Jouw Team</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Speler 1 naam"
                        value={currentMatch.myTeam.player1}
                        onChange={(e) => setCurrentMatch(prev => ({
                          ...prev,
                          myTeam: { ...prev.myTeam, player1: e.target.value }
                        }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Speler 2 naam"
                        value={currentMatch.myTeam.player2}
                        onChange={(e) => setCurrentMatch(prev => ({
                          ...prev,
                          myTeam: { ...prev.myTeam, player2: e.target.value }
                        }))}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Tegenstanders</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Tegenstander 1 naam"
                        value={currentMatch.opponentTeam.player1}
                        onChange={(e) => setCurrentMatch(prev => ({
                          ...prev,
                          opponentTeam: { ...prev.opponentTeam, player1: e.target.value }
                        }))}
